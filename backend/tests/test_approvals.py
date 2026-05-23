from fastapi.testclient import TestClient

from sentinel_pilot.main import app
from sentinel_pilot.services.approval_service import ApprovalService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    TimelineRepository,
)


def test_high_risk_orchestrator_run_creates_pending_approval():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()

        client.post(f"/api/investigations/{created['id']}/run")
        investigation = client.get(f"/api/investigations/{created['id']}").json()
        approvals = client.get(f"/api/investigations/{created['id']}/approvals").json()

    assert investigation["status"] == "waiting_approval"
    assert approvals["items"][0]["action_type"] == "block_ip"
    assert approvals["items"][0]["target"] == "203.0.113.10"
    assert approvals["items"][0]["risk_level"] == "high"
    assert approvals["items"][0]["status"] == "pending"
    assert approvals["items"][0]["investigation_id"] == created["id"]
    assert approvals["items"][0]["comment"] is None
    assert approvals["items"][0]["decided_at"] is None


def test_powershell_and_lateral_movement_runs_create_isolation_approvals():
    cases = [
        ("alert_powershell_001", "win-fin-02"),
        ("alert_lateral_movement_001", "jump-01"),
    ]

    with TestClient(app) as client:
        for alert_id, target in cases:
            created = client.post(
                "/api/investigations",
                json={"alert_id": alert_id},
            ).json()

            client.post(f"/api/investigations/{created['id']}/run")
            approvals = client.get(f"/api/investigations/{created['id']}/approvals").json()

            assert approvals["items"][0]["action_type"] == "isolate_host"
            assert approvals["items"][0]["target"] == target
            assert approvals["items"][0]["status"] == "pending"


def test_approval_decision_updates_status_and_writes_timeline():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")
        approval = client.get(f"/api/investigations/{created['id']}/approvals").json()["items"][0]

        response = client.post(
            f"/api/approvals/{approval['id']}/decision",
            json={"decision": "approved", "comment": "Block recommendation is valid."},
        )
        investigation = client.get(f"/api/investigations/{created['id']}").json()
        timeline = client.get(f"/api/investigations/{created['id']}/timeline").json()

    assert response.status_code == 200
    assert response.json() == {"id": approval["id"], "status": "approved"}
    assert investigation["status"] == "running"
    assert "approval_decision" in [item["type"] for item in timeline["items"]]


def test_rejected_approval_decision_is_recorded():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")
        approval = client.get(f"/api/investigations/{created['id']}/approvals").json()["items"][0]

        response = client.post(
            f"/api/approvals/{approval['id']}/decision",
            json={"decision": "rejected", "comment": "Not needed."},
        )
        approvals = client.get(f"/api/investigations/{created['id']}/approvals").json()

    assert response.status_code == 200
    assert response.json() == {"id": approval["id"], "status": "rejected"}
    assert approvals["items"][0]["comment"] == "Not needed."
    assert approvals["items"][0]["decided_at"].endswith("Z")


def test_decided_approval_no_longer_blocks_orchestrator_rerun():
    with TestClient(app) as client:
        for decision in ("approved", "rejected"):
            created = client.post(
                "/api/investigations",
                json={"alert_id": "alert_bruteforce_001"},
            ).json()
            client.post(f"/api/investigations/{created['id']}/run")
            approval = client.get(f"/api/investigations/{created['id']}/approvals").json()[
                "items"
            ][0]

            client.post(
                f"/api/approvals/{approval['id']}/decision",
                json={"decision": decision, "comment": f"{decision} in test."},
            )
            client.post(f"/api/investigations/{created['id']}/run")
            investigation = client.get(f"/api/investigations/{created['id']}").json()

            assert investigation["status"] == "completed"


def test_pending_is_not_a_valid_approval_decision():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")
        approval = client.get(f"/api/investigations/{created['id']}/approvals").json()["items"][0]

        response = client.post(
            f"/api/approvals/{approval['id']}/decision",
            json={"decision": "pending"},
        )

    assert response.status_code == 422


def test_approval_decision_is_idempotent(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="high",
        category="credential_access",
    )
    InvestigationRepository(connection).update_status(investigation.id, "waiting_approval")
    approvals = ApprovalRepository(connection)
    timeline = TimelineRepository(connection)
    approval = approvals.create(
        investigation_id=investigation.id,
        action_type="block_ip",
        target="203.0.113.10",
        risk_level="high",
        reason="Suspicious source generated repeated failed logins.",
    )
    service = ApprovalService(
        investigations=InvestigationRepository(connection),
        approvals=approvals,
        timeline=timeline,
    )

    first = service.decide(approval.id, "approved", "Valid block.")
    second = service.decide(approval.id, "approved", "Valid block.")

    assert first == second
    assert len(timeline.list_by_investigation(investigation.id)) == 1


def test_deciding_one_of_multiple_pending_approvals_keeps_investigation_waiting(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    investigation = investigations.create(
        alert_id="alert_bruteforce_001",
        severity="high",
        category="credential_access",
    )
    investigations.update_status(investigation.id, "waiting_approval")
    approvals = ApprovalRepository(connection)
    first = approvals.create(
        investigation_id=investigation.id,
        action_type="block_ip",
        target="203.0.113.10",
        risk_level="high",
        reason="Block suspicious source.",
    )
    approvals.create(
        investigation_id=investigation.id,
        action_type="notify_owner",
        target="security-team",
        risk_level="medium",
        reason="Notify owner.",
    )
    service = ApprovalService(
        investigations=investigations,
        approvals=approvals,
        timeline=TimelineRepository(connection),
    )

    service.decide(first.id, "approved", "Valid block.")

    result = investigations.get(investigation.id)
    assert result is not None
    assert result.status == "waiting_approval"


def test_missing_approval_returns_standard_error():
    with TestClient(app) as client:
        response = client.post(
            "/api/approvals/missing/decision",
            json={"decision": "approved", "comment": "Looks good."},
        )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Approval not found: missing",
        }
    }
