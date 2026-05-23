from fastapi import APIRouter, Request

from sentinel_pilot.core.errors import SentinelPilotError
from sentinel_pilot.evals.runner import EvalRunResult, run_eval_dataset

router = APIRouter(prefix="/api/evals", tags=["evals"])


@router.post("/run", response_model=EvalRunResult)
def run_evals(request: Request) -> EvalRunResult:
    result = run_eval_dataset()
    request.app.state.eval_runs[result.run_id] = result
    return result


@router.get("/{run_id}", response_model=EvalRunResult)
def get_eval_run(request: Request, run_id: str) -> EvalRunResult:
    try:
        return request.app.state.eval_runs[run_id]
    except KeyError as exc:
        raise SentinelPilotError(
            code="not_found",
            message=f"Eval run not found: {run_id}",
            status_code=404,
        ) from exc
