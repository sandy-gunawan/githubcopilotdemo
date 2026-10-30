from __future__ import annotations

from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urlsplit

from flask import Flask
from playwright.sync_api import Page, Route
import pytest
from werkzeug.serving import make_server

from certificate_monitor import create_app


class MutableClock:
    """A function-scoped UTC clock that tests can advance without sleeping."""

    def __init__(self, current: datetime) -> None:
        self.current = current
        self.calls = 0

    def __call__(self) -> datetime:
        self.calls += 1
        return self.current

    def set(self, value: datetime) -> None:
        self.current = value

    def advance(self, delta: timedelta) -> None:
        self.current += delta


@pytest.fixture
def fixed_now() -> datetime:
    return datetime(2030, 1, 1, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def mutable_clock(fixed_now: datetime) -> MutableClock:
    return MutableClock(fixed_now)


@pytest.fixture
def fixture_builder(tmp_path: Path) -> Callable[..., Path]:
    """Write a modified copy of the complete shipped fixture to a temp file."""

    source = (
        Path(__file__).resolve().parents[1]
        / "certificate_monitor"
        / "data"
        / "certificates.json"
    )
    sequence = 0

    def build(
        records: list[dict[str, object]] | None = None,
        *,
        name: str | None = None,
    ) -> Path:
        nonlocal sequence
        if records is None:
            records = json.loads(source.read_text(encoding="utf-8"))
        path = tmp_path / (name or f"fixture-{sequence}.json")
        sequence += 1
        path.write_text(
            json.dumps(deepcopy(records), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return path

    return build


@pytest.fixture
def app(mutable_clock: MutableClock):
    return create_app({"TESTING": True}, clock=mutable_clock)


@pytest.fixture
def client(app):
    return app.test_client()


@contextmanager
def _running_server(app: Flask) -> Iterator[str]:
    server = make_server("127.0.0.1", 0, app, threaded=True)
    thread = Thread(
        target=server.serve_forever,
        name="certificate-monitor-test-server",
        daemon=True,
    )
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()
        if thread.is_alive():
            raise RuntimeError("The test HTTP server did not shut down cleanly.")


@pytest.fixture
def server_factory() -> Iterator[Callable[[Flask], str]]:
    with ExitStack() as servers:
        yield lambda app: servers.enter_context(_running_server(app))


@pytest.fixture
def live_server(app: Flask, server_factory: Callable[[Flask], str]) -> str:
    return server_factory(app)


@pytest.fixture
def demo_records(fixture_builder) -> list[dict[str, object]]:
    return json.loads(fixture_builder().read_text(encoding="utf-8"))


@pytest.fixture
def offline_page(page: Page) -> Iterator[Page]:
    external_requests: list[str] = []

    def allow_only_loopback(route: Route) -> None:
        if urlsplit(route.request.url).hostname in {"127.0.0.1", "localhost", "::1"}:
            route.continue_()
        else:
            external_requests.append(route.request.url)
            route.abort()

    page.route("**/*", allow_only_loopback)
    yield page
    assert external_requests == [], f"Unexpected external requests: {external_requests}"


@pytest.fixture
def loopback_get():
    """Make a bounded GET request for tests using the live loopback server."""

    def get(url: str) -> tuple[int, str, bytes]:
        with urlopen(url, timeout=5) as response:
            return (
                response.status,
                response.headers.get_content_type(),
                response.read(),
            )

    return get
