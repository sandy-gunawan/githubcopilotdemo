from pathlib import Path

from certificate_monitor import create_app


def test_bootstrap_css_is_served_from_the_local_package() -> None:
    app = create_app({"TESTING": True})
    client = app.test_client()

    page = client.get("/")
    stylesheet = client.get("/static/bootstrap.min.css")

    assert page.status_code == 200
    assert b'href="/static/bootstrap.min.css"' in page.data
    assert stylesheet.status_code == 200
    assert stylesheet.mimetype == "text/css"
    assert b"Bootstrap  v5.3.8" in stylesheet.data[:256]


def test_loopback_server_serves_dashboard_and_local_bootstrap_css(
    live_server: str,
    loopback_get,
) -> None:
    page_status, page_type, page = loopback_get(live_server)
    css_status, css_type, css = loopback_get(
        f"{live_server}/static/bootstrap.min.css"
    )

    assert page_status == 200
    assert page_type == "text/html"
    assert b'/static/bootstrap.min.css' in page
    assert css_status == 200
    assert css_type == "text/css"
    assert b"Bootstrap  v5.3.8" in css[:256]


def test_vendored_bootstrap_keeps_the_complete_mit_license() -> None:
    license_path = (
        Path(__file__).resolve().parents[1]
        / "certificate_monitor"
        / "static"
        / "bootstrap.LICENSE"
    )
    license_text = license_path.read_text(encoding="utf-8")

    assert license_text.startswith("The MIT License (MIT)")
    assert "Copyright (c) 2011-2025 The Bootstrap Authors" in license_text
    assert 'THE SOFTWARE IS PROVIDED "AS IS"' in license_text
