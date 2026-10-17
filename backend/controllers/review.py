from uuid import uuid4
from typing import Any

from fastapi import HTTPException

import database
from controllers.photo_storage import PhotoNotFoundError, get_photo_owner

from models.review import ReviewCreate, ReviewUpdate


MAX_REVIEW_PHOTOS = 3


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
    current_user_id: str | None = None,
    bucket: Any | None = None,
):
    review_data = review.model_dump()
    review_data["uuid"] = str(uuid4())

    photo_ids = review_data.get("photo_ids")
    if photo_ids:
        if current_user_id is None:
            raise HTTPException(status_code=401, detail="Bearer authentication is required to attach photos.")
        if review.user_id != current_user_id:
            raise HTTPException(status_code=403, detail="You can only attach photos to your own reviews.")
        await _validate_photo_attachments(
            photo_ids, current_user_id, bucket=bucket
        )

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
    cursor = database.reviews_collection.find(query)

    async for review in cursor:
        review.pop("_id", None)
        reviews.append(review)

    return reviews


async def get_review(review_id: str):
    review = await database.reviews_collection.find_one({
        "uuid": review_id
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
    current_user_id: str | None = None,
    bucket: Any | None = None,
):
    update_data = review.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    if "photo_ids" in update_data:
        if current_user_id is None:
            raise HTTPException(status_code=401, detail="Bearer authentication is required to modify review photos.")
        existing_review = await database.reviews_collection.find_one({"uuid": review_id})
        if existing_review is None:
            raise HTTPException(status_code=404, detail="Review not found")
        if existing_review.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You can only modify photos on your own reviews.")
        await _validate_photo_attachments(
            update_data["photo_ids"],
            current_user_id,
            review_uuid=review_id,
            bucket=bucket,
        )

    result = await database.reviews_collection.update_one(
        {"uuid": review_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    return await get_review(review_id)


async def delete_review(review_id: str):
    result = await database.reviews_collection.delete_one({
        "uuid": review_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    return {
        "message": "Review deleted successfully"
    }
