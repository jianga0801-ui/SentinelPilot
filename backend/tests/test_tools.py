from datetime import UTC, datetime
from pathlib import Path

import pytest

from sentinel_pilot.agent.tool_registry import ToolRegistry
from sentinel_pilot.agent.tools import (
    Evidence,
    get_alert,
    lookup_threat_intel,
    map_mitre_attack,
    search_knowledge_base,
    search_logs,
    write_report,
)
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_get_alert_returns_normalized_alert():
    alert = get_alert("alert_bruteforce_001")

    assert alert.id == "alert_bruteforce_001"
    assert alert.entities["src_ip"] == "203.0.113.10"


def test_get_alert_raises_typed_error_for_missing_alert():
    with pytest.raises(SentinelPilotError) as exc_info:
        get_alert("missing")

    assert exc_info.value.code == "not_found"


def test_search_logs_finds_failed_ssh_records_sorted_by_time():
    logs = search_logs(
        time_range={
            "start": datetime(2026, 5, 22, 9, 50, tzinfo=UTC),
            "end": datetime(2026, 5, 22, 9, 55, tzinfo=UTC),
        },
        host="linux-web-01",
        src_ip="203.0.113.10",
        log_type="auth",
    )

    assert len(logs) == 80
    assert logs[0].id == "evt_0001"
    assert logs[-1].id == "evt_0080"
    assert [log.event_time for log in logs] == sorted(log.event_time for log in logs)


def test_lookup_threat_intel_returns_sample_ip_reputation():
    result = lookup_threat_intel(
        indicator="203.0.113.10",
        indicator_type="ip",
        matched_at=datetime(2026, 5, 22, 16, 0, tzinfo=UTC),
    )

    assert result.indicator == "203.0.113.10"
    assert result.reputation == "suspicious"
    assert result.labels == ["ssh-bruteforce", "recent-activity"]
    assert result.matched_at.isoformat() == "2026-05-22T16:00:00+00:00"


def test_lookup_threat_intel_returns_unknown_for_unmatched_indicator():
    result = lookup_threat_intel(
        indicator="192.0.2.200",
        indicator_type="ip",
        matched_at=datetime(2026, 5, 22, 16, 0, tzinfo=UTC),
    )

    assert result.reputation == "unknown"
    assert result.labels == []
    assert result.source == "local-sample"


def test_search_knowledge_base_returns_ranked_markdown_documents():
    documents = search_knowledge_base("ssh brute force failed password", limit=2)

    assert [document.id for document in documents] == [
        "playbooks/ssh-bruteforce.md",
        "mitre_notes/T1110.md",
    ]
    assert documents[0].title == "SSH Brute Force Playbook"
    assert "Failed password" in documents[0].snippet


def test_map_mitre_attack_maps_brute_force_behavior_to_t1110():
    techniques = map_mitre_attack(
        category="authentication",
        evidence=[
            Evidence(
                source="logs",
                content="17 Failed password events followed by an accepted SSH login.",
            )
        ],
    )

    assert techniques[0].technique_id == "T1110"
    assert techniques[0].name == "Brute Force"
    assert techniques[0].tactic == "Credential Access"
    assert techniques[0].confidence == "high"


def test_map_mitre_attack_maps_remaining_sample_scenarios():
    scenarios = [
        (
            "web intrusion",
            "Webshell upload to avatar.aspx followed by w3wp.exe spawning cmd.exe.",
            ["T1505.003"],
        ),
        (
            "network",
            "DNS query for update-check.example.net followed by periodic HTTPS beacon traffic.",
            ["T1071.001"],
        ),
        (
            "lateral_movement",
            "Remote WMI connection and SMB share access from jump-01 across multiple hosts.",
            ["T1021.002", "T1021.006"],
        ),
        (
            "false_positive",
            "Nessus scanner generated 404 and 403 web probes with no exploitation detected.",
            None,
        ),
    ]

    for category, content, expected_id in scenarios:
        techniques = map_mitre_attack(
            category=category,
            evidence=[Evidence(source="logs", content=content)],
        )

        if expected_id is None:
            assert techniques == []
        else:
            assert [technique.technique_id for technique in techniques] == expected_id


def test_map_mitre_attack_does_not_treat_webshell_child_process_as_powershell_scenario():
    techniques = map_mitre_attack(
        category="web_intrusion",
        evidence=[
            Evidence(
                source="logs",
                content=(
                    "GET /uploads/avatar.aspx?cmd=powershell followed by "
                    "w3wp.exe spawned powershell.exe after webshell upload."
                ),
            )
        ],
    )

    assert [technique.technique_id for technique in techniques] == ["T1505.003"]


def test_tool_registry_lists_and_dispatches_tools():
    registry = ToolRegistry.default()

    assert registry.names() == [
        "get_alert",
        "lookup_threat_intel",
        "map_mitre_attack",
        "search_knowledge_base",
        "search_logs",
        "write_report",
    ]
    result = registry.call("lookup_threat_intel", indicator="203.0.113.10", indicator_type="ip")

    assert result.indicator == "203.0.113.10"


def test_tool_registry_writes_tool_calls_to_timeline(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    timeline = TimelineRepository(connection)
    registry = ToolRegistry.default(timeline=timeline)

    registry.call(
        "lookup_threat_intel",
        investigation_id=investigation.id,
        indicator="203.0.113.10",
        indicator_type="ip",
    )

    items = timeline.list_by_investigation(investigation.id)
    assert [item.type for item in items] == ["tool_call", "tool_result"]
    assert items[0].tool_name == "lookup_threat_intel"
    assert items[0].input == {"indicator": "203.0.113.10", "indicator_type": "ip"}
    assert items[1].output["indicator"] == "203.0.113.10"


def test_write_report_persists_report_and_timeline_item(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    reports = ReportRepository(connection)
    timeline = TimelineRepository(connection)

    report = write_report(
        investigation_id=investigation.id,
        content="# Security Incident Report\n\nEvidence: evt_brute_001",
        reports=reports,
        timeline=timeline,
    )

    assert reports.get_by_investigation(investigation.id) == report
    timeline_items = timeline.list_by_investigation(investigation.id)
    assert timeline_items[-1].type == "report_created"
    assert timeline_items[-1].tool_name == "write_report"


def test_write_report_rejects_investigations_waiting_for_approval(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    connection.execute(
        "UPDATE investigations SET status = ? WHERE id = ?",
        ("waiting_approval", investigation.id),
    )
    connection.commit()
    reports = ReportRepository(connection)
    timeline = TimelineRepository(connection)

    with pytest.raises(SentinelPilotError) as exc_info:
        write_report(
            investigation_id=investigation.id,
            content="# Security Incident Report",
            reports=reports,
            timeline=timeline,
        )

    assert exc_info.value.code == "invalid_state"
    assert reports.get_by_investigation(investigation.id) is None
    assert timeline.list_by_investigation(investigation.id) == []
