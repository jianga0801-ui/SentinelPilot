from fastapi.testclient import TestClient

from sentinel_pilot.evals.runner import run_eval_dataset
from sentinel_pilot.main import app


def test_eval_runner_passes_initial_dataset():
    result = run_eval_dataset()

    assert result.summary == {"total": 6, "passed": 6, "failed": 0}
    assert len(result.cases) == 6
    assert all(case.passed for case in result.cases)
    assert all(case.notes == [] for case in result.cases)
    assert all(
        set(case.scores) == {
            "severity_match",
            "category_match",
            "mitre_match",
            "tool_call_match",
            "approval_match",
            "report_evidence_match",
        }
        for case in result.cases
    )


def test_eval_api_run_and_get_result():
    with TestClient(app) as client:
        response = client.post("/api/evals/run")
        body = response.json()
        fetched = client.get(f"/api/evals/{body['run_id']}")

    assert response.status_code == 200
    assert body["status"] == "completed"
    assert body["summary"] == {"total": 6, "passed": 6, "failed": 0}
    assert fetched.status_code == 200
    assert fetched.json()["run_id"] == body["run_id"]
    assert len(fetched.json()["cases"]) == 6


def test_get_missing_eval_run_returns_standard_error():
    with TestClient(app) as client:
        response = client.get("/api/evals/missing")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Eval run not found: missing",
        }
    }
