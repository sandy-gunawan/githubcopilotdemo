from datetime import timedelta
from time import perf_counter

from playwright.sync_api import Page, expect
import pytest

from certificate_monitor import create_app


pytestmark = pytest.mark.browser


def test_refresh_updates_snapshot_not_expiries_and_keeps_filter(
    offline_page: Page, live_server: str, mutable_clock, record_property
) -> None:
    page = offline_page
    page.goto(f"{live_server}/?status=critical", wait_until="load")
    before = page.locator("tr[data-certificate-id] time").evaluate_all(
        "(times) => times.map(time => time.dateTime)"
    )
    expect(page.get_by_test_id("snapshot-time")).to_have_attribute(
        "datetime", mutable_clock.current.isoformat()
    )
    mutable_clock.advance(timedelta(seconds=1))
    started = perf_counter()
    with page.expect_navigation(wait_until="load"):
        page.get_by_role("link", name="Refresh", exact=True).click()
    expect(page.get_by_test_id("snapshot-time")).to_have_attribute(
        "datetime", mutable_clock.current.isoformat()
    )
    elapsed = perf_counter() - started
    record_property("refresh_seconds", round(elapsed, 4))
    assert elapsed <= 2
    expect(page.get_by_label("Filter status")).to_have_value("critical")
    expect(page.locator('tr[data-status="CRITICAL"]')).to_have_count(2)
    assert page.locator("tr[data-certificate-id] time").evaluate_all(
        "(times) => times.map(time => time.dateTime)"
    ) == before
    expect(page.get_by_test_id("summary-total").locator(".summary-value")).to_have_text("8")


def test_refresh_reclassifies_at_exactly_seven_days(
    offline_page: Page, server_factory, fixture_builder, demo_records, mutable_clock
) -> None:
    demo_records[0]["expires_in_seconds"] = 7 * 86400 + 1
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(demo_records),
    )
    page = offline_page
    page.goto(server_factory(app), wait_until="load")
    gateway = page.locator('[data-certificate-id="gateway"]')
    expect(gateway).to_have_attribute("data-status", "WARNING")
    expect(gateway.locator(".remaining-value")).to_have_text("8 hari")
    expiry = gateway.locator("time").get_attribute("datetime")
    page.get_by_label("Filter status").select_option("critical")
    page.get_by_role("button", name="Terapkan", exact=True).click()
    expect(gateway).to_have_count(0)
    mutable_clock.advance(timedelta(seconds=1))
    page.get_by_role("link", name="Refresh", exact=True).click()
    expect(page.get_by_label("Filter status")).to_have_value("critical")
    expect(gateway).to_have_attribute("data-status", "CRITICAL")
    expect(gateway.locator(".remaining-value")).to_have_text("7 hari")
    assert gateway.locator("time").get_attribute("datetime") == expiry
    expect(page.locator('tr[data-status="CRITICAL"]')).to_have_count(3)
    expect(page.get_by_test_id("summary-critical").locator(".summary-value")).to_have_text("3")
    expect(page.get_by_test_id("summary-warning").locator(".summary-value")).to_have_text("2")


def test_refresh_reclassifies_as_expired_at_exactly_zero_seconds(
    offline_page: Page, server_factory, fixture_builder, demo_records, mutable_clock
) -> None:
    vpn_record = next(record for record in demo_records if record["id"] == "vpn")
    vpn_record["expires_in_seconds"] = 1
    app = create_app(
        {"TESTING": True},
        clock=mutable_clock,
        fixture_path=fixture_builder(demo_records),
    )
    page = offline_page
    page.goto(f"{server_factory(app)}/?status=critical", wait_until="load")
    vpn = page.locator('[data-certificate-id="vpn"]')
    expect(vpn).to_have_attribute("data-status", "CRITICAL")
    expect(vpn.locator(".remaining-value")).to_have_text("1 hari")
    expiry = vpn.locator("time").get_attribute("datetime")
    mutable_clock.advance(timedelta(seconds=1))
    page.get_by_role("link", name="Refresh", exact=True).click()
    expect(vpn).to_have_count(0)
    expect(page.get_by_label("Filter status")).to_have_value("critical")
    expect(page.get_by_test_id("summary-expired").locator(".summary-value")).to_have_text("2")
    page.get_by_label("Filter status").select_option("expired")
    page.get_by_role("button", name="Terapkan", exact=True).click()
    expect(vpn).to_have_attribute("data-status", "EXPIRED")
    expect(vpn.locator(".remaining-value")).to_have_text("Kedaluwarsa")
    assert vpn.locator("time").get_attribute("datetime") == expiry
    expect(page.locator('tr[data-status="EXPIRED"]')).to_have_count(2)
