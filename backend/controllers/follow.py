from uuid import uuid4

from fastapi import HTTPException

import database

from models.follow import FollowCreate, FollowUpdate
from models.user import StoredUser



async def create_follow(follow: FollowCreate, current_user: StoredUser):
    follow_data = follow.model_dump()
    follow_data["from_user_id"] = current_user.uuid
    follow_data["uuid"] = str(uuid4())

    await database.follows_collection.insert_one(follow_data)

    return follow_data


async def get_follows():
    follows = []

    cursor = database.follows_collection.find()

    async for follow in cursor:
        follow.pop("_id", None)
        follows.append(follow)

    return follows


async def get_follow(follow_id: str):
    follow = await database.follows_collection.find_one({
        "uuid": follow_id
    })

    if not follow:
        raise HTTPException(
            status_code=404,
            detail="Follow not found"
        )

    follow.pop("_id", None)

    return follow


async def update_follow(
    follow_id: str,
    follow: FollowUpdate,
    current_user: StoredUser,
):
    existing = await database.follows_collection.find_one({"uuid": follow_id})
    if existing is None:
        raise HTTPException(status_code=404, detail="Follow not found")
    if existing.get("from_user_id") != current_user.uuid:
        raise HTTPException(status_code=403, detail="You can only modify your own follows")
    update_data = follow.model_dump(exclude_unset=True)
    update_data.pop("from_user_id", None)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    result = await database.follows_collection.update_one(
        {"uuid": follow_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Follow not found"
        )

    return await get_follow(follow_id)


async def delete_follow(follow_id: str, current_user: StoredUser):
    existing = await database.follows_collection.find_one({"uuid": follow_id})
    if existing is None:
        raise HTTPException(status_code=404, detail="Follow not found")
    if existing.get("from_user_id") != current_user.uuid:
        raise HTTPException(status_code=403, detail="You can only delete your own follows")
    result = await database.follows_collection.delete_one({
        "uuid": follow_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Follow not found"
        )

    return {
        "message": "Follow deleted successfully"
    }

