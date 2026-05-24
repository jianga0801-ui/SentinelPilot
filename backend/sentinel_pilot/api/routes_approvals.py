from typing import Annotated

from fastapi import APIRouter, Depends, Query

from sentinel_pilot.api.dependencies import get_approval_service
from sentinel_pilot.api.schemas import (
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ApprovalListItem,
    ApprovalListResponse,
)
from sentinel_pilot.services.approval_service import ApprovalService

router = APIRouter(tags=["approvals"])


@router.get("/api/approvals", response_model=ApprovalListResponse)
def list_all_approvals(
    service: Annotated[ApprovalService, Depends(get_approval_service)],
    limit: int = Query(default=100, ge=1, le=500),
) -> ApprovalListResponse:
    return ApprovalListResponse(
        items=[
            ApprovalListItem(
                id=approval.id,
                investigation_id=approval.investigation_id,
                action_type=approval.action_type,
                target=approval.target,
                risk_level=approval.risk_level,
                reason=approval.reason,
                status=approval.status,
                comment=approval.comment,
                created_at=approval.created_at,
                decided_at=approval.decided_at,
            )
            for approval in service.list_recent(limit=limit)
        ]
    )


@router.get(
    "/api/investigations/{investigation_id}/approvals",
    response_model=ApprovalListResponse,
)
def list_approvals(
    investigation_id: str,
    service: Annotated[ApprovalService, Depends(get_approval_service)],
) -> ApprovalListResponse:
    return ApprovalListResponse(
        items=[
            ApprovalListItem(
                id=approval.id,
                investigation_id=approval.investigation_id,
                action_type=approval.action_type,
                target=approval.target,
                risk_level=approval.risk_level,
                reason=approval.reason,
                status=approval.status,
                comment=approval.comment,
                created_at=approval.created_at,
                decided_at=approval.decided_at,
            )
            for approval in service.list_by_investigation(investigation_id)
        ]
    )


@router.post(
    "/api/approvals/{approval_id}/decision",
    response_model=ApprovalDecisionResponse,
)
def decide_approval(
    approval_id: str,
    request: ApprovalDecisionRequest,
    service: Annotated[ApprovalService, Depends(get_approval_service)],
) -> ApprovalDecisionResponse:
    approval = service.decide(approval_id, request.decision, request.comment)
    return ApprovalDecisionResponse(id=approval.id, status=approval.status)
