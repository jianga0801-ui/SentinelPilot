from fastapi.testclient import TestClient

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.config import Settings
from sentinel_pilot.integrations.im.notifier import IMNotifier
from sentinel_pilot.main import app
from sentinel_pilot.services.report_service import ReportService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)


class ExplodingProvider:
    def send_message(self, _title: str, _text: str) -> None:
        raise RuntimeError("provider failed")

    def get_status(self) -> dict:
        return {"provider": "test"}


def test_report_service_generates_markdown_with_required_sections_and_evidence():
    connection = create_connection(":memory:")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    reports = ReportRepository(connection)
    investigation = investigations.create(
        alert_id="alert_bruteforce_001",
        severity="high",
        category="credential_access",
    )
    investigations.update_analysis(
        investigation_id=investigation.id,
        status="running",
        summary="SSH brute force with successful login.",
        severity="high",
        category="credential_access",
        mitre_techniques=["T1110"],
    )
    timeline.add(
        investigation_id=investigation.id,
        type="tool_result",
        title="Auth logs",
        content="Retrieved authentication evidence.",
        tool_name="search_logs",
        output={"items": [{"id": "evt_brute_001"}, {"id": "evt_brute_019"}]},
    )

    report = ReportService(
        alert_source=MockAlertSource(),
        investigations=investigations,
        approvals=ApprovalRepository(connection),
        reports=reports,
        timeline=timeline,
    ).get_or_create(investigation.id)

    assert report.format == "markdown"
    for heading in [
        "## 1. Executive Summary",
        "## 2. Alert Details",
        "## 3. Investigation Steps",
        "## 4. Evidence Chain",
        "## 5. MITRE ATT&CK Mapping",
        "## 6. Impact Assessment",
        "## 7. Response Recommendations",
        "## 8. Approval History",
        "## 9. Hardening Recommendations",
    ]:
        assert heading in report.content
    assert "evt_brute_001" in report.content
    assert "evt_brute_019" in report.content
    assert any(line.startswith("- evt_") for line in report.content.splitlines())
    assert "prompt" not in report.content.lower()
    assert "traceback" not in report.content.lower()


def test_report_service_notification_failure_does_not_block_report_creation():
    connection = create_connection(":memory:")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    reports = ReportRepository(connection)
    investigation = investigations.create(
        alert_id="alert_bruteforce_001",
        severity="high",
        category="credential_access",
    )
    investigations.update_analysis(
        investigation_id=investigation.id,
        status="running",
        summary="SSH brute force with successful login.",
        severity="high",
        category="credential_access",
        mitre_techniques=["T1110"],
    )
    notifier = IMNotifier(
        Settings(
            app_name="TestApp",
            database_url="sqlite:///:memory:",
            im_provider="dingtalk",
            im_notification_enabled=True,
            dingtalk_webhook_url="http://dummy-webhook",
            public_app_url="http://test-app",
        )
    )
    notifier.provider = ExplodingProvider()

    report = ReportService(
        alert_source=MockAlertSource(),
        investigations=investigations,
        approvals=ApprovalRepository(connection),
        reports=reports,
        timeline=timeline,
        im_notifier=notifier,
    ).get_or_create(investigation.id)

    assert report.investigation_id == investigation.id
    assert "provider failed" in (notifier.last_error or "")


def test_report_api_rejects_investigations_waiting_for_approval():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")

        response = client.get(f"/api/investigations/{created['id']}/report")

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "invalid_state",
            "message": "Investigation is waiting for approval and cannot be completed.",
        }
    }


def test_report_api_returns_standard_error_for_missing_investigation():
    with TestClient(app) as client:
        response = client.get("/api/investigations/missing/report")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Investigation not found: missing",
        }
    }


def test_report_api_generates_report_after_approval_and_completes_investigation():
    with TestClient(app) as client:
        created = client.post(
            "/api/investigations",
            json={"alert_id": "alert_bruteforce_001"},
        ).json()
        client.post(f"/api/investigations/{created['id']}/run")
        approval = client.get(f"/api/investigations/{created['id']}/approvals").json()["items"][0]
        client.post(
            f"/api/approvals/{approval['id']}/decision",
            json={"decision": "approved", "comment": "Approved for simulation."},
        )

        response = client.get(f"/api/investigations/{created['id']}/report")
        second = client.get(f"/api/investigations/{created['id']}/report")
        investigation = client.get(f"/api/investigations/{created['id']}").json()
        timeline = client.get(f"/api/investigations/{created['id']}/timeline").json()

    assert response.status_code == 200
    body = response.json()
    assert second.json()["id"] == body["id"]
    assert body["investigation_id"] == created["id"]
    assert body["format"] == "markdown"
    assert "# Security Incident Report" in body["content"]
    assert "Approval History" in body["content"]
    assert "approved" in body["content"]
    assert investigation["status"] == "completed"
    assert "report_created" in [item["type"] for item in timeline["items"]]
