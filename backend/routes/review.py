from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from controllers.auth import require_user
from models.user import StoredUser
from models.review import ReviewCreate, ReviewUpdate, ReviewResponse, ReviewFeedResponse
from controllers.review import (
    create_review,
    get_reviews,
    get_review,
    update_review,
    delete_review,
    get_friend_feed,
)
from routes.photo import get_photo_bucket

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


@router.post("/", response_model=ReviewResponse)
async def create(
    review: ReviewCreate,
    current_user: Annotated[StoredUser, Depends(require_user)],
    bucket: Annotated[Any, Depends(get_photo_bucket)],
):
    return await create_review(review, current_user, bucket)


@router.get("/", response_model=list[ReviewResponse])
async def get_all(
    location_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
):
    return await get_reviews(location_id, user_id)


@router.get(
    "/friend-feed",
    response_model=ReviewFeedResponse,
    summary="Get paginated reviews from friends",
    description="Return the authenticated user's mutual friends' visible reviews, newest first.",
)
async def friend_feed(
    current_user: Annotated[StoredUser, Depends(require_user)],
    page: int = Query(default=1, ge=1),
):
    return await get_friend_feed(current_user, page=page)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_one(review_id: str):
    return await get_review(review_id)


@router.put("/{review_id}", response_model=ReviewResponse)
async def update(
    review_id: str,
    review: ReviewUpdate,
    current_user: Annotated[StoredUser, Depends(require_user)],
    bucket: Annotated[Any, Depends(get_photo_bucket)],
):
    return await update_review(review_id, review, current_user, bucket)


@router.delete("/{review_id}")
async def delete(
    review_id: str,
    current_user: Annotated[StoredUser, Depends(require_user)],
    bucket: Annotated[Any, Depends(get_photo_bucket)],
):
    return await delete_review(review_id, current_user, bucket)
