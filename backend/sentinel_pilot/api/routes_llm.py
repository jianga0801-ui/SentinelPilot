from typing import Any

from fastapi import APIRouter

from sentinel_pilot.config import settings
from sentinel_pilot.llm.factory import get_llm_status

router = APIRouter(prefix="/api/integrations/llm", tags=["Integrations"])


@router.get("/status")
def get_status() -> dict[str, Any]:
    return get_llm_status(settings)
