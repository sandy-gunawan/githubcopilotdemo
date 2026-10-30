from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from certificate_monitor.data import CertificateEntry
from certificate_monitor.status import (
    CertificateStatus,
    assess_certificate,
    sort_assessments,
)


NOW = datetime(2030, 1, 1, 12, 0, tzinfo=timezone.utc)


def certificate(
    certificate_id: str,
    *,
    expires_in_seconds: int | None,
    name: str | None = None,
    error_reason: str | None = None,
    expires_at: datetime | None = None,
) -> CertificateEntry:
    if expires_at is None and expires_in_seconds is not None:
        expires_at = NOW + timedelta(seconds=expires_in_seconds)
    return CertificateEntry(
        id=certificate_id,
        name=name or certificate_id,
        hostname=f"{certificate_id}.example.test",
        port=443,
        environment="Production",
        issuer=None if error_reason else "Demo Internal CA",
        expires_at=expires_at,
        error_reason=error_reason,
    )


@pytest.mark.parametrize(
    ("remaining_seconds", "expected"),
    [
        (2592001, CertificateStatus.HEALTHY),
        (2592000, CertificateStatus.WARNING),
        (2591999, CertificateStatus.WARNING),
        (604801, CertificateStatus.WARNING),
        (604800, CertificateStatus.CRITICAL),
        (604799, CertificateStatus.CRITICAL),
        (1, CertificateStatus.CRITICAL),
        (0, CertificateStatus.EXPIRED),
        (-1, CertificateStatus.EXPIRED),
    ],
)
def test_classifies_all_nine_exact_second_boundaries(
    remaining_seconds: int,
    expected: CertificateStatus,
) -> None:
    assessment = assess_certificate(
        certificate("boundary", expires_in_seconds=remaining_seconds),
        NOW,
    )

    assert assessment.status is expected


def test_timezone_offsets_for_the_same_instant_produce_the_same_status() -> None:
    expires_at_utc = NOW + timedelta(days=7, seconds=1)
    expires_at_local = expires_at_utc.astimezone(timezone(timedelta(hours=7)))
    now_local = NOW.astimezone(timezone(timedelta(hours=-4)))
    entry_utc = certificate(
        "utc",
        expires_in_seconds=None,
        expires_at=expires_at_utc,
    )
    entry_local = certificate(
        "local",
        expires_in_seconds=None,
        expires_at=expires_at_local,
    )

    utc_assessment = assess_certificate(entry_utc, NOW)
    local_assessment = assess_certificate(entry_local, now_local)

    assert utc_assessment.status is CertificateStatus.WARNING
    assert local_assessment.status is utc_assessment.status
    assert local_assessment.remaining == utc_assessment.remaining


def test_rounded_day_display_never_changes_classification() -> None:
    one_second = assess_certificate(
        certificate("one-second", expires_in_seconds=1),
        NOW,
    )
    seven_days_plus_one = assess_certificate(
        certificate("seven-days-plus-one", expires_in_seconds=604801),
        NOW,
    )
    thirty_days_plus_one = assess_certificate(
        certificate("thirty-days-plus-one", expires_in_seconds=2592001),
        NOW,
    )

    assert one_second.status is CertificateStatus.CRITICAL
    assert one_second.remaining_days == 1
    assert one_second.remaining_label == "1 hari"
    assert seven_days_plus_one.status is CertificateStatus.WARNING
    assert seven_days_plus_one.remaining_days == 8
    assert thirty_days_plus_one.status is CertificateStatus.HEALTHY
    assert thirty_days_plus_one.remaining_days == 31


def test_expired_and_error_entries_have_honest_remaining_labels() -> None:
    expired = assess_certificate(certificate("expired", expires_in_seconds=-1), NOW)
    error = assess_certificate(
        certificate(
            "error",
            expires_in_seconds=None,
            error_reason="Metadata simulasi tidak tersedia.",
        ),
        NOW,
    )

    assert expired.status_label == "Kedaluwarsa"
    assert expired.remaining_label == "Kedaluwarsa"
    assert error.status is CertificateStatus.ERROR
    assert error.remaining is None
    assert error.remaining_days is None
    assert error.remaining_label == "-"
    assert error.status_label == "Gagal diperiksa"


def test_sorting_uses_status_expiry_then_name_and_id_tiebreakers() -> None:
    candidates = [
        assess_certificate(
            certificate("healthy", expires_in_seconds=2592001, name="Healthy"),
            NOW,
        ),
        assess_certificate(
            certificate("warning-later", expires_in_seconds=1209600, name="Later"),
            NOW,
        ),
        assess_certificate(
            certificate("warning-z", expires_in_seconds=604801, name="Alpha"),
            NOW,
        ),
        assess_certificate(
            certificate("warning-a", expires_in_seconds=604801, name="Alpha"),
            NOW,
        ),
        assess_certificate(
            certificate("warning-b", expires_in_seconds=604801, name="Beta"),
            NOW,
        ),
        assess_certificate(
            certificate("critical-later", expires_in_seconds=604800, name="Later"),
            NOW,
        ),
        assess_certificate(
            certificate("critical-first", expires_in_seconds=1, name="First"),
            NOW,
        ),
        assess_certificate(
            certificate("expired", expires_in_seconds=-1, name="Expired"),
            NOW,
        ),
        assess_certificate(
            certificate(
                "error-z",
                expires_in_seconds=None,
                name="Zulu",
                error_reason="Metadata tidak tersedia.",
            ),
            NOW,
        ),
        assess_certificate(
            certificate(
                "error-b",
                expires_in_seconds=None,
                name="Alpha",
                error_reason="Metadata tidak tersedia.",
            ),
            NOW,
        ),
        assess_certificate(
            certificate(
                "error-same-z",
                expires_in_seconds=None,
                name="Same",
                error_reason="Metadata tidak tersedia.",
            ),
            NOW,
        ),
        assess_certificate(
            certificate(
                "error-same-a",
                expires_in_seconds=None,
                name="Same",
                error_reason="Metadata tidak tersedia.",
            ),
            NOW,
        ),
    ]

    ordered = sort_assessments(candidates)

    assert [assessment.entry.id for assessment in ordered] == [
        "expired",
        "critical-first",
        "critical-later",
        "warning-a",
        "warning-z",
        "warning-b",
        "warning-later",
        "error-b",
        "error-same-a",
        "error-same-z",
        "error-z",
        "healthy",
    ]


def test_error_status_has_priority_over_an_expiry_value() -> None:
    entry = certificate(
        "error-with-stale-date",
        expires_in_seconds=0,
        error_reason="Metadata simulasi tidak tersedia.",
    )

    assessment = assess_certificate(entry, NOW)

    assert assessment.status is CertificateStatus.ERROR
    assert assessment.remaining_label == "-"


@pytest.mark.parametrize(
    ("expires_in_seconds", "error_reason", "status", "label"),
    [
        (2592001, None, CertificateStatus.HEALTHY, "Normal"),
        (2592000, None, CertificateStatus.WARNING, "Segera kedaluwarsa"),
        (604800, None, CertificateStatus.CRITICAL, "Kritis"),
        (0, None, CertificateStatus.EXPIRED, "Kedaluwarsa"),
        (None, "metadata tidak tersedia", CertificateStatus.ERROR, "Gagal diperiksa"),
    ],
)
def test_all_technical_statuses_have_indonesian_labels(
    expires_in_seconds: int | None,
    error_reason: str | None,
    status: CertificateStatus,
    label: str,
) -> None:
    assessment = assess_certificate(
        certificate(
            status.value.lower(),
            expires_in_seconds=expires_in_seconds,
            error_reason=error_reason,
        ),
        NOW,
    )

    assert assessment.status is status
    assert assessment.status_label == label
