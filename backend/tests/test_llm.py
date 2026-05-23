from fastapi.testclient import TestClient

from sentinel_pilot.agent.orchestrator import InvestigationOrchestrator
from sentinel_pilot.config import Settings
from sentinel_pilot.llm.base import LLMAction, LLMAnalysis, LLMConstraints
from sentinel_pilot.llm.factory import create_llm_client, get_llm_status
from sentinel_pilot.main import app
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import InvestigationRepository, TimelineRepository


class FakeLLMClient:
    def analyze(self, _context):
        return LLMAnalysis(
            summary="Model-assisted verdict: credential compromise likely.",
            severity="critical",
            category="credential_access",
            mitre_techniques=["T1110"],
            recommended_actions=[
                LLMAction(
                    action_type="block_ip",
                    target="203.0.113.10",
                    risk_level="high",
                    reason="Model confirmed suspicious successful login after brute force.",
                )
            ],
            confidence=0.91,
        )


def test_llm_status_masks_secret_and_exposes_constraints():
    settings = Settings(
        llm_enabled=True,
        llm_provider="openai_compatible",
        llm_base_url="https://llm.example/v1",
        llm_api_key="secret-value",
        llm_model="security-model",
        llm_action_mode="approval_required",
        llm_allow_high_risk_actions=True,
    )

    status = get_llm_status(settings)

    assert status["enabled"] is True
    assert status["provider"] == "openai_compatible"
    assert status["model"] == "security-model"
    assert status["base_url_configured"] is True
    assert status["api_key_configured"] is True
    assert "secret-value" not in str(status)
    assert status["constraints"]["structured_output_required"] is True
    assert status["constraints"]["real_response_actions_enabled"] is False
    assert status["action_mode"] == "approval_required"


def test_mock_llm_client_returns_structured_analysis():
    client = create_llm_client(Settings(llm_provider="mock"))

    result = client.analyze(
        {
            "alert": {"id": "alert_1", "category": "authentication"},
            "evidence": ["failed logins", "successful login"],
        }
    )

    assert result.summary
    assert result.severity in ("low", "medium", "high", "critical")
    assert isinstance(result.mitre_techniques, list)
    assert 0 <= result.confidence <= 1


def test_constraints_reject_disallowed_actions():
    constraints = LLMConstraints()
    analysis = LLMAnalysis(
        summary="Bad action request.",
        severity="critical",
        category="credential_access",
        mitre_techniques=["T1110"],
        recommended_actions=[
            LLMAction(
                action_type="delete_files",
                target="server-1",
                risk_level="critical",
                reason="Not allowed.",
            )
        ],
        confidence=0.7,
    )

    constrained = constraints.apply(analysis)

    assert constrained.recommended_actions == []
    assert constrained.summary == "Bad action request."


def test_orchestrator_uses_llm_analysis_without_bypassing_approval(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    investigation = investigations.create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )

    result = InvestigationOrchestrator(
        investigations=investigations,
        timeline=timeline,
        llm_client=FakeLLMClient(),
        llm_constraints=LLMConstraints(action_mode="approval_required"),
    ).run(investigation.id)

    approvals = result.status == "waiting_approval"
    timeline_items = timeline.list_by_investigation(investigation.id)

    assert approvals is True
    assert result.severity == "critical"
    assert result.summary == "Model-assisted verdict: credential compromise likely."
    assert any(
        item.type == "agent_message" and item.title == "LLM analysis"
        for item in timeline_items
    )


def test_llm_status_endpoint_returns_sanitized_config():
    with TestClient(app) as client:
        response = client.get("/api/integrations/llm/status")

    assert response.status_code == 200
    body = response.json()
    assert "api_key" not in body
    assert body["constraints"]["real_response_actions_enabled"] is False
