from __future__ import annotations

from contextlib import contextmanager
from datetime import timedelta
import json
from pathlib import Path
import re
from typing import Iterator

from flask import template_rendered
import pytest

from certificate_monitor import create_app
from certificate_monitor.data import FixtureError
from certificate_monitor.status import CertificateAssessment, CertificateStatus


@contextmanager
def capture_template_context(app) -> Iterator[list[dict[str, object]]]:
    contexts: list[dict[str, object]] = []

    def record_template(sender, template, context) -> None:
        contexts.append(context)

    template_rendered.connect(record_template, app)
    try:
        yield contexts
    finally:
        template_rendered.disconnect(record_template, app)


def _dashboard_context(client, app, path: str = "/"):
    with capture_template_context(app) as contexts:
        response = client.get(path)
    assert len(contexts) == 1
    return response, contexts[0]


def test_default_dashboard_has_eight_entries_and_full_inventory_summary(
    app,
    client,
) -> None:
    response, context = _dashboard_context(client, app)

    assert response.status_code == 200
    assert context["active_filter"] == "all"
    assert context["summary"] == {
        "total": 8,
        "healthy": 2,
        "warning": 2,
        "critical": 2,
        "expired": 1,
        "error": 1,
    }
    assessments = context["assessments"]
    assert isinstance(assessments, tuple)
    assert len(assessments) == 8
    assert all(isinstance(item, CertificateAssessment) for item in assessments)
    assert [
        assessment.status
        for assessment in assessments
    ] == [
        CertificateStatus.EXPIRED,
        CertificateStatus.CRITICAL,
        CertificateStatus.CRITICAL,
        CertificateStatus.WARNING,
        CertificateStatus.WARNING,
        CertificateStatus.ERROR,
        CertificateStatus.HEALTHY,
        CertificateStatus.HEALTHY,
    ]


def test_filter_changes_visible_rows_but_not_full_summary(app, client) -> None:
    response, context = _dashboard_context(client, app, "/?status=critical")

    assert response.status_code == 200
    assert context["active_filter"] == "critical"
    assert context["result_count"] == 2
    assert all(
        assessment.status is CertificateStatus.CRITICAL
        for assessment in context["visible_assessments"]
    )
    assert context["summary"]["total"] == 8
    assert context["summary"]["healthy"] == 2
    assert context["summary"]["critical"] == 2


@pytest.mark.parametrize("status", ["all", "healthy", "warning", "critical", "expired", "error"])
def test_all_supported_filter_values_are_accepted(client, status: str) -> None:
    response = client.get(f"/?status={status}")

    assert response.status_code == 200


@pytest.mark.parametrize("status", ["unknown", "HEALTHY", ""])
def test_invalid_filter_is_case_sensitive_and_returns_http_400(client, status: str) -> None:
    response = client.get(f"/?status={status}")

    assert response.status_code == 400
    assert b"Filter status tidak valid" in response.data


def test_empty_filter_has_an_explicit_empty_state(
    fixture_builder,
    mutable_clock,
) -> None:
    records = json.loads(
        (
            Path(__file__).resolve().parents[1]
            / "certificate_monitor"
            / "data"
            / "certificates.json"
        ).read_text(encoding="utf-8")
    )
    for record in records:
        if record["error_reason"] is None:
            record["expires_in_seconds"] = 60 * 86400
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(records),
    )
    client = app.test_client()

    response, context = _dashboard_context(client, app, "/?status=warning")

    assert response.status_code == 200
    assert context["active_filter"] == "warning"
    assert context["result_count"] == 0
    assert context["visible_assessments"] == ()
    assert context["empty_message"]
    assert context["summary"]["total"] == 8
    assert context["summary"]["healthy"] == 7
    assert context["summary"]["error"] == 1


def test_manual_get_refresh_keeps_filter_and_absolute_expiry(
    fixed_now,
    fixture_builder,
    mutable_clock,
) -> None:
    fixture = json.loads(
        (
            Path(__file__).resolve().parents[1]
            / "certificate_monitor"
            / "data"
            / "certificates.json"
        ).read_text(encoding="utf-8")
    )
    next(record for record in fixture if record["id"] == "gateway")[
        "expires_in_seconds"
    ] = 8 * 86400
    clock = mutable_clock
    app = create_app(
        {"TESTING": True},
        clock=clock,
        fixture_path=fixture_builder(fixture),
    )
    client = app.test_client()
    clock.calls = 0
    stored_entries = app.extensions["certificate_monitor"]["entries"]
    absolute_expiry = next(
        entry.expires_at for entry in stored_entries if entry.id == "gateway"
    )

    first_response, first = _dashboard_context(
        client,
        app,
        "/?status=critical",
    )
    assert first_response.status_code == 200
    assert first["active_filter"] == "critical"
    assert "gateway" not in {
        item.entry.id for item in first["visible_assessments"]
    }
    assert clock.calls == 1

    clock.advance(timedelta(days=1))
    second_response, second = _dashboard_context(
        client,
        app,
        "/?status=critical",
    )

    assert second_response.status_code == 200
    assert second["active_filter"] == "critical"
    assert "gateway" in {
        item.entry.id for item in second["visible_assessments"]
    }
    assert second["snapshot_at"] == fixed_now + timedelta(days=1)
    assert clock.calls == 2
    assert next(
        entry.expires_at for entry in stored_entries if entry.id == "gateway"
    ) == absolute_expiry


def test_dashboard_reads_the_clock_once_per_request(mutable_clock) -> None:
    app = create_app({"TESTING": True}, clock=mutable_clock)
    client = app.test_client()
    mutable_clock.calls = 0

    response = client.get("/")

    assert response.status_code == 200
    assert mutable_clock.calls == 1


def test_healthz_is_exact_and_ready_with_valid_error_and_expired_entries(
    app,
    client,
    mutable_clock,
) -> None:
    calls_before = mutable_clock.calls

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "mode": "demo"}
    assert set(response.get_json()) == {"status", "mode"}
    assert mutable_clock.calls == calls_before


def test_invalid_fixture_prevents_factory_readiness(tmp_path, fixed_now) -> None:
    missing = tmp_path / "missing.json"

    with pytest.raises(FixtureError, match="not found"):
        create_app(
            {"TESTING": True},
            clock=lambda: fixed_now,
            fixture_path=missing,
        )


def test_dashboard_context_contains_valid_snapshot_utc_timestamp(app, client) -> None:
    response, context = _dashboard_context(client, app)

    assert response.status_code == 200
    snapshot_at = context["snapshot_at"]
    assert snapshot_at.tzinfo is not None
    assert snapshot_at.utcoffset() == timedelta(0)


def test_dashboard_renders_accessible_summary_rows_and_status_labels(client) -> None:
    response = client.get("/")
    page = response.data.decode("utf-8")
    rows = re.findall(
        r'<tr\b[^>]*data-certificate-id="([^"]+)"[^>]*data-status="([^"]+)"',
        page,
    )

    assert response.status_code == 200
    assert len(rows) == 8
    assert {status for _, status in rows} == {
        "HEALTHY",
        "WARNING",
        "CRITICAL",
        "EXPIRED",
        "ERROR",
    }
    for key, count in {
        "total": 8,
        "healthy": 2,
        "warning": 2,
        "critical": 2,
        "expired": 1,
        "error": 1,
    }.items():
        assert re.search(
            rf'data-testid="summary-{key}".*?class="summary-value">{count}<',
            page,
            flags=re.DOTALL,
        )
    for label in (
        "Normal",
        "Segera kedaluwarsa",
        "Kritis",
        "Kedaluwarsa",
        "Gagal diperiksa",
    ):
        assert label in page
    assert "Data simulasi/offline" in page
    assert "bukan pemeriksaan trust, chain" in re.sub(r"\s+", " ", page)


def test_dashboard_exposes_snapshot_and_expiry_times_as_machine_readable_values(
    client,
) -> None:
    response = client.get("/")
    page = response.data.decode("utf-8")

    assert response.status_code == 200
    assert re.search(
        r'<time[^>]*data-testid="snapshot-time"[^>]*datetime="2030-01-01T12:00:00\+00:00"',
        page,
    )
    for certificate_id in (
        "gateway",
        "monitoring",
        "portal",
        "registry",
        "backup",
        "vpn",
        "legacy",
    ):
        row = re.search(
            rf'<tr\b[^>]*data-certificate-id="{certificate_id}".*?</tr>',
            page,
            flags=re.DOTALL,
        )
        assert row
        assert re.search(r'<time[^>]*datetime="[^"]+"\s*>', row.group(0))

    error_row = re.search(
        r'<tr\b[^>]*data-certificate-id="unknown".*?</tr>',
        page,
        flags=re.DOTALL,
    )
    assert error_row
    assert "<time" not in error_row.group(0)
    assert "Metadata sertifikat tidak tersedia dalam simulasi offline." in error_row.group(0)
    assert ">-<" in error_row.group(0)


def test_filter_controls_are_labeled_and_refresh_preserves_active_filter(
    client,
) -> None:
    response = client.get("/?status=critical")
    page = response.data.decode("utf-8")

    assert response.status_code == 200
    assert re.search(
        r'<label[^>]*for="status-filter"[^>]*>Filter status</label>',
        page,
    )
    assert re.search(r'<select[^>]*id="status-filter"[^>]*name="status"', page)
    assert re.search(r'<button[^>]*>Terapkan</button>', page)
    assert re.search(
        r'<a[^>]*href="/\?status=critical"[^>]*>.*?Refresh.*?</a>',
        page,
        flags=re.DOTALL,
    )
    assert "table-responsive" in page


def test_empty_filter_state_is_visible_in_rendered_page(
    fixture_builder,
    mutable_clock,
) -> None:
    records = json.loads(
        (
            Path(__file__).resolve().parents[1]
            / "certificate_monitor"
            / "data"
            / "certificates.json"
        ).read_text(encoding="utf-8")
    )
    for record in records:
        if record["error_reason"] is None:
            record["expires_in_seconds"] = 60 * 86400
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(records),
    )

    response = app.test_client().get("/?status=warning")
    page = response.data.decode("utf-8")

    assert response.status_code == 200
    assert 'data-testid="empty-state"' in page
    assert "Tidak ada sertifikat untuk filter ini." in page
    assert "data-certificate-id=" not in page


def test_fixture_metadata_is_autoescaped_in_every_rendered_field(
    fixture_builder,
    mutable_clock,
) -> None:
    records = json.loads(
        (
            Path(__file__).resolve().parents[1]
            / "certificate_monitor"
            / "data"
            / "certificates.json"
        ).read_text(encoding="utf-8")
    )
    records[0]["name"] = '<script>alert("demo")</script>'
    records[0]["hostname"] = '<img src=x onerror="demo">'
    records[0]["issuer"] = "<b>Issuer Demo</b>"
    records[-1]["error_reason"] = '<svg onload="demo">'
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(records),
    )

    response = app.test_client().get("/")
    page = response.data.decode("utf-8")

    assert response.status_code == 200
    assert "&lt;script&gt;alert(&#34;demo&#34;)&lt;/script&gt;" in page
    assert "&lt;img src=x onerror=&#34;demo&#34;&gt;" in page
    assert "&lt;b&gt;Issuer Demo&lt;/b&gt;" in page
    assert "&lt;svg onload=&#34;demo&#34;&gt;" in page
    assert "<script>alert" not in page
    assert "<img src=x" not in page
    assert "<svg onload" not in page


def test_html_references_only_vendored_stylesheets(client) -> None:
    response = client.get("/")
    page = response.data.decode("utf-8")

    assert response.status_code == 200
    assert 'href="/static/bootstrap.min.css"' in page
    assert 'href="/static/app.css"' in page
    assert "https://" not in page
    assert "http://" not in page


def test_invalid_filter_renders_accessible_http_400_page(client) -> None:
    response = client.get("/?status=bad")
    page = response.data.decode("utf-8")

    assert response.status_code == 400
    assert "<title>Filter tidak valid" in page
    assert 'role="alert"' in page
    assert "Filter status tidak valid" in page
