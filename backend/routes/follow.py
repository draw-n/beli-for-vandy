from fastapi import APIRouter

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
async def create(follow: FollowCreate):
    return await create_follow(follow)


@router.get("/", response_model=list[FollowResponse])
async def get_all():
    return await get_follows()


@router.get("/{follow_id}", response_model=FollowResponse)
async def get_one(follow_id: str):
    return await get_follow(follow_id)


@router.put("/{follow_id}", response_model=FollowResponse)
async def update(follow_id: str, follow: FollowUpdate):
    return await update_follow(follow_id, follow)


@router.delete("/{follow_id}")
async def delete(follow_id: str):
    return await delete_follow(follow_id)
