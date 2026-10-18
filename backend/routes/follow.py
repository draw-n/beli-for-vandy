from typing import Annotated
from fastapi import APIRouter, Depends
from controllers.auth import require_user
from models.user import StoredUser

from models.follow import FollowCreate, FollowUpdate, FollowResponse
from controllers.follow import (
    create_follow,
    get_follows,
    get_follow,
    update_follow,
    delete_follow,
)

router = APIRouter(
    prefix="/follows",
    tags=["Follows"]
)


@router.post("/", response_model=FollowResponse)
async def create(
    follow: FollowCreate,
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    return await create_follow(follow, current_user)


@router.get("/", response_model=list[FollowResponse])
async def get_all():
    return await get_follows()


@router.get("/{follow_id}", response_model=FollowResponse)
async def get_one(follow_id: str):
    return await get_follow(follow_id)


@router.put("/{follow_id}", response_model=FollowResponse)
async def update(
    follow_id: str,
    follow: FollowUpdate,
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    return await update_follow(follow_id, follow, current_user)


@router.delete("/{follow_id}")
async def delete(
    follow_id: str,
    current_user: Annotated[StoredUser, Depends(require_user)],
):
    return await delete_follow(follow_id, current_user)
