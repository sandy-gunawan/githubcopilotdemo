from time import perf_counter

from playwright.sync_api import Page, expect
import pytest

from certificate_monitor import create_app


pytestmark = pytest.mark.browser


def test_offline_dashboard_statuses_assets_and_mobile_layout(
    offline_page: Page, live_server: str, record_property
) -> None:
    page = offline_page
    started = perf_counter()
    response = page.goto(live_server, wait_until="load")
    expect(page.locator("tr[data-certificate-id]")).to_have_count(8)
    elapsed = perf_counter() - started
    record_property("navigation_seconds", round(elapsed, 4))
    assert elapsed <= 2
    assert response is not None and response.status == 200

    expect(page.get_by_text("Data simulasi/offline", exact=True)).to_be_visible()
    expect(page.get_by_role("columnheader")).to_have_count(7)
    expected_counts = {
        "total": 8, "healthy": 2, "warning": 2,
        "critical": 2, "expired": 1, "error": 1,
    }
    for status, count in expected_counts.items():
        expect(
            page.get_by_test_id(f"summary-{status}").locator(".summary-value")
        ).to_have_text(str(count))

    rows = page.locator("tr[data-certificate-id]")
    assert rows.evaluate_all(
        "(rows) => rows.map(row => row.dataset.certificateId)"
    ) == ["legacy", "vpn", "backup", "registry", "portal", "unknown", "monitoring", "gateway"]

    for status, label in {
        "healthy": "Normal",
        "warning": "Segera kedaluwarsa",
        "critical": "Kritis",
        "expired": "Kedaluwarsa",
        "error": "Gagal diperiksa",
    }.items():
        badge = page.locator(f".status-badge--{status}").first
        expect(badge).to_contain_text(label)
        assert badge.evaluate("(badge) => getComputedStyle(badge).backgroundColor") != "rgba(0, 0, 0, 0)"

    error_row = page.locator('[data-certificate-id="unknown"]')
    expect(error_row.locator("time")).to_have_count(0)
    expect(error_row.locator(".remaining-value")).to_have_text("-")
    expect(error_row.locator(".error-reason")).to_contain_text("simulasi offline")
    expect(page.locator('[data-certificate-id="legacy"] .remaining-value')).to_have_text(
        "Kedaluwarsa"
    )
    expect(page.get_by_test_id("snapshot-time")).to_have_attribute(
        "datetime", "2030-01-01T12:00:00+00:00"
    )
    for stylesheet in page.locator('link[rel="stylesheet"]').all():
        href = stylesheet.get_attribute("href")
        assert href is not None and href.startswith("/static/")
        assert page.request.get(f"{live_server}{href}").status == 200

    page.set_viewport_size({"width": 390, "height": 844})
    expect(page.get_by_label("Filter status")).to_be_visible()
    assert page.evaluate(
        "() => document.documentElement.scrollWidth <= document.documentElement.clientWidth"
    )
    assert page.locator(".table-responsive").evaluate(
        "(wrapper) => wrapper.scrollWidth > wrapper.clientWidth"
    )
    expect(page.locator('[data-certificate-id="gateway"]')).to_have_count(1)


def test_fixture_metadata_stays_text_in_the_browser(
    offline_page: Page, server_factory, fixture_builder, demo_records, mutable_clock
) -> None:
    demo_records[0]["name"] = '<b data-demo-markup="yes">Gateway Demo</b>'
    demo_records[-1]["error_reason"] = "<em>Metadata simulasi tidak tersedia</em>"
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(demo_records),
    )
    page = offline_page
    page.goto(server_factory(app), wait_until="load")
    expect(page.locator("tr[data-certificate-id]")).to_have_count(8)
    expect(page.locator('[data-certificate-id="gateway"] .service-name')).to_have_text(
        '<b data-demo-markup="yes">Gateway Demo</b>'
    )
    expect(page.locator("[data-demo-markup]")).to_have_count(0)
    expect(page.locator('[data-certificate-id="unknown"] .error-reason')).to_have_text(
        "<em>Metadata simulasi tidak tersedia</em>"
    )
    expect(page.locator(".error-reason em")).to_have_count(0)
