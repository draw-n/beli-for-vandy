from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from pymongo import ReturnDocument

import database
from models.personal_ranking import (
    PersonalRankingResponse, PersonalRankingUpsert, RankedEntry, RankingsResponse, UnratedEntry,
)


async def ensure_personal_ranking_indexes() -> None:
    await database.personal_rankings_collection.create_index(
        [("user_id", 1), ("location_id", 1)], unique=True,
    )


async def get_rankings(user_id: str) -> RankingsResponse:
    locations = []
    async for loc in database.locations_collection.find():
        loc.pop("_id", None)
        locations.append(loc)
    ratings: dict[str, dict] = {}
    async for doc in database.personal_rankings_collection.find({"user_id": user_id}):
        doc.pop("_id", None)
        ratings[doc["location_id"]] = doc
    rated_locs = sorted(
        [loc for loc in locations if loc["uuid"] in ratings],
        key=lambda loc: (-ratings[loc["uuid"]]["rating"], loc["uuid"]),
    )
    rated = [
        RankedEntry(rank=i + 1, location_id=loc["uuid"], location_name=loc["name"],
                    rating=ratings[loc["uuid"]]["rating"], uuid=ratings[loc["uuid"]]["uuid"])
        for i, loc in enumerate(rated_locs)
    ]
    unrated = sorted(
        [UnratedEntry(location_id=loc["uuid"], location_name=loc["name"])
         for loc in locations if loc["uuid"] not in ratings],
        key=lambda e: e.location_name,
    )
    return RankingsResponse(rated=rated, unrated=unrated)


async def upsert_ranking(
    user_id: str, location_id: str, payload: PersonalRankingUpsert,
) -> PersonalRankingResponse:
    if not await database.locations_collection.find_one({"uuid": location_id}):
        raise HTTPException(status_code=404, detail="Location not found")
    now = datetime.now(timezone.utc)
    doc = await database.personal_rankings_collection.find_one_and_update(
        {"user_id": user_id, "location_id": location_id},
        {"$set": {"rating": payload.rating, "updated_at": now},
         "$setOnInsert": {"uuid": str(uuid4()), "user_id": user_id,
                          "location_id": location_id, "created_at": now}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    doc.pop("_id", None)
    return PersonalRankingResponse(**doc)
