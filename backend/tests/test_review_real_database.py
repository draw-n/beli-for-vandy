import os
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

import database
from main import app


REAL_DATABASE_NAME = "beli_integration_test"


@pytest.mark.asyncio
async def test_create_review_persists_to_real_mongodb(monkeypatch):
    """Exercise the HTTP route, controller, and a real disposable MongoDB database."""
    mongodb_uri = os.getenv("REAL_MONGODB_URI")
    if not mongodb_uri:
        pytest.skip("REAL_MONGODB_URI is required for the real-database integration test")

    mongo_client = AsyncIOMotorClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5_000,
        tz_aware=True,
    )
    test_database = mongo_client.get_default_database()
    if test_database.name != REAL_DATABASE_NAME:
        mongo_client.close()
        pytest.fail(
            f"REAL_MONGODB_URI must select the {REAL_DATABASE_NAME!r} database; "
            f"received {test_database.name!r}"
        )

    await mongo_client.admin.command("ping")
    reviews_collection = test_database.get_collection("reviews")
    monkeypatch.setattr(database, "reviews_collection", reviews_collection)

    user_id = f"integration-user-{uuid4()}"
    location_id = f"integration-location-{uuid4()}"
    review_id = None

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/reviews/",
                json={
                    "user_id": user_id,
                    "location_id": location_id,
                    "rating": 5,
                    "note": "Stored by the real MongoDB integration test.",
                    "meal_type": "dinner",
                    "created_at": "2026-10-17T12:00:00Z",
                    "updated_at": "2026-10-17T12:00:00Z",
                    "photo_ids": ["integration-photo-1"],
                },
            )

        assert response.status_code == 200
        review_id = response.json()["uuid"]

        stored_review = await reviews_collection.find_one({"uuid": review_id})
        assert stored_review is not None
        assert stored_review["user_id"] == user_id
        assert stored_review["location_id"] == location_id
        assert stored_review["rating"] == 5
        assert stored_review["note"] == "Stored by the real MongoDB integration test."
        assert stored_review["photo_ids"] == ["integration-photo-1"]
    finally:
        if review_id is not None:
            await reviews_collection.delete_one({"uuid": review_id})
        mongo_client.close()
