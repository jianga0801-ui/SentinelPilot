from pathlib import Path
from typing import Protocol

from sentinel_pilot.core.models import Alert
from sentinel_pilot.runtime_resources import resource_path


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
    return resource_path("examples")
