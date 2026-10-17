from fastapi import APIRouter, Query

from models.review import ReviewCreate, ReviewUpdate, ReviewResponse
from controllers.review import (
    create_review,
    get_reviews,
    get_review,
    update_review,
    delete_review,
)

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


@router.post("/", response_model=ReviewResponse)
async def create(review: ReviewCreate):
    return await create_review(review)


@router.get("/", response_model=list[ReviewResponse])
async def get_all(
    location_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
):
    return await get_reviews(location_id, user_id)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_one(review_id: str):
    return await get_review(review_id)


@router.put("/{review_id}", response_model=ReviewResponse)
async def update(review_id: str, review: ReviewUpdate):
    return await update_review(review_id, review)


@router.delete("/{review_id}")
async def delete(review_id: str):
    return await delete_review(review_id)
