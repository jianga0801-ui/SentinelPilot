from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel

from sentinel_pilot.agent import tools
from sentinel_pilot.storage.repositories import TimelineRepository


class ToolRegistry:
    def __init__(
        self,
        tool_map: dict[str, Callable[..., Any]],
        timeline: TimelineRepository | None = None,
    ) -> None:
        self._tools = dict(tool_map)
        self._timeline = timeline

    @classmethod
    def default(cls, timeline: TimelineRepository | None = None) -> "ToolRegistry":
        return cls(
            {
                "get_alert": tools.get_alert,
                "lookup_threat_intel": tools.lookup_threat_intel,
                "map_mitre_attack": tools.map_mitre_attack,
                "search_knowledge_base": tools.search_knowledge_base,
                "search_logs": tools.search_logs,
                "write_report": tools.write_report,
            },
            timeline=timeline,
        )

    def names(self) -> list[str]:
        return sorted(self._tools)

    def get(self, name: str) -> Callable[..., Any]:
        try:
            return self._tools[name]
        except KeyError as exc:
            raise KeyError(f"Unknown tool: {name}") from exc

    def call(self, name: str, investigation_id: str | None = None, **kwargs: Any) -> Any:
        tool = self.get(name)
        call_time = datetime.now(UTC)
        if investigation_id is not None and self._timeline is not None:
            self._timeline.add(
                investigation_id=investigation_id,
                type="tool_call",
                title=f"Call {name}",
                content=f"Calling tool {name}.",
                tool_name=name,
                input=_serialize(kwargs),
                created_at=call_time,
            )

        result = tool(**kwargs)

        if investigation_id is not None and self._timeline is not None:
            self._timeline.add(
                investigation_id=investigation_id,
                type="tool_result",
                title=f"{name} result",
                content=f"Tool {name} returned successfully.",
                tool_name=name,
                output=_serialize_output(result),
                created_at=call_time + timedelta(microseconds=1),
            )
        return result


def _serialize(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, tuple):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


def _serialize_output(value: Any) -> dict[str, Any]:
    serialized = _serialize(value)
    if isinstance(serialized, dict):
        return serialized
    if isinstance(serialized, list):
        return {"items": serialized, "count": len(serialized)}
    return {"value": serialized}
