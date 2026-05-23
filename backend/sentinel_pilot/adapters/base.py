from pathlib import Path
from typing import Protocol

from sentinel_pilot.core.models import Alert


class SecurityDeviceAdapter(Protocol):
    def list_alerts(self) -> list[Alert]:
        ...

    def get_alert(self, alert_id: str) -> Alert:
        ...

    def normalize(self, raw_alert: dict) -> Alert:
        ...

    def get_related_events(self, alert: Alert) -> list[dict]:
        ...

    def get_device_metadata(self) -> dict:
        ...


def default_examples_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "examples"
