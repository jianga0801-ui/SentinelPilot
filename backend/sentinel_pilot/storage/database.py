import sqlite3
from pathlib import Path


def create_connection(database: Path | str) -> sqlite3.Connection:
    database_path = str(database)
    if database_path.startswith("sqlite:///"):
        database_path = database_path.removeprefix("sqlite:///")
    if database_path != ":memory:":
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_database(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS investigations (
            id TEXT PRIMARY KEY,
            alert_id TEXT NOT NULL,
            status TEXT NOT NULL,
            summary TEXT NOT NULL,
            severity TEXT NOT NULL,
            category TEXT NOT NULL,
            mitre_techniques TEXT NOT NULL,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS timeline_items (
            id TEXT PRIMARY KEY,
            investigation_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_name TEXT,
            input TEXT,
            output TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (investigation_id) REFERENCES investigations(id)
        );

        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            investigation_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL,
            comment TEXT,
            created_at TEXT NOT NULL,
            decided_at TEXT,
            FOREIGN KEY (investigation_id) REFERENCES investigations(id)
        );

        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            investigation_id TEXT NOT NULL,
            format TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (investigation_id) REFERENCES investigations(id)
        );
        """
    )
    connection.commit()
