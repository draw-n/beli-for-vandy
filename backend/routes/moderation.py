from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from starlette.responses import Response

from controllers.auth import require_admin, require_moderator, require_user
from controllers.photo_storage import PhotoNotFoundError, retrieve_photo
from controllers.moderation import (
    InvalidModerationActionError,
    ModerationController,
    TargetNotFoundError,
)
from database import db
import database
from models.moderation import (
    AccountBlockCreate,
    BulkModerationRequest,
    ModerationReason,
    ReportCreate,
    ReportResolution,
    ReportTargetType,
    SuspensionRequest,
)
from models.user import StoredUser
from routes.photo import get_photo_bucket


router = APIRouter(tags=["Moderation"])


def get_moderation_controller() -> ModerationController:
    return ModerationController(db)


def _error(error: Exception) -> HTTPException:
    if isinstance(error, TargetNotFoundError):
        return HTTPException(status_code=404, detail="Moderation target not found")
    return HTTPException(status_code=409, detail=str(error))


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: Annotated[StoredUser, Depends(require_user)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
):
    try:
        return await controller.create_report(payload, current_user.uuid)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.get("/moderation/queue")
async def moderation_queue(
    current_user: Annotated[StoredUser, Depends(require_moderator)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    target_type: ReportTargetType | None = None,
    reason: str | None = None,
    newest_first: bool = False,
):
    return await controller.queue(
        page=page, page_size=page_size, target_type=target_type,
        reason=reason, newest_first=newest_first,
    )


@router.get("/moderation/reports/{report_id}")
async def get_report(
    report_id: str,
    current_user: Annotated[StoredUser, Depends(require_moderator)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
):
    try:
        return await controller.get_report(report_id)
    except TargetNotFoundError as error:
        raise _error(error) from error


@router.post("/moderation/reports/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    payload: ReportResolution,
    current_user: Annotated[StoredUser, Depends(require_moderator)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
):
    try:
        return await controller.resolve_report(report_id, payload, current_user.uuid)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


async def _moderate_review(
    review_id: str,
    visibility: str,
    payload: ModerationReason,
    current_user: StoredUser,
    controller: ModerationController,
):
    try:
        return await controller.moderate_review(review_id, visibility, current_user.uuid, payload.reason)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.post("/moderation/reviews/{review_id}/hide")
async def hide_review(review_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_review(review_id, "hidden", payload, current_user, controller)


@router.post("/moderation/reviews/{review_id}/restore")
async def restore_review(review_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_review(review_id, "public", payload, current_user, controller)


@router.post("/moderation/reviews/{review_id}/remove")
async def remove_review(review_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_review(review_id, "removed", payload, current_user, controller)


@router.post("/moderation/reviews/bulk")
async def bulk_review_moderation(
    payload: BulkModerationRequest,
    current_user: Annotated[StoredUser, Depends(require_moderator)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
):
    visibility = {"hide": "hidden", "restore": "public", "remove": "removed"}.get(payload.action.value)
    if visibility is None:
        raise HTTPException(status_code=422, detail="Unsupported bulk review action")
    results = []
    for review_id in payload.target_ids:
        results.append(await _moderate_review(review_id, visibility, ModerationReason(reason=payload.reason), current_user, controller))
    return {"items": results}


async def _moderate_photo(photo_id: str, photo_status: str, payload: ModerationReason, current_user: StoredUser, controller: ModerationController):
    try:
        return await controller.moderate_photo(photo_id, photo_status, current_user.uuid, payload.reason)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.post("/moderation/photos/{photo_id}/hide")
async def hide_photo(photo_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_photo(photo_id, "hidden", payload, current_user, controller)


@router.post("/moderation/photos/{photo_id}/restore")
async def restore_photo(photo_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_photo(photo_id, "approved", payload, current_user, controller)


@router.post("/moderation/photos/{photo_id}/remove")
async def remove_photo(photo_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_moderator)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    return await _moderate_photo(photo_id, "removed", payload, current_user, controller)


@router.get("/moderation/photos/{photo_id}")
async def get_moderation_photo(
    photo_id: str,
    current_user: Annotated[StoredUser, Depends(require_moderator)],
    bucket: Annotated[object, Depends(get_photo_bucket)],
):
    reported = await database.reports_collection.find_one(
        {"target_type": "photo", "target_id": photo_id}
    )
    if reported is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    try:
        photo = await retrieve_photo(photo_id, bucket=bucket)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error
    return Response(content=photo.data, media_type=photo.content_type)


@router.post("/moderation/accounts/{user_id}/suspend")
async def suspend_account(user_id: str, payload: SuspensionRequest, current_user: Annotated[StoredUser, Depends(require_admin)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    try:
        return await controller.suspend_account(user_id, current_user.uuid, payload.reason, payload.suspended_until, payload.appeal_notes)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.post("/moderation/accounts/{user_id}/unsuspend")
async def unsuspend_account(user_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_admin)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    try:
        return await controller.unsuspend_account(user_id, current_user.uuid, payload.reason)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.post("/moderation/account-blocks", status_code=status.HTTP_201_CREATED)
async def create_account_block(payload: AccountBlockCreate, current_user: Annotated[StoredUser, Depends(require_admin)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    try:
        return await controller.create_block(payload, current_user.uuid)
    except InvalidModerationActionError as error:
        raise _error(error) from error


@router.delete("/moderation/account-blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account_block(block_id: str, payload: ModerationReason, current_user: Annotated[StoredUser, Depends(require_admin)], controller: Annotated[ModerationController, Depends(get_moderation_controller)]):
    try:
        await controller.delete_block(block_id, current_user.uuid, payload.reason)
    except TargetNotFoundError as error:
        raise _error(error) from error


@router.post("/moderation/content/{content_id}/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: str,
    payload: ModerationReason,
    target_type: ReportTargetType,
    current_user: Annotated[StoredUser, Depends(require_admin)],
    controller: Annotated[ModerationController, Depends(get_moderation_controller)],
):
    try:
        await controller.delete_content(target_type, content_id, current_user.uuid, payload.reason)
    except (TargetNotFoundError, InvalidModerationActionError) as error:
        raise _error(error) from error


@router.get("/admin/audit-log")
async def audit_log(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100), target_type: str | None = None, target_id: str | None = None, current_user: StoredUser = Depends(require_moderator), controller: ModerationController = Depends(get_moderation_controller)):
    return await controller.audit_log(page=page, page_size=page_size, target_type=target_type, target_id=target_id)
