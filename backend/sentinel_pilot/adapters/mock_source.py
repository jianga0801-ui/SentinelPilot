import json
from pathlib import Path

from pydantic import ValidationError

from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Alert


class MockAlertSource:
    def __init__(self, alerts_dir: Path | None = None) -> None:
        self.alerts_dir = alerts_dir or Path(__file__).resolve().parents[3] / "examples" / "alerts"

    def list_alerts(self) -> list[Alert]:
        alerts = [self._load_alert(path) for path in sorted(self.alerts_dir.glob("*.json"))]
        return sorted(alerts, key=lambda alert: alert.created_at)

    def get_alert(self, alert_id: str) -> Alert:
        for alert in self.list_alerts():
            if alert.id == alert_id:
                return alert
        raise SentinelPilotError(
            code="not_found",
            message=f"Alert not found: {alert_id}",
            status_code=404,
        )

    def normalize(self, raw_alert: dict) -> Alert:
        try:
            return Alert.model_validate(raw_alert)
        except ValidationError as exc:
            raise SentinelPilotError(code="invalid_alert", message="Invalid alert record.") from exc

    def get_related_events(self, alert: Alert) -> list[dict]:
        logs_path = self.alerts_dir.parents[0] / "logs" / "events.jsonl"
        if not logs_path.exists():
            return []
        events: list[dict] = []
        with logs_path.open(encoding="utf-8") as file:
            for line in file:
                event = json.loads(line)
                if event.get("alert_id") == alert.id:
                    events.append(event)
        return events

    def get_device_metadata(self) -> dict:
        return {
            "source": "mock",
            "vendor": None,
            "product": "SentinelPilot sample data",
            "device_type": "mock",
        }

    def _load_alert(self, path: Path) -> Alert:
        try:
            raw_alert = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise SentinelPilotError(
                code="invalid_alert",
                message=f"Invalid JSON: {path.name}",
            ) from exc
        return self.normalize(raw_alert)
