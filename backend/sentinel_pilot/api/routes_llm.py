from typing import Any

from fastapi import APIRouter, Request

from sentinel_pilot.llm.factory import get_llm_status

router = APIRouter(prefix="/api/integrations/llm", tags=["Integrations"])


@router.get("/status")
def get_status(request: Request) -> dict[str, Any]:
    return get_llm_status(request.app.state.runtime_settings)
