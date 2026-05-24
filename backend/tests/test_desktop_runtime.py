import sys

from fastapi.testclient import TestClient

from sentinel_pilot.config import Settings
from sentinel_pilot.desktop_runtime import (
    build_uvicorn_options,
    default_user_data_dir,
    resolve_runtime_paths,
)
from sentinel_pilot.main import app
from sentinel_pilot.runtime_resources import resource_path


def test_default_user_data_dir_uses_platform_user_data_root(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setenv("APPDATA", str(tmp_path / "Roaming"))

    assert default_user_data_dir() == tmp_path / "Roaming" / "SentinelPilot"


def test_resolve_runtime_paths_moves_database_and_service_log_to_user_data(tmp_path):
    settings = Settings(
        database_url="",
        service_log_path="",
        user_data_dir=str(tmp_path / "SentinelPilot"),
    )

    paths = resolve_runtime_paths(settings)

    assert paths.user_data_dir == tmp_path / "SentinelPilot"
    assert paths.database_url == f"sqlite:///{tmp_path / 'SentinelPilot' / 'sentinel_pilot.db'}"
    assert paths.service_log_path == tmp_path / "SentinelPilot" / "logs" / "app.log"


def test_build_uvicorn_options_accepts_dynamic_port_and_suppresses_reload():
    options = build_uvicorn_options(["--host", "127.0.0.1", "--port", "49152"])

    assert options["app"] == "sentinel_pilot.main:app"
    assert options["host"] == "127.0.0.1"
    assert options["port"] == 49152
    assert options["reload"] is False


def test_tauri_webview_origins_are_allowed_for_desktop_shell():
    with TestClient(app) as client:
        response = client.options(
            "/health",
            headers={
                "Origin": "https://tauri.localhost",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://tauri.localhost"


def test_resource_path_uses_pyinstaller_bundle_root(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path), raising=False)

    assert resource_path("examples", "alerts") == tmp_path / "examples" / "alerts"
