from uuid import uuid4

from fastapi import HTTPException

import database

from models.location import LocationCreate, LocationUpdate



async def create_location(location: LocationCreate):
    location_data = location.model_dump()
    location_data["uuid"] = str(uuid4())

    await database.locations_collection.insert_one(location_data)

    return location_data


async def get_locations():
    locations = []

    cursor = database.locations_collection.find()

    async for location in cursor:
        location.pop("_id", None)
        locations.append(location)

    return locations


async def get_location(location_id: str):
    location = await database.locations_collection.find_one({
        "uuid": location_id
    })

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    location.pop("_id", None)

    return location


async def update_location(
    location_id: str,
    location: LocationUpdate
):
    update_data = location.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    result = await database.locations_collection.update_one(
        {"uuid": location_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return await get_location(location_id)


async def delete_location(location_id: str):
    result = await database.locations_collection.delete_one({
        "uuid": location_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return {
        "message": "Location deleted successfully"
    }
