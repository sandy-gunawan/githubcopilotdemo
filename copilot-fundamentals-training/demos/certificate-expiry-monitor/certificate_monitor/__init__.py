from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping

from flask import Flask, abort, jsonify, render_template, request
from werkzeug.exceptions import BadRequest

from .data import CertificateEntry, load_certificates, normalize_utc
from .status import (
    STATUS_LABELS,
    CertificateAssessment,
    CertificateStatus,
    assess_certificate,
    sort_assessments,
)


FILTER_VALUES = ("all", "healthy", "warning", "critical", "expired", "error")
FILTER_TO_STATUS = {
    status.value.lower(): status for status in CertificateStatus
}
STATUS_OPTIONS = (
    {"value": "all", "label": "Semua"},
    *(
        {
            "value": status.value.lower(),
            "label": STATUS_LABELS[status],
        }
        for status in CertificateStatus
    ),
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _summary(assessments: tuple[CertificateAssessment, ...]) -> dict[str, int]:
    result = {
        "total": len(assessments),
        **{status.value.lower(): 0 for status in CertificateStatus},
    }
    for assessment in assessments:
        result[assessment.status.value.lower()] += 1
    return result


def _evaluate(
    entries: tuple[CertificateEntry, ...],
    now: datetime,
) -> tuple[CertificateAssessment, ...]:
    return sort_assessments(assess_certificate(entry, now) for entry in entries)


def create_app(
    config: Mapping[str, Any] | None = None,
    *,
    clock: Callable[[], datetime] = utc_now,
    fixture_path: str | Path | None = None,
) -> Flask:
    """Create the read-only dashboard with an injectable clock and fixture."""

    app = Flask(__name__, static_folder="static", template_folder="templates")
    if config is not None:
        app.config.from_mapping(config)

    configured_fixture = (
        fixture_path
        if fixture_path is not None
        else app.config.get("CERTIFICATE_FIXTURE_PATH")
    )
    startup_at = clock()
    entries = load_certificates(configured_fixture, startup_at=startup_at)
    app.extensions["certificate_monitor"] = {
        "entries": entries,
        "clock": clock,
    }

    @app.get("/")
    def dashboard():
        requested_statuses = request.args.getlist("status")
        if not requested_statuses:
            active_filter = "all"
        elif len(requested_statuses) == 1 and requested_statuses[0] in FILTER_VALUES:
            active_filter = requested_statuses[0]
        else:
            abort(
                400,
                description=(
                    "Filter status tidak valid. Pilih Semua atau salah satu status "
                    "yang tersedia."
                ),
            )

        now = normalize_utc(clock(), field_name="clock value")
        assessments = _evaluate(entries, now)
        summary = _summary(assessments)
        if active_filter == "all":
            visible_assessments = assessments
        else:
            selected_status = FILTER_TO_STATUS[active_filter]
            visible_assessments = tuple(
                assessment
                for assessment in assessments
                if assessment.status is selected_status
            )

        return render_template(
            "index.html",
            snapshot_at=now,
            assessments=assessments,
            summary=summary,
            active_filter=active_filter,
            status_options=STATUS_OPTIONS,
            visible_assessments=visible_assessments,
            result_count=len(visible_assessments),
            empty_message=(
                "Tidak ada sertifikat untuk filter ini."
                if not visible_assessments
                else None
            ),
        )

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok", "mode": "demo"})

    @app.errorhandler(BadRequest)
    def bad_request(error: BadRequest):
        return (
            render_template(
                "error.html",
                message=error.description or "Permintaan tidak valid.",
                status_code=400,
            ),
            400,
        )

    return app
