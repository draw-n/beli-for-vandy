from datetime import datetime, timezone
import re
from uuid import uuid4

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

import database
from models.dish_name import capitalize_initial
from models.favorite_dish import FavoriteDishCreate


async def ensure_favorite_dish_indexes() -> None:
    indexes = await database.favorite_dishes_collection.index_information()
    for index_name, index in indexes.items():
        index_keys = index.get("key", [])
        keys = list(index_keys.items()) if isinstance(index_keys, dict) else list(index_keys)
        if index.get("unique") and keys == [("user_id", 1), ("normalized_name", 1)]:
            await database.favorite_dishes_collection.drop_index(index_name)

    await database.favorite_dishes_collection.create_index(
        [("user_id", 1), ("normalized_name", 1), ("location_id", 1)],
        unique=True,
    )


async def get_favorite_dishes(user_id: str) -> list[dict]:
    cursor = database.favorite_dishes_collection.find({"user_id": user_id}).sort("name", 1)
    dishes = []
    async for dish in cursor:
        formatted_name = capitalize_initial(dish["name"].strip())
        if formatted_name != dish["name"]:
            await database.favorite_dishes_collection.update_one(
                {"uuid": dish["uuid"], "user_id": user_id},
                {"$set": {"name": formatted_name}},
            )
            dish["name"] = formatted_name
        if not dish.get("location_id"):
            await _infer_legacy_dish_location(dish)
        dish.pop("_id", None)
        dishes.append(dish)
    return dishes


async def _infer_legacy_dish_location(dish: dict) -> None:
    escaped_name = re.escape(dish["name"].strip())
    reviews = database.reviews_collection.find(
        {
            "favorite_dishes": {
                "$regex": rf"^\s*{escaped_name}\s*$",
                "$options": "i",
            }
        },
        {"location_id": 1},
    )
    location_ids = {
        review["location_id"]
        async for review in reviews
        if isinstance(review.get("location_id"), str) and review["location_id"]
    }
    if len(location_ids) != 1:
        return

    location_id = location_ids.pop()
    location = await database.locations_collection.find_one(
        {"uuid": location_id},
        {"name": 1},
    )
    if location is None or not isinstance(location.get("name"), str):
        return

    location_name = location["name"]
    await database.favorite_dishes_collection.update_one(
        {"uuid": dish["uuid"], "user_id": dish["user_id"]},
        {"$set": {"location_id": location_id, "location_name": location_name}},
    )
    dish["location_id"] = location_id
    dish["location_name"] = location_name


async def add_favorite_dish(user_id: str, payload: FavoriteDishCreate) -> dict:
    name = capitalize_initial(payload.name.strip())
    if not name:
        raise HTTPException(status_code=422, detail="Dish name cannot be blank.")

    location_id = payload.location_id.strip()
    location_name = payload.location_name.strip()
    normalized_name = name.lower()

    legacy = await database.favorite_dishes_collection.find_one(
        {
            "user_id": user_id,
            "normalized_name": normalized_name,
            "location_id": {"$exists": False},
        }
    )
    if legacy is not None:
        await database.favorite_dishes_collection.update_one(
            {"uuid": legacy["uuid"], "user_id": user_id},
            {
                "$set": {
                    "name": name,
                    "location_id": location_id,
                    "location_name": location_name,
                }
            },
        )
        legacy.update({
            "name": name,
            "location_id": location_id,
            "location_name": location_name,
        })
        legacy.pop("_id", None)
        return legacy

    dish = {
        "uuid": str(uuid4()),
        "user_id": user_id,
        "name": name,
        "normalized_name": normalized_name,
        "location_id": location_id,
        "location_name": location_name,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await database.favorite_dishes_collection.insert_one(dish)
    except DuplicateKeyError:
        existing = await database.favorite_dishes_collection.find_one(
            {
                "user_id": user_id,
                "normalized_name": normalized_name,
                "location_id": location_id,
            }
        )
        if existing is None:
            raise
        if existing.get("name") != name:
            await database.favorite_dishes_collection.update_one(
                {"uuid": existing["uuid"], "user_id": user_id},
                {"$set": {"name": name}},
            )
            existing["name"] = name
        existing.pop("_id", None)
        return existing

    dish.pop("_id", None)
    return dish


async def remove_favorite_dish(user_id: str, dish_id: str) -> None:
    result = await database.favorite_dishes_collection.delete_one(
        {"uuid": dish_id, "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite dish not found.")
