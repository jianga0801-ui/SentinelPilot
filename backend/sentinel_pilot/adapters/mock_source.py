import json
from datetime import timedelta
from pathlib import Path

from pydantic import ValidationError

from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.core.models import Alert
from sentinel_pilot.runtime_resources import resource_path


class MockAlertSource:
    synthetic_count = 240

    def __init__(self, alerts_dir: Path | None = None) -> None:
        self.alerts_dir = alerts_dir or resource_path("examples", "alerts")

    def list_alerts(self) -> list[Alert]:
        alerts = [self._load_alert(path) for path in sorted(self.alerts_dir.glob("*.json"))]
        alerts.extend(self._synthetic_alerts(alerts))
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

    def _synthetic_alerts(self, seed_alerts: list[Alert]) -> list[Alert]:
        if not seed_alerts:
            return []

        seeds = [alert for alert in seed_alerts if alert.id.startswith("alert_")]
        if len(seeds) < 6:
            return []

        hosts = [
            "linux-web-01",
            "linux-web-02",
            "win-edr-03",
            "db-prod-01",
            "api-gateway-02",
            "jump-host-01",
            "k8s-node-04",
            "vpn-edge-01",
        ]
        users = ["admin", "root", "svc-backup", "oracle", "deploy", "finance_ops", "hr_admin"]
        src_ips = [
            "203.0.113.10",
            "198.51.100.23",
            "198.51.100.99",
            "10.10.8.45",
            "10.20.4.18",
            "172.16.2.77",
            "192.0.2.44",
        ]
        vendors = [
            ("Wazuh", "Wazuh Manager", "siem"),
            ("Elastic", "Elastic Security", "siem"),
            ("Microsoft", "Defender for Endpoint", "edr"),
            ("Suricata", "Suricata IDS", "ids"),
            ("Nginx", "Nginx WAF", "waf"),
            ("H3C", "IPS", "ips"),
        ]

        generated: list[Alert] = []
        base_time = max(alert.created_at for alert in seeds)
        for index in range(self.synthetic_count):
            seed = seeds[index % len(seeds)]
            vendor, product, device_type = vendors[index % len(vendors)]
            host = hosts[index % len(hosts)]
            username = users[index % len(users)]
            src_ip = src_ips[index % len(src_ips)]
            created_at = base_time + timedelta(minutes=index + 1)
            start_at = created_at - timedelta(minutes=15)
            severity = ["low", "medium", "high", "critical"][index % 4]
            if seed.id == "alert_false_positive_001":
                severity = "low"

            payload = seed.model_dump(mode="json")
            payload.update(
                {
                    "id": f"alert_sample_{index + 1:03d}",
                    "source": "mock-expanded",
                    "vendor": vendor,
                    "product": product,
                    "device_type": device_type,
                    "severity": severity,
                    "status": ["new", "investigating", "closed"][index % 3],
                    "entities": {
                        **seed.entities,
                        "src_ip": src_ip,
                        "dst_host": host,
                        "host": host,
                        "username": username,
                    },
                    "time_range": {
                        "start": start_at.isoformat().replace("+00:00", "Z"),
                        "end": created_at.isoformat().replace("+00:00", "Z"),
                    },
                    "created_at": created_at.isoformat().replace("+00:00", "Z"),
                    "raw": {
                        **seed.raw,
                        "synthetic": True,
                        "sample_index": index + 1,
                        "vendor": vendor,
                        "product": product,
                        "asset_owner": ["platform", "finance", "r_and_d", "security"][index % 4],
                        "business_unit": ["core", "payment", "identity", "commerce"][index % 4],
                        "confidence": ["medium", "high", "high", "critical"][index % 4],
                    },
                }
            )
            generated.append(self.normalize(payload))
        return generated
