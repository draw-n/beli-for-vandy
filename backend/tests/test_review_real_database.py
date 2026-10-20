import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

import database
from controllers.auth import issue_access_token
from main import app
from models.user import AccountStatus, UserRole, UserType
from settings import get_settings


REAL_DATABASE_NAME = "beli_integration_test"
TEST_TOKEN_SECRET = "real-database-test-secret-with-sufficient-entropy"


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
    users_collection = test_database.get_collection("users")
    monkeypatch.setattr(database, "reviews_collection", reviews_collection)
    monkeypatch.setattr(database, "users_collection", users_collection)
    monkeypatch.setenv("AUTH_TOKEN_SECRET", TEST_TOKEN_SECRET)
    get_settings.cache_clear()

    user_id = f"integration-user-{uuid4()}"
    location_id = f"integration-location-{uuid4()}"
    review_id = None

    try:
        # Review creation requires an active account resolved from a bearer token.
        await users_collection.insert_one({
            "uuid": user_id,
            "username": user_id,
            "first_name": "Integration",
            "last_name": "User",
            "email": f"{user_id}@example.com",
            "password_hash": "unused",
            "year_graduation": 2027,
            "type": UserType.STUDENT.value,
            "created_at": datetime.now(timezone.utc),
            "home_city": "Nashville",
            "role": UserRole.USER.value,
            "status": AccountStatus.ACTIVE.value,
            "security_version": 0,
        })
        token, _ = issue_access_token(user_id, TEST_TOKEN_SECRET)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/reviews/",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "user_id": user_id,
                    "location_id": location_id,
                    "rating": 5,
                    "note": "Stored by the real MongoDB integration test.",
                    "meal_type": "dinner",
                    "created_at": "2026-10-17T12:00:00Z",
                    "updated_at": "2026-10-17T12:00:00Z",
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
    finally:
        if review_id is not None:
            await reviews_collection.delete_one({"uuid": review_id})
        await users_collection.delete_one({"uuid": user_id})
        get_settings.cache_clear()
        mongo_client.close()
