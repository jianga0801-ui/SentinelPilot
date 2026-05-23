from datetime import UTC, datetime, timedelta

from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)


def test_investigation_repository_persists_created_records(tmp_path):
    database_path = tmp_path / "sentinel.db"
    connection = create_connection(database_path)
    init_database(connection)
    repo = InvestigationRepository(connection)

    created = repo.create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    connection.close()

    reopened = create_connection(database_path)
    init_database(reopened)
    fetched = InvestigationRepository(reopened).get(created.id)

    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.alert_id == "alert_bruteforce_001"
    assert fetched.status == "created"
    assert fetched.summary == ""
    assert fetched.error_message is None


def test_create_connection_creates_parent_directory_for_sqlite_url(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'nested' / 'sentinel.db'}"

    connection = create_connection(database_url)
    init_database(connection)
    connection.close()

    assert (tmp_path / "nested" / "sentinel.db").exists()


def test_timeline_repository_returns_items_ordered_by_creation_time(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )
    repo = TimelineRepository(connection)
    base_time = datetime(2026, 5, 22, 10, 0, tzinfo=UTC)

    second = repo.add(
        investigation_id=investigation.id,
        type="agent_message",
        title="Second",
        content="Second event",
        created_at=base_time + timedelta(seconds=5),
    )
    first = repo.add(
        investigation_id=investigation.id,
        type="agent_message",
        title="First",
        content="First event",
        created_at=base_time,
    )

    items = repo.list_by_investigation(investigation.id)

    assert [item.id for item in items] == [first.id, second.id]


def test_approval_and_report_repositories_read_created_records(tmp_path):
    connection = create_connection(tmp_path / "sentinel.db")
    init_database(connection)
    investigation = InvestigationRepository(connection).create(
        alert_id="alert_bruteforce_001",
        severity="medium",
        category="authentication",
    )

    approval = ApprovalRepository(connection).create(
        investigation_id=investigation.id,
        action_type="block_ip",
        target="203.0.113.10",
        risk_level="high",
        reason="Suspicious source generated repeated failed logins.",
    )
    report = ReportRepository(connection).create(
        investigation_id=investigation.id,
        content="# Security Incident Report\n\nEvidence: log_auth_001",
    )

    approvals = ApprovalRepository(connection).list_by_investigation(investigation.id)
    fetched_report = ReportRepository(connection).get_by_investigation(investigation.id)

    assert approvals == [approval]
    assert fetched_report == report
