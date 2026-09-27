from uuid import uuid4

from fastapi import HTTPException

import database

from models.follow import FollowCreate, FollowUpdate



async def create_follow(follow: FollowCreate):
    follow_data = follow.model_dump()
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
    follow: FollowUpdate
):
    update_data = follow.model_dump(exclude_unset=True)

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


async def delete_follow(follow_id: str):
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


