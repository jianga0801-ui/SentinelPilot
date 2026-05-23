from sentinel_pilot.agent.orchestrator import InvestigationOrchestrator
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import InvestigationRepository, TimelineRepository


def test_orchestrator_promotes_bruteforce_severity_after_successful_login(tmp_path):
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
    ).run(investigation.id)

    assert result.severity == "high"
    assert result.category == "credential_access"
    assert result.mitre_techniques == ["T1110"]
    assert "successful login" in result.summary.lower()
    assert "suspicious" in result.summary.lower()

    tool_names = [item.tool_name for item in timeline.list_by_investigation(investigation.id)]
    assert "search_logs" in tool_names
    assert "lookup_threat_intel" in tool_names
    assert "map_mitre_attack" in tool_names


def test_orchestrator_builds_semantic_evidence_for_lateral_movement(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    investigation = investigations.create(
        alert_id="alert_lateral_movement_001",
        severity="high",
        category="lateral_movement",
    )

    result = InvestigationOrchestrator(
        investigations=investigations,
        timeline=timeline,
    ).run(investigation.id)

    assert result.mitre_techniques == ["T1021.002", "T1021.006"]


def test_orchestrator_matches_initial_eval_cases(tmp_path):
    cases = [
        (
            "alert_bruteforce_001",
            "medium",
            "authentication",
            "high",
            "credential_access",
            ["T1110"],
        ),
        (
            "alert_powershell_001",
            "high",
            "suspicious_powershell",
            "high",
            "execution",
            ["T1059.001"],
        ),
        (
            "alert_webshell_001",
            "high",
            "web_intrusion",
            "high",
            "web_intrusion",
            ["T1505.003"],
        ),
        (
            "alert_malicious_domain_001",
            "medium",
            "malicious_domain",
            "medium",
            "command_and_control",
            ["T1071.001"],
        ),
        (
            "alert_lateral_movement_001",
            "high",
            "lateral_movement",
            "high",
            "lateral_movement",
            ["T1021.002", "T1021.006"],
        ),
        (
            "alert_false_positive_001",
            "low",
            "false_positive",
            "low",
            "false_positive",
            [],
        ),
    ]

    for alert_id, initial_severity, initial_category, severity, category, mitre in cases:
        connection = create_connection(tmp_path / f"{alert_id}.db")
        init_database(connection)
        investigations = InvestigationRepository(connection)
        timeline = TimelineRepository(connection)
        investigation = investigations.create(
            alert_id=alert_id,
            severity=initial_severity,
            category=initial_category,
        )

        result = InvestigationOrchestrator(
            investigations=investigations,
            timeline=timeline,
        ).run(investigation.id)

        assert result.severity == severity
        assert result.category == category
        assert result.mitre_techniques == mitre


def test_orchestrator_classifies_non_promoted_categories_explicitly(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigations = InvestigationRepository(connection)
    timeline = TimelineRepository(connection)
    orchestrator = InvestigationOrchestrator(
        investigations=investigations,
        timeline=timeline,
    )

    webshell = orchestrator._classify("low", "web_intrusion", [], None)
    lateral_movement = orchestrator._classify("medium", "lateral_movement", [], None)
    false_positive = orchestrator._classify("high", "false_positive", [], None)

    assert webshell[:2] == ("high", "web_intrusion")
    assert lateral_movement[:2] == ("high", "lateral_movement")
    assert false_positive[:2] == ("low", "false_positive")
