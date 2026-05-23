from fastapi.testclient import TestClient

from sentinel_pilot.api.dependencies import get_alert_source
from sentinel_pilot.core.models import Alert
from sentinel_pilot.main import app


def test_list_alerts_returns_sample_alerts():
    with TestClient(app) as client:
        response = client.get("/api/alerts")

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 6
    first = body["items"][0]
    assert first == {
        "id": "alert_bruteforce_001",
        "title": "SSH brute force against admin",
        "source": "mock",
        "vendor": None,
        "product": None,
        "device_type": "mock",
        "severity": "medium",
        "category": "authentication",
        "created_at": "2026-05-22T10:00:00Z",
        "status": "new",
    }


def test_get_alert_returns_normalized_detail():
    with TestClient(app) as client:
        response = client.get("/api/alerts/alert_bruteforce_001")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "alert_bruteforce_001"
    assert body["description"] == "Multiple failed SSH logins followed by one successful login."
    assert body["entities"]["src_ip"] == "203.0.113.10"
    assert body["time_range"] == {
        "start": "2026-05-22T09:50:00Z",
        "end": "2026-05-22T10:10:00Z",
    }
    assert body["raw"]["sample"] == "ssh_bruteforce"
    assert body["raw"]["vendor"] == "OpenSSH"
    assert body["raw"]["failed_attempts"] == 175


def test_get_alert_returns_standard_error_for_missing_alert():
    with TestClient(app) as client:
        response = client.get("/api/alerts/missing")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Alert not found: missing",
        }
    }


def test_alert_routes_use_dependency_injected_source():
    class FakeAlertSource:
        def list_alerts(self) -> list[Alert]:
            return [
                Alert.model_validate(
                    {
                        "id": "alert_fake_001",
                        "title": "Injected alert source",
                        "description": "Fake alert for dependency override.",
                        "source": "fake",
                        "vendor": None,
                        "product": None,
                        "device_type": "mock",
                        "severity": "low",
                        "category": "test",
                        "status": "new",
                        "entities": {},
                        "time_range": {
                            "start": "2026-05-23T00:00:00Z",
                            "end": "2026-05-23T00:01:00Z",
                        },
                        "raw": {},
                        "created_at": "2026-05-23T00:00:00Z",
                    }
                )
            ]

    app.dependency_overrides[get_alert_source] = lambda: FakeAlertSource()
    try:
        with TestClient(app) as client:
            response = client.get("/api/alerts")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == "alert_fake_001"
