from sentinel_pilot.core.models import Approval, Investigation, Report, TimelineItem

SCORE_KEYS = [
    "severity_match",
    "category_match",
    "mitre_match",
    "tool_call_match",
    "approval_match",
    "report_evidence_match",
]


def grade_case(
    case: dict,
    investigation: Investigation,
    timeline: list[TimelineItem],
    approvals: list[Approval],
    report: Report,
) -> tuple[dict[str, bool], list[str]]:
    scores = {
        "severity_match": investigation.severity == case["expected_severity"],
        "category_match": investigation.category == case["expected_category"],
        "mitre_match": sorted(investigation.mitre_techniques) == sorted(case["expected_mitre"]),
        "tool_call_match": _required_tools_called(timeline),
        "approval_match": _approval_matches(case, approvals),
        "report_evidence_match": "evt_" in report.content,
    }
    notes = [
        f"{key} failed"
        for key in SCORE_KEYS
        if not scores[key]
    ]
    return scores, notes


def _required_tools_called(timeline: list[TimelineItem]) -> bool:
    called_tools = {
        item.tool_name
        for item in timeline
        if item.type == "tool_call" and item.tool_name is not None
    }
    return {
        "get_alert",
        "search_logs",
        "map_mitre_attack",
        "search_knowledge_base",
    } <= called_tools


def _approval_matches(case: dict, approvals: list[Approval]) -> bool:
    if not case["requires_approval"]:
        return approvals == []
    return any(
        approval.action_type == case["expected_approval_type"]
        for approval in approvals
    )
