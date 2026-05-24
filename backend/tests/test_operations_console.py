from fastapi.testclient import TestClient

from sentinel_pilot.config import settings
from sentinel_pilot.main import app
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import SystemConfigRepository


def test_system_config_repository_masks_sensitive_values(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    repo = SystemConfigRepository(connection)

    repo.upsert_many(
        {
            "llm_model": "security-model",
            "llm_api_key": "secret-value",
            "dingtalk_secret": "hook-secret",
            "feishu_secret": "feishu-secret",
        }
    )

    items = {item["key"]: item for item in repo.list_items()}

    assert items["llm_model"]["value"] == "security-model"
    assert items["llm_api_key"]["value"] is None
    assert items["llm_api_key"]["configured"] is True
    assert items["dingtalk_secret"]["value"] is None
    assert items["feishu_secret"]["value"] is None
    assert "secret-value" not in str(items)
    assert "feishu-secret" not in str(items)


def test_settings_endpoint_updates_config_without_returning_secrets(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{tmp_path / 'sentinel.db'}")

    with TestClient(app) as client:
        response = client.patch(
            "/api/settings",
            json={
                "items": {
                    "llm_provider": "openai_compatible",
                    "llm_model": "security-model",
                    "llm_api_key": "secret-value",
                    "default_language": "en",
                }
            },
        )

        assert response.status_code == 200
        body = response.json()

        assert body["items"]["llm_model"]["value"] == "security-model"
        assert body["items"]["llm_api_key"]["value"] is None
        assert body["items"]["llm_api_key"]["configured"] is True
        assert "secret-value" not in str(body)

        status = client.get("/api/integrations/llm/status").json()
        assert status["provider"] == "openai_compatible"
        assert status["model"] == "security-model"
        assert status["api_key_configured"] is True


def test_security_logs_endpoint_filters_alert_events():
    with TestClient(app) as client:
        response = client.get(
            "/api/logs/security",
            params={"alert_id": "alert_bruteforce_001", "limit": 3},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 3
    assert body["total"] >= 3
    assert all(item["alert_id"] == "alert_bruteforce_001" for item in body["items"])
    assert body["items"][0]["event_time"] <= body["items"][1]["event_time"]


def test_system_dashboard_endpoint_returns_operational_summary(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{tmp_path / 'sentinel.db'}")

    with TestClient(app) as client:
        response = client.get("/api/system/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["health"]["backend"]["status"] == "online"
    assert body["health"]["database"]["status"] == "online"
    assert body["metrics"]["total_alerts"] >= 0
    assert body["metrics"]["investigations_total"] == 0
    assert body["recent_timeline"] == []


def test_service_logs_endpoint_handles_missing_log_file():
    with TestClient(app) as client:
        response = client.get("/api/system/logs/service", params={"limit": 20})

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "count" in body
