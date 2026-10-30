from time import perf_counter

from playwright.sync_api import Page, expect
import pytest

from certificate_monitor import create_app


pytestmark = pytest.mark.browser


def test_all_filters_preserve_the_inventory_summary(
    offline_page: Page, live_server: str, record_property
) -> None:
    page = offline_page
    page.goto(live_server, wait_until="load")
    for status, count in (
        ("critical", 2), ("healthy", 2), ("warning", 2),
        ("expired", 1), ("error", 1), ("all", 8),
    ):
        page.get_by_label("Filter status").select_option(status)
        started = perf_counter()
        with page.expect_navigation(wait_until="load"):
            page.get_by_role("button", name="Terapkan", exact=True).click()
        rows = page.locator("tr[data-certificate-id]")
        expect(rows).to_have_count(count)
        elapsed = perf_counter() - started
        record_property(f"filter_{status}_seconds", round(elapsed, 4))
        assert elapsed <= 2
        expect(page.get_by_label("Filter status")).to_have_value(status)
        if status != "all":
            expect(page.locator(f'tr[data-status="{status.upper()}"]')).to_have_count(count)
        expect(page.get_by_test_id("summary-total").locator(".summary-value")).to_have_text("8")
        expect(page.get_by_test_id("summary-critical").locator(".summary-value")).to_have_text("2")
        expect(page.locator(".result-count")).to_contain_text(f"{count} dari 8 layanan")


def test_empty_filter_explains_the_result_and_can_return_to_all(
    offline_page: Page, server_factory, fixture_builder, demo_records, mutable_clock
) -> None:
    for record in demo_records:
        if record["error_reason"] is None:
            record["expires_in_seconds"] = 60 * 86400
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(demo_records),
    )
    page = offline_page
    page.goto(server_factory(app), wait_until="load")
    page.get_by_label("Filter status").select_option("warning")
    page.get_by_role("button", name="Terapkan", exact=True).click()
    expect(page.get_by_test_id("empty-state")).to_contain_text("Tidak ada hasil")
    expect(page.locator("tr[data-certificate-id]")).to_have_count(0)
    expect(page.get_by_test_id("summary-total").locator(".summary-value")).to_have_text("8")
    expect(page.get_by_test_id("summary-healthy").locator(".summary-value")).to_have_text("7")
    page.get_by_label("Filter status").select_option("all")
    page.get_by_role("button", name="Terapkan", exact=True).click()
    expect(page.locator("tr[data-certificate-id]")).to_have_count(8)
    expect(page.get_by_test_id("empty-state")).to_have_count(0)


def test_invalid_filter_shows_http_400_and_a_recovery_link(
    offline_page: Page, live_server: str
) -> None:
    page = offline_page
    response = page.goto(f"{live_server}/?status=CRITICAL", wait_until="load")
    assert response is not None and response.status == 400
    expect(page.get_by_role("alert")).to_contain_text("Filter status tidak valid")
    page.get_by_role("link", name="Kembali ke dashboard").click()
    expect(page.get_by_label("Filter status")).to_have_value("all")
    expect(page.locator("tr[data-certificate-id]")).to_have_count(8)
