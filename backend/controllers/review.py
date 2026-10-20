from uuid import uuid4
from typing import Any

from fastapi import HTTPException

import database
from controllers.photo_storage import (
    PhotoNotFoundError,
    claim_photo,
    get_photo_owner,
    mark_photo_attached,
    mark_photo_unreferenced,
    release_photo_claim,
)

from models.review import ReviewCreate, ReviewUpdate
from models.user import StoredUser, UserRole


MAX_REVIEW_PHOTOS = 3
PHOTO_REFERENCE_CLAIM = "in_use"


def _validate_photo_id_list(photo_ids: list[str] | None) -> list[str]:
    if photo_ids is None:
        return []
    if len(photo_ids) > MAX_REVIEW_PHOTOS:
        raise HTTPException(
            status_code=422,
            detail=f"A review can include at most {MAX_REVIEW_PHOTOS} photos.",
        )
    if len(photo_ids) != len(set(photo_ids)):
        raise HTTPException(status_code=422, detail="Duplicate photo IDs are not allowed.")
    return photo_ids


async def _claim_photo_ids(photo_ids: list[str], bucket: Any | None) -> list[str]:
    """Claim photo metadata in stable order so cleanup cannot delete mid-write."""
    claimed: list[str] = []
    try:
        for photo_id in sorted(set(photo_ids)):
            if not await claim_photo(photo_id, PHOTO_REFERENCE_CLAIM, bucket=bucket):
                try:
                    await get_photo_owner(photo_id, bucket=bucket)
                except PhotoNotFoundError:
                    # Missing IDs are reported by attachment validation; stale
                    # references can still be removed or their review deleted.
                    continue
                raise HTTPException(
                    status_code=409,
                    detail="A photo is being changed or cleaned up. Please retry.",
                )
            claimed.append(photo_id)
        return claimed
    except Exception:
        for photo_id in reversed(claimed):
            await release_photo_claim(photo_id, PHOTO_REFERENCE_CLAIM, bucket=bucket)
        raise


async def _release_photo_ids(photo_ids: list[str], bucket: Any | None) -> None:
    for photo_id in reversed(photo_ids):
        await release_photo_claim(photo_id, PHOTO_REFERENCE_CLAIM, bucket=bucket)


async def _validate_photo_attachments(
    photo_ids: list[str] | None,
    owner_uuid: str,
    *,
    review_uuid: str | None = None,
    bucket: Any | None = None,
) -> None:
    for photo_id in _validate_photo_id_list(photo_ids):
        try:
            photo_owner = await get_photo_owner(photo_id, bucket=bucket)
        except PhotoNotFoundError as error:
            raise HTTPException(
                status_code=400,
                detail="One or more photo IDs are unavailable.",
            ) from error

        if photo_owner != owner_uuid:
            raise HTTPException(
                status_code=403,
                detail="You can only attach photos that you uploaded.",
            )

        query: dict[str, object] = {"photo_ids": photo_id}
        if review_uuid is not None:
            query["uuid"] = {"$ne": review_uuid}
        already_attached = await database.reviews_collection.find_one(query, {"_id": 1})
        if already_attached is not None:
            raise HTTPException(
                status_code=400,
                detail="A photo can only be attached to one review.",
            )


async def create_review(
    review: ReviewCreate,
    current_user: StoredUser,
    bucket: Any | None = None,
):
    review_data = review.model_dump()
    current_user_id = current_user.uuid
    review_data["user_id"] = current_user_id
    review_data["uuid"] = str(uuid4())

    photo_ids = review_data.get("photo_ids")
    if photo_ids:
        if current_user_id is None:
            raise HTTPException(status_code=401, detail="Bearer authentication is required to attach photos.")
        photo_ids = _validate_photo_id_list(photo_ids)
        claimed = await _claim_photo_ids(photo_ids, bucket)
        try:
            await _validate_photo_attachments(photo_ids, current_user_id, bucket=bucket)
            await database.reviews_collection.insert_one(review_data)
            for photo_id in photo_ids:
                await mark_photo_attached(photo_id, bucket=bucket)
        finally:
            await _release_photo_ids(claimed, bucket)
    else:
        await database.reviews_collection.insert_one(review_data)

    return review_data


async def get_reviews(location_id: str | None = None, user_id: str | None = None):
    reviews = []

    query = {
        key: value
        for key, value in (
            ("location_id", location_id),
            ("user_id", user_id),
        )
        if value
    }
    query["visibility"] = {"$nin": ["hidden", "removed"]}
    cursor = database.reviews_collection.find(query)

    async for review in cursor:
        review.pop("_id", None)
        reviews.append(review)

    return reviews


async def get_review(review_id: str):
    review = await database.reviews_collection.find_one({
        "uuid": review_id,
        "visibility": {"$nin": ["hidden", "removed"]},
    })

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    review.pop("_id", None)

    return review


async def update_review(
    review_id: str,
    review: ReviewUpdate,
    current_user: StoredUser,
    bucket: Any | None = None,
):
    update_data = review.model_dump(exclude_unset=True)
    current_user_id = current_user.uuid
    existing_review = await database.reviews_collection.find_one({"uuid": review_id})
    if existing_review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if (
        existing_review.get("user_id") != current_user_id
        and current_user.role not in (UserRole.MODERATOR, UserRole.ADMIN)
    ):
        raise HTTPException(status_code=403, detail="You can only modify your own reviews.")

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    if "photo_ids" in update_data:
        if current_user_id is None:
            raise HTTPException(status_code=401, detail="Bearer authentication is required to modify review photos.")
        if existing_review.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You can only modify photos on your own reviews.")
        requested_photo_ids = update_data["photo_ids"]
        new_photo_ids = _validate_photo_id_list(requested_photo_ids)
        old_photo_ids = existing_review.get("photo_ids") or []
        claimed = await _claim_photo_ids(list(set(old_photo_ids) | set(new_photo_ids)), bucket)
        try:
            await _validate_photo_attachments(
                new_photo_ids,
                current_user_id,
                review_uuid=review_id,
                bucket=bucket,
            )
            removed_photo_ids = list(set(old_photo_ids) - set(new_photo_ids))
            # Set the grace timestamp before removing references. The review still
            # protects these photos if the following database write fails.
            for photo_id in removed_photo_ids:
                await mark_photo_unreferenced(photo_id, bucket=bucket)
            result = await database.reviews_collection.update_one(
                {"uuid": review_id},
                {"$set": update_data}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Review not found")

            for photo_id in new_photo_ids:
                await mark_photo_attached(photo_id, bucket=bucket)
            return await get_review(review_id)
        finally:
            await _release_photo_ids(claimed, bucket)

    result = await database.reviews_collection.update_one(
        {"uuid": review_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return await get_review(review_id)


async def delete_review(
    review_id: str,
    current_user: StoredUser,
    bucket: Any | None = None,
):
    review = await database.reviews_collection.find_one({"uuid": review_id})
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if (
        review.get("user_id") != current_user.uuid
        and current_user.role not in (UserRole.MODERATOR, UserRole.ADMIN)
    ):
        raise HTTPException(status_code=403, detail="You can only delete your own reviews.")
    photo_ids = review.get("photo_ids") or []
    claimed = await _claim_photo_ids(photo_ids, bucket) if photo_ids else []
    try:
        for photo_id in photo_ids:
            await mark_photo_unreferenced(photo_id, bucket=bucket)
        result = await database.reviews_collection.delete_one({"uuid": review_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
    finally:
        await _release_photo_ids(claimed, bucket)

    return {
        "message": "Review deleted successfully"
    }
