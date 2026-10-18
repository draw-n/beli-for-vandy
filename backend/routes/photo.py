"""Authenticated photo upload and review-backed public retrieval routes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from starlette.responses import Response

import database
from controllers.auth import require_user
from models.user import StoredUser
from controllers.photo_storage import (
    MAX_UPLOAD_BYTES,
    InvalidPhotoError,
    PhotoNotFoundError,
    PhotoTooLargeError,
    retrieve_photo,
    store_photo,
)


router = APIRouter(prefix="/photos", tags=["Photos"])


async def get_photo_bucket() -> Any:
    """Provide the configured GridFS bucket; overridable in isolated tests."""
    return AsyncIOMotorGridFSBucket(database.db, bucket_name="photos")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: Annotated[UploadFile, File(...)],
    user: Annotated[StoredUser, Depends(require_user)],
    bucket: Annotated[Any, Depends(get_photo_bucket)],
) -> dict[str, str]:
    """Upload one optimized photo as a private pending attachment."""
    try:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()

    try:
        photo_id = await store_photo(data, owner_uuid=user.uuid, bucket=bucket)
    except PhotoTooLargeError as error:
        raise HTTPException(status_code=413, detail=str(error)) from error
    except InvalidPhotoError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {"uuid": photo_id}


@router.get("/{photo_id}")
async def get_public_photo(
    photo_id: str,
    bucket: Annotated[Any, Depends(get_photo_bucket)],
) -> Response:
    """Return a photo only when a saved review references it under its owner."""
    try:
        photo = await retrieve_photo(photo_id, bucket=bucket)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error

    if photo.owner_uuid is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    review = await database.reviews_collection.find_one(
        {
            "photo_ids": photo_id,
            "user_id": photo.owner_uuid,
            "visibility": {"$nin": ["hidden", "removed"]},
        },
        {"_id": 1},
    )
    if review is None or photo.status in {"hidden", "removed"}:
        raise HTTPException(status_code=404, detail="Photo not found")

    return Response(content=photo.data, media_type=photo.content_type)
