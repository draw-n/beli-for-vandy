import pytest


REVIEW_DATA = {
    "user_id": "user-123",
    "location_id": "location-456",
    "rating": 5,
    "note": "Excellent food and service.",
    "meal_type": "dinner",
    "created_at": "2026-09-23T18:30:00",
    "updated_at": "2026-09-23T18:30:00",
    "photo_ids": [],
}


@pytest.mark.asyncio
async def test_create_review(client):
    response = await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    assert response.status_code == 200

    data = response.json()

    assert "uuid" in data
    assert data["uuid"] is not None

    assert data["user_id"] == REVIEW_DATA["user_id"]
    assert data["location_id"] == REVIEW_DATA["location_id"]
    assert data["rating"] == REVIEW_DATA["rating"]
    assert data["note"] == REVIEW_DATA["note"]
    assert data["meal_type"] == REVIEW_DATA["meal_type"]
    assert data["created_at"] == REVIEW_DATA["created_at"]
    assert data["updated_at"] == REVIEW_DATA["updated_at"]
    assert data["photo_ids"] == REVIEW_DATA["photo_ids"]

@pytest.mark.asyncio
async def test_get_reviews(client):
    await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    second_review = {
        **REVIEW_DATA,
        "user_id": "user-456",
        "rating": 4,
        "note": "Pretty good.",
    }

    await client.post(
        "/reviews/",
        json=second_review
    )

    response = await client.get("/reviews/")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    assert data[0]["user_id"] == "user-123"
    assert data[0]["rating"] == 5

    assert data[1]["user_id"] == "user-456"
    assert data[1]["rating"] == 4

@pytest.mark.asyncio
async def test_get_review(client):
    create_response = await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    assert create_response.status_code == 200

    review_id = create_response.json()["uuid"]

    response = await client.get(
        f"/reviews/{review_id}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["uuid"] == review_id
    assert data["user_id"] == REVIEW_DATA["user_id"]
    assert data["location_id"] == REVIEW_DATA["location_id"]
    assert data["rating"] == REVIEW_DATA["rating"]
    assert data["note"] == REVIEW_DATA["note"]
    assert data["meal_type"] == REVIEW_DATA["meal_type"]

@pytest.mark.asyncio
async def test_get_review_not_found(client):
    response = await client.get(
        "/reviews/does-not-exist"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Review not found"
    }

@pytest.mark.asyncio
async def test_update_review(client):
    create_response = await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    review_id = create_response.json()["uuid"]

    update_data = {
        "rating": 3,
        "note": "It was okay.",
        "meal_type": "lunch",
    }

    response = await client.put(
        f"/reviews/{review_id}",
        json=update_data
    )

    assert response.status_code == 200

    data = response.json()

    assert data["uuid"] == review_id

    # Updated fields
    assert data["rating"] == 3
    assert data["note"] == "It was okay."
    assert data["meal_type"] == "lunch"

    # Unchanged fields
    assert data["user_id"] == REVIEW_DATA["user_id"]
    assert data["location_id"] == REVIEW_DATA["location_id"]
    assert data["created_at"] == REVIEW_DATA["created_at"]

@pytest.mark.asyncio
async def test_update_review_not_found(client):
    response = await client.put(
        "/reviews/does-not-exist",
        json={
            "rating": 3
        }
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Review not found"
    }

@pytest.mark.asyncio
async def test_update_review_no_fields(client):
    create_response = await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    review_id = create_response.json()["uuid"]

    response = await client.put(
        f"/reviews/{review_id}",
        json={}
    )

    assert response.status_code == 400

    assert response.json() == {
        "detail": "No fields provided for update"
    }

@pytest.mark.asyncio
async def test_delete_review(client):
    create_response = await client.post(
        "/reviews/",
        json=REVIEW_DATA
    )

    review_id = create_response.json()["uuid"]

    response = await client.delete(
        f"/reviews/{review_id}"
    )

    assert response.status_code == 200

    assert response.json() == {
        "message": "Review deleted successfully"
    }

    # Verify it is actually gone
    get_response = await client.get(
        f"/reviews/{review_id}"
    )

    assert get_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_review_not_found(client):
    response = await client.delete(
        "/reviews/does-not-exist"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Review not found"
    }

@pytest.mark.asyncio
async def test_create_review_missing_rating(client):
    invalid_review = {
        **REVIEW_DATA
    }

    del invalid_review["rating"]

    response = await client.post(
        "/reviews/",
        json=invalid_review
    )

    assert response.status_code == 422

@pytest.mark.asyncio
async def test_create_review_missing_user_id(client):
    invalid_review = {
        **REVIEW_DATA
    }

    del invalid_review["user_id"]

    response = await client.post(
        "/reviews/",
        json=invalid_review
    )

    assert response.status_code == 422

@pytest.mark.asyncio
async def test_create_review_invalid_rating(client):
    invalid_review = {
        **REVIEW_DATA,
        "rating": "five"
    }

    response = await client.post(
        "/reviews/",
        json=invalid_review
    )

    assert response.status_code == 422
