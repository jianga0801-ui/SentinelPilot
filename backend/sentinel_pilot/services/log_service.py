import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sentinel_pilot.agent.tools import DEFAULT_LOGS_PATH
from sentinel_pilot.runtime_resources import resource_path

DEFAULT_SERVICE_LOG_PATH = resource_path("logs", "app.log")

SECRET_PATTERN = re.compile(
    r"(?i)(api[_-]?key|secret|token|webhook[_-]?url)(=|:)\S+",
)


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _redact(value: str) -> str:
    return SECRET_PATTERN.sub(r"\1\2[REDACTED]", value)


class SecurityLogService:
    def __init__(self, logs_path: Path = DEFAULT_LOGS_PATH) -> None:
        self.logs_path = logs_path

    def search(
        self,
        alert_id: str | None = None,
        host: str | None = None,
        username: str | None = None,
        src_ip: str | None = None,
        event_type: str | None = None,
        severity: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        if not self.logs_path.exists():
            return {"items": [], "count": 0, "total": 0}

        start = _parse_datetime(start_time)
        end = _parse_datetime(end_time)
        matches: list[dict[str, Any]] = []

        with self.logs_path.open(encoding="utf-8") as file:
            for line in file:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                event_time = _parse_datetime(event.get("event_time"))
                if alert_id and event.get("alert_id") != alert_id:
                    continue
                if host and event.get("host") != host:
                    continue
                if username and event.get("username") != username:
                    continue
                if src_ip and event.get("src_ip") != src_ip:
                    continue
                if event_type and event.get("log_type") != event_type:
                    continue
                if severity and event.get("severity") != severity:
                    continue
                if start and event_time and event_time < start:
                    continue
                if end and event_time and event_time > end:
                    continue
                matches.append(event)

        matches.sort(key=lambda item: item.get("event_time", ""))
        bounded_limit = max(1, min(limit, 500))
        return {
            "items": matches[:bounded_limit],
            "count": min(len(matches), bounded_limit),
            "total": len(matches),
        }


class ServiceLogService:
    def __init__(self, log_path: Path = DEFAULT_SERVICE_LOG_PATH) -> None:
        self.log_path = log_path

    def list_recent(
        self,
        level: str | None = None,
        q: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        if not self.log_path.exists():
            return {"items": [], "count": 0}

        bounded_limit = max(1, min(limit, 500))
        lines = self.log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        items = [self._line_to_item(index, line) for index, line in enumerate(lines[-1000:])]
        if level:
            items = [item for item in items if item["level"] == level.upper()]
        if q:
            query = q.lower()
            items = [item for item in items if query in item["message"].lower()]
        items = items[-bounded_limit:]
        return {"items": items, "count": len(items)}

    def _line_to_item(self, index: int, line: str) -> dict[str, str | None]:
        upper = line.upper()
        level = "INFO"
        for candidate in ("ERROR", "WARNING", "WARN", "INFO", "DEBUG"):
            if candidate in upper:
                level = "WARNING" if candidate == "WARN" else candidate
                break
        return {
            "id": f"log_{index}",
            "level": level,
            "message": _redact(line),
            "created_at": None,
        }
