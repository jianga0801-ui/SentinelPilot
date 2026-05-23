import json
from pathlib import Path

import pytest

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Alert

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_sample_alerts_parse_into_alert_model():
    alert_paths = sorted((PROJECT_ROOT / "examples" / "alerts").glob("*.json"))

    alerts = [Alert.model_validate_json(path.read_text(encoding="utf-8")) for path in alert_paths]

    assert len(alerts) == 6
    assert {alert.id for alert in alerts} == {
        "alert_bruteforce_001",
        "alert_powershell_001",
        "alert_webshell_001",
        "alert_malicious_domain_001",
        "alert_lateral_movement_001",
        "alert_false_positive_001",
    }


def test_each_sample_alert_has_related_logs():
    alert_ids = {
        Alert.model_validate_json(path.read_text(encoding="utf-8")).id
        for path in (PROJECT_ROOT / "examples" / "alerts").glob("*.json")
    }
    log_ids = set()
    with (PROJECT_ROOT / "examples" / "logs" / "events.jsonl").open(encoding="utf-8") as file:
        for line in file:
            log_ids.add(json.loads(line)["alert_id"])

    assert alert_ids <= log_ids


def test_mock_alert_source_lists_normalized_alerts():
    source = MockAlertSource(PROJECT_ROOT / "examples" / "alerts")

    alerts = source.list_alerts()

    assert len(alerts) == 6
    assert all(isinstance(alert, Alert) for alert in alerts)
    assert alerts[0].id == "alert_bruteforce_001"


def test_mock_alert_source_gets_alert_by_id():
    source = MockAlertSource(PROJECT_ROOT / "examples" / "alerts")

    alert = source.get_alert("alert_bruteforce_001")

    assert alert.title == "SSH brute force against admin"
    assert alert.entities["src_ip"] == "203.0.113.10"


def test_mock_alert_source_raises_typed_error_for_missing_alert():
    source = MockAlertSource(PROJECT_ROOT / "examples" / "alerts")

    with pytest.raises(SentinelPilotError) as exc_info:
        source.get_alert("missing")

    assert exc_info.value.code == "not_found"
