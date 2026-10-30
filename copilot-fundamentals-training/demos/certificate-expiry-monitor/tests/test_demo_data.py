from __future__ import annotations

from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from typing import Callable

import pytest

from certificate_monitor.data import FixtureError, load_certificates


STARTUP = datetime(2030, 1, 1, 12, 0, tzinfo=timezone.utc)


def test_default_fixture_contains_eight_immutable_demo_entries() -> None:
    entries = load_certificates(startup_at=STARTUP)

    assert isinstance(entries, tuple)
    assert len(entries) == 8
    by_id = {entry.id: entry for entry in entries}
    assert set(by_id) == {
        "gateway",
        "monitoring",
        "portal",
        "registry",
        "backup",
        "vpn",
        "legacy",
        "unknown",
    }
    assert by_id["gateway"].expires_at == STARTUP + timedelta(days=60)
    assert by_id["monitoring"].expires_at == STARTUP + timedelta(days=31)
    assert by_id["portal"].expires_at == STARTUP + timedelta(days=30)
    assert by_id["registry"].expires_at == STARTUP + timedelta(days=14)
    assert by_id["backup"].expires_at == STARTUP + timedelta(days=7)
    assert by_id["vpn"].expires_at == STARTUP + timedelta(days=1)
    assert by_id["legacy"].expires_at == STARTUP - timedelta(days=1)
    assert by_id["unknown"].expires_at is None
    assert by_id["unknown"].error_reason
    assert all(entry.expires_at is None or entry.expires_at.utcoffset() == timedelta(0) for entry in entries)

    with pytest.raises(FrozenInstanceError):
        by_id["gateway"].name = "changed"  # type: ignore[misc]


def test_fixture_uses_domain_test_and_simulated_metadata_only() -> None:
    entries = load_certificates(startup_at=STARTUP)

    assert all(entry.hostname.endswith(".test") for entry in entries)
    assert all(entry.issuer == "Demo Internal CA" for entry in entries if entry.id != "unknown")
    assert all(entry.port in (443, 8443) for entry in entries)


def test_non_utc_aware_startup_is_normalized_to_utc(
    fixture_builder: Callable[..., Path],
) -> None:
    local_startup = datetime(
        2030, 1, 1, 19, 0, tzinfo=timezone(timedelta(hours=7))
    )

    entries = load_certificates(fixture_builder(), startup_at=local_startup)
    gateway = next(entry for entry in entries if entry.id == "gateway")

    assert gateway.expires_at == datetime(2030, 3, 2, 12, 0, tzinfo=timezone.utc)
    assert gateway.expires_at.utcoffset() == timedelta(0)


def test_missing_fixture_fails_with_path_diagnostic(tmp_path: Path) -> None:
    missing = tmp_path / "does-not-exist.json"

    with pytest.raises(FixtureError, match="not found") as error:
        load_certificates(missing, startup_at=STARTUP)

    assert str(missing) in str(error.value)


@pytest.mark.parametrize("contents", ["", "   "])
def test_empty_file_fails_explicitly(
    tmp_path: Path,
    contents: str,
) -> None:
    empty = tmp_path / "empty.json"
    empty.write_text(contents, encoding="utf-8")

    with pytest.raises(FixtureError, match="empty"):
        load_certificates(empty, startup_at=STARTUP)


def test_empty_array_fails_explicitly(fixture_builder: Callable[..., Path]) -> None:
    path = fixture_builder(records=[])

    with pytest.raises(FixtureError, match="at least one"):
        load_certificates(path, startup_at=STARTUP)


def test_corrupt_json_fails_with_parser_diagnostic(tmp_path: Path) -> None:
    corrupt = tmp_path / "corrupt.json"
    corrupt.write_text('[{"id":', encoding="utf-8")

    with pytest.raises(FixtureError, match="Invalid JSON"):
        load_certificates(corrupt, startup_at=STARTUP)


def test_duplicate_ids_are_rejected(fixture_builder: Callable[..., Path]) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[1]["id"] = rows[0]["id"]
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match="duplicate.*id"):
        load_certificates(path, startup_at=STARTUP)


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda row: row.pop("issuer"), "missing.*issuer"),
        (lambda row: row.update({"unexpected": "value"}), "extra.*unexpected"),
    ],
)
def test_exact_schema_is_required(
    fixture_builder: Callable[..., Path],
    mutation: Callable[[dict[str, object]], object],
    message: str,
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    mutation(rows[0])
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match=message):
        load_certificates(path, startup_at=STARTUP)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("port", True),
        ("expires_in_seconds", True),
    ],
)
def test_integer_fields_reject_booleans(
    fixture_builder: Callable[..., Path],
    field: str,
    value: bool,
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[0][field] = value
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match=field):
        load_certificates(path, startup_at=STARTUP)


@pytest.mark.parametrize("port", [0, 65536, -1])
def test_port_must_be_in_valid_tcp_range(
    fixture_builder: Callable[..., Path],
    port: int,
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[0]["port"] = port
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match="port"):
        load_certificates(path, startup_at=STARTUP)


def test_offset_overflow_is_reported_as_invalid_fixture(
    fixture_builder: Callable[..., Path],
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[0]["expires_in_seconds"] = 10**20
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match="outside.*datetime range"):
        load_certificates(path, startup_at=STARTUP)


def test_startup_time_must_be_timezone_aware(
    fixture_builder: Callable[..., Path],
) -> None:
    with pytest.raises(FixtureError, match="timezone-aware"):
        load_certificates(fixture_builder(), startup_at=datetime(2030, 1, 1))


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"environment": "Development"}, "environment"),
        ({"name": "  "}, "name"),
        ({"expires_in_seconds": None}, "expires_in_seconds"),
        ({"error_reason": "not null"}, "null offset"),
    ],
)
def test_invalid_normal_entry_metadata_is_rejected(
    fixture_builder: Callable[..., Path],
    changes: dict[str, object],
    message: str,
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[0].update(changes)
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match=message):
        load_certificates(path, startup_at=STARTUP)


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"expires_in_seconds": 0}, "null offset"),
        ({"error_reason": "   "}, "error_reason"),
        ({"issuer": ""}, "issuer"),
    ],
)
def test_invalid_error_entry_metadata_is_rejected(
    fixture_builder: Callable[..., Path],
    changes: dict[str, object],
    message: str,
) -> None:
    path = fixture_builder()
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[-1].update(changes)
    path.write_text(json.dumps(rows), encoding="utf-8")

    with pytest.raises(FixtureError, match=message):
        load_certificates(path, startup_at=STARTUP)
