from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Iterable

from .data import CertificateEntry, normalize_utc


SECONDS_PER_DAY = 86_400
CRITICAL_THRESHOLD_SECONDS = 7 * SECONDS_PER_DAY
WARNING_THRESHOLD_SECONDS = 30 * SECONDS_PER_DAY
CRITICAL_THRESHOLD = timedelta(seconds=CRITICAL_THRESHOLD_SECONDS)
WARNING_THRESHOLD = timedelta(seconds=WARNING_THRESHOLD_SECONDS)


class CertificateStatus(str, Enum):
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EXPIRED = "EXPIRED"
    ERROR = "ERROR"


STATUS_LABELS: dict[CertificateStatus, str] = {
    CertificateStatus.HEALTHY: "Normal",
    CertificateStatus.WARNING: "Segera kedaluwarsa",
    CertificateStatus.CRITICAL: "Kritis",
    CertificateStatus.EXPIRED: "Kedaluwarsa",
    CertificateStatus.ERROR: "Gagal diperiksa",
}

STATUS_PRIORITY: dict[CertificateStatus, int] = {
    CertificateStatus.EXPIRED: 0,
    CertificateStatus.CRITICAL: 1,
    CertificateStatus.WARNING: 2,
    CertificateStatus.ERROR: 3,
    CertificateStatus.HEALTHY: 4,
}


@dataclass(frozen=True, slots=True)
class CertificateAssessment:
    entry: CertificateEntry
    status: CertificateStatus
    remaining: timedelta | None

    @property
    def status_label(self) -> str:
        return STATUS_LABELS[self.status]

    @property
    def remaining_days(self) -> int | None:
        if self.status in {CertificateStatus.ERROR, CertificateStatus.EXPIRED}:
            return None
        if self.remaining is None or self.remaining <= timedelta(0):
            return None
        return self.remaining.days + int(
            self.remaining.seconds > 0 or self.remaining.microseconds > 0
        )

    @property
    def remaining_label(self) -> str:
        if self.status is CertificateStatus.ERROR:
            return "-"
        if self.status is CertificateStatus.EXPIRED:
            return "Kedaluwarsa"
        days = self.remaining_days
        if days is None:
            raise ValueError("A non-error assessment must have a positive expiry interval.")
        return f"{days} hari"


def assess_certificate(
    entry: CertificateEntry,
    now: datetime,
) -> CertificateAssessment:
    """Assess one entry using the exact remaining interval, never rounded days."""

    now_utc = normalize_utc(now, field_name="now")
    if entry.error_reason is not None:
        return CertificateAssessment(
            entry=entry,
            status=CertificateStatus.ERROR,
            remaining=None,
        )
    if entry.expires_at is None:
        raise ValueError(
            f"Certificate entry {entry.id!r} has no expiry and no error reason."
        )

    expires_at = normalize_utc(entry.expires_at, field_name="expires_at")
    remaining = expires_at - now_utc
    if remaining <= timedelta(0):
        status = CertificateStatus.EXPIRED
    elif remaining <= CRITICAL_THRESHOLD:
        status = CertificateStatus.CRITICAL
    elif remaining <= WARNING_THRESHOLD:
        status = CertificateStatus.WARNING
    else:
        status = CertificateStatus.HEALTHY

    return CertificateAssessment(entry=entry, status=status, remaining=remaining)


def sort_assessments(
    assessments: Iterable[CertificateAssessment],
) -> tuple[CertificateAssessment, ...]:
    """Sort by severity, expiry, then stable name and id tie-breakers."""

    latest_utc = datetime.max.replace(tzinfo=timezone.utc)

    def sort_key(
        assessment: CertificateAssessment,
    ) -> tuple[int, datetime, str, str]:
        if assessment.status is CertificateStatus.ERROR:
            expiry_order = latest_utc
        else:
            expires_at = assessment.entry.expires_at
            if expires_at is None:
                raise ValueError(
                    f"Certificate entry {assessment.entry.id!r} has no expiry."
                )
            expiry_order = normalize_utc(expires_at, field_name="expires_at")
        return (
            STATUS_PRIORITY[assessment.status],
            expiry_order,
            assessment.entry.name,
            assessment.entry.id,
        )

    return tuple(sorted(assessments, key=sort_key))
