import json
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from sentinel_pilot.adapters.mock_source import MockAlertSource
from sentinel_pilot.agent.orchestrator import InvestigationOrchestrator
from sentinel_pilot.evals.graders import SCORE_KEYS, grade_case
from sentinel_pilot.runtime_resources import resource_path
from sentinel_pilot.services.approval_service import ApprovalService
from sentinel_pilot.services.report_service import ReportService
from sentinel_pilot.storage.database import create_connection, init_database
from sentinel_pilot.storage.repositories import (
    ApprovalRepository,
    InvestigationRepository,
    ReportRepository,
    TimelineRepository,
)

DEFAULT_DATASET_PATH = resource_path("evals", "datasets", "initial_cases.json")


class EvalCaseResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    passed: bool
    scores: dict[str, bool]
    notes: list[str] = Field(default_factory=list)


class EvalRunResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: str
    status: str
    summary: dict[str, int]
    cases: list[EvalCaseResult]


def run_eval_dataset(dataset_path: Path | None = None) -> EvalRunResult:
    path = dataset_path or DEFAULT_DATASET_PATH
    cases = json.loads(path.read_text(encoding="utf-8"))
    results = [_run_case(case) for case in cases]
    passed = sum(1 for result in results if result.passed)
    return EvalRunResult(
        run_id=f"eval_{uuid4().hex[:12]}",
        status="completed",
        summary={
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
        },
        cases=results,
    )


def _run_case(case: dict) -> EvalCaseResult:
    connection = create_connection(":memory:")
    init_database(connection)
    alert_source = MockAlertSource()
    investigations = InvestigationRepository(connection)
    approvals = ApprovalRepository(connection)
    timeline = TimelineRepository(connection)
    reports = ReportRepository(connection)

    alert = alert_source.get_alert(case["alert_id"])
    investigation = investigations.create(
        alert_id=alert.id,
        severity=alert.severity,
        category=alert.category,
    )
    result = InvestigationOrchestrator(
        investigations=investigations,
        timeline=timeline,
        approvals=approvals,
    ).run(investigation.id)

    if case["requires_approval"]:
        pending = approvals.list_by_investigation(result.id)
        if pending:
            ApprovalService(
                investigations=investigations,
                approvals=approvals,
                timeline=timeline,
            ).decide(pending[0].id, "approved", "Approved for eval simulation.")

    report = ReportService(
        alert_source=alert_source,
        investigations=investigations,
        approvals=approvals,
        reports=reports,
        timeline=timeline,
    ).get_or_create(result.id)
    final = investigations.get(result.id)
    if final is None:
        raise RuntimeError(f"Investigation disappeared during eval: {result.id}")

    scores, notes = grade_case(
        case=case,
        investigation=final,
        timeline=timeline.list_by_investigation(result.id),
        approvals=approvals.list_by_investigation(result.id),
        report=report,
    )
    return EvalCaseResult(
        case_id=case["case_id"],
        passed=all(scores[key] for key in SCORE_KEYS),
        scores=scores,
        notes=notes,
    )


def main() -> None:
    result = run_eval_dataset()
    print(f"Total: {result.summary['total']}")
    print(f"Passed: {result.summary['passed']}")
    print(f"Failed: {result.summary['failed']}")


if __name__ == "__main__":
    main()
