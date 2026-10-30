from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import logging
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)
DEFAULT_FIXTURE_PATH = Path(__file__).parent / "data" / "certificates.json"
REQUIRED_FIELDS = frozenset(
    {
        "id",
        "name",
        "hostname",
        "port",
        "environment",
        "issuer",
        "expires_in_seconds",
        "error_reason",
    }
)
VALID_ENVIRONMENTS = frozenset({"Production", "Staging"})


class FixtureError(ValueError):
    """Raised when the demo inventory cannot be loaded without ambiguity."""


@dataclass(frozen=True, slots=True)
class CertificateEntry:
    id: str
    name: str
    hostname: str
    port: int
    environment: str
    issuer: str | None
    expires_at: datetime | None
    error_reason: str | None


def normalize_utc(value: datetime, *, field_name: str = "timestamp") -> datetime:
    """Require an aware datetime and return the same instant in UTC."""

    if not isinstance(value, datetime):
        raise FixtureError(f"{field_name} must be a timezone-aware datetime.")
    if value.tzinfo is None or value.utcoffset() is None:
        raise FixtureError(f"{field_name} must be a timezone-aware datetime.")
    return value.astimezone(timezone.utc)


def load_certificates(
    fixture_path: str | Path | None = None,
    *,
    startup_at: datetime,
) -> tuple[CertificateEntry, ...]:
    """Load and validate a JSON fixture, materializing expiry once at startup."""

    path = Path(fixture_path) if fixture_path is not None else DEFAULT_FIXTURE_PATH
    try:
        startup_utc = normalize_utc(startup_at, field_name="startup_at")
        records = _read_fixture(path)
        entries = _build_entries(records, startup_utc, path)
    except FixtureError as error:
        logger.error("Certificate fixture could not be loaded: %s", error)
        raise

    logger.info("Loaded %d simulated certificate entries from %s", len(entries), path)
    return entries


def _read_fixture(path: Path) -> list[Any]:
    try:
        contents = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise FixtureError(f"Certificate fixture not found: {path}") from error
    except IsADirectoryError as error:
        raise FixtureError(f"Certificate fixture path is not a file: {path}") from error
    except UnicodeDecodeError as error:
        raise FixtureError(f"Certificate fixture is not valid UTF-8: {path}") from error
    except OSError as error:
        raise FixtureError(
            f"Unable to read certificate fixture {path}: {error.strerror or error}"
        ) from error

    if not contents.strip():
        raise FixtureError(f"Certificate fixture is empty: {path}")

    try:
        payload = json.loads(contents)
    except json.JSONDecodeError as error:
        raise FixtureError(
            f"Invalid JSON in certificate fixture {path} at line {error.lineno}, "
            f"column {error.colno}: {error.msg}"
        ) from error

    if not isinstance(payload, list):
        raise FixtureError(f"Certificate fixture root must be a JSON array: {path}")
    if not payload:
        raise FixtureError(
            f"Certificate fixture must contain at least one entry: {path}"
        )
    return payload


def _build_entries(
    records: list[Any],
    startup_at: datetime,
    path: Path,
) -> tuple[CertificateEntry, ...]:
    entries: list[CertificateEntry] = []
    seen_ids: set[str] = set()

    for index, record in enumerate(records):
        location = f"{path}, entry {index}"
        if not isinstance(record, dict):
            raise FixtureError(f"Fixture entry at index {index} must be a JSON object: {path}")

        missing = sorted(REQUIRED_FIELDS - record.keys())
        extra = sorted(record.keys() - REQUIRED_FIELDS)
        if missing or extra:
            details: list[str] = []
            if missing:
                details.append(f"missing fields {', '.join(missing)}")
            if extra:
                details.append(f"extra fields {', '.join(extra)}")
            raise FixtureError(f"Fixture schema error at {location}: {'; '.join(details)}.")

        entry_id = _required_text(record["id"], "id", location)
        if entry_id in seen_ids:
            raise FixtureError(f"Duplicate certificate id {entry_id!r} at {location}.")
        seen_ids.add(entry_id)

        name = _required_text(record["name"], "name", location)
        hostname = _required_text(record["hostname"], "hostname", location)
        port = _validated_port(record["port"], location)
        environment = _required_text(record["environment"], "environment", location)
        if environment not in VALID_ENVIRONMENTS:
            allowed = ", ".join(sorted(VALID_ENVIRONMENTS))
            raise FixtureError(
                f"Fixture field environment at {location} must be one of: {allowed}."
            )

        error_reason = _validated_error_reason(record["error_reason"], location)
        issuer = _validated_issuer(record["issuer"], location)
        expires_in_seconds = record["expires_in_seconds"]

        if error_reason is not None:
            if expires_in_seconds is not None:
                raise FixtureError(
                    f"Error entry {entry_id!r} at {location} must have a null offset."
                )
            expires_at = None
        else:
            if issuer is None:
                raise FixtureError(
                    f"Normal entry {entry_id!r} at {location} requires an issuer."
                )
            if isinstance(expires_in_seconds, bool) or not isinstance(
                expires_in_seconds, int
            ):
                raise FixtureError(
                    f"Fixture field expires_in_seconds at {location} must be an "
                    "integer (not a boolean)."
                )
            try:
                expires_at = startup_at + timedelta(seconds=expires_in_seconds)
            except OverflowError as error:
                raise FixtureError(
                    f"Fixture expires_in_seconds for {entry_id!r} at {location} "
                    "is outside the supported datetime range."
                ) from error

        entries.append(
            CertificateEntry(
                id=entry_id,
                name=name,
                hostname=hostname,
                port=port,
                environment=environment,
                issuer=issuer,
                expires_at=expires_at,
                error_reason=error_reason,
            )
        )

    return tuple(entries)


def _required_text(value: Any, field_name: str, location: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise FixtureError(
            f"Fixture field {field_name} at {location} must be a non-empty string."
        )
    return value


def _validated_port(value: Any, location: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise FixtureError(
            f"Fixture field port at {location} must be an integer (not a boolean)."
        )
    if not 1 <= value <= 65535:
        raise FixtureError(
            f"Fixture field port at {location} must be between 1 and 65535."
        )
    return value


def _validated_error_reason(value: Any, location: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise FixtureError(
            f"Fixture field error_reason at {location} must be null or a "
            "non-empty string."
        )
    return value


def _validated_issuer(value: Any, location: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise FixtureError(
            f"Fixture field issuer at {location} must be null or a non-empty string."
        )
    return value
