from uuid import uuid4

from fastapi import HTTPException

import database

from models.review import ReviewCreate, ReviewUpdate


async def create_review(review: ReviewCreate):
    review_data = review.model_dump()
    review_data["uuid"] = str(uuid4())

    await database.reviews_collection.insert_one(review_data)

    return review_data


async def get_reviews():
    reviews = []

    cursor = database.reviews_collection.find()

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
    review: ReviewUpdate
):
    update_data = review.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
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
