from fastapi.testclient import TestClient

from sentinel_pilot.api.dependencies import get_investigation_service
from sentinel_pilot.main import app
from sentinel_pilot.services.investigation_service import InvestigationService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import InvestigationRepository, TimelineRepository


def test_create_investigation_starts_in_created_status():
    with TestClient(app) as client:
        response = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["id"].startswith("inv_")
    assert body["alert_id"] == "alert_bruteforce_001"
    assert body["status"] == "created"
    assert body["created_at"].endswith("Z")


def test_get_investigation_returns_created_record():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()

        response = client.get(f"/api/investigations/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["alert_id"] == "alert_bruteforce_001"
    assert body["status"] == "created"
    assert body["summary"] == ""
    assert body["severity"] == "medium"
    assert body["category"] == "authentication"
    assert body["mitre_techniques"] == []
    assert body["error_message"] is None


def test_timeline_is_available_immediately():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()

        response = client.get(f"/api/investigations/{created['id']}/timeline")

    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_create_investigation_rejects_missing_alert():
    with TestClient(app) as client:
        response = client.post("/api/investigations", json={"alert_id": "missing"})

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Alert not found: missing",
        }
    }


def test_get_investigation_returns_standard_error_for_missing_id():
    with TestClient(app) as client:
        response = client.get("/api/investigations/missing")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Investigation not found: missing",
        }
    }


def test_run_investigation_returns_ack_and_updates_result():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()

        response = client.post(f"/api/investigations/{created['id']}/run")
        investigation = client.get(f"/api/investigations/{created['id']}").json()
        timeline = client.get(f"/api/investigations/{created['id']}/timeline").json()

    assert response.status_code == 200
    assert response.json() == {"id": created["id"], "status": "running"}
    assert investigation["status"] == "waiting_approval"
    assert investigation["severity"] == "high"
    assert investigation["category"] == "credential_access"
    assert investigation["mitre_techniques"] == ["T1110"]
    assert "map_mitre_attack" in [item["tool_name"] for item in timeline["items"]]


def test_investigation_routes_use_dependency_injected_service():
    class FakeService:
        def create(self, alert_id: str):
            return type(
                "Investigation",
                (),
                {
                    "id": "inv_fake",
                    "alert_id": alert_id,
                    "status": "created",
                    "created_at": "2026-05-23T00:00:00Z",
                },
            )()

    app.dependency_overrides[get_investigation_service] = lambda: FakeService()
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/investigations",
                json={"alert_id": "alert_bruteforce_001"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["id"] == "inv_fake"


def test_investigation_run_marks_failed_when_orchestrator_raises(tmp_path):
    class BrokenRegistry:
        def call(self, *_args, **_kwargs):
            raise RuntimeError("sample data file is damaged at C:\\secret\\alerts.json")

    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    investigation = investigations.create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    service = InvestigationService(
        alert_source=app.state.alert_source,
        investigations=investigations,
        timeline=timeline,
        registry=BrokenRegistry(),
    )

    service.run(investigation.id)

    result = investigations.get(investigation.id)
    assert result is not None
    assert result.status == "failed"
    assert result.error_message == "Investigation failed during deterministic orchestration."
