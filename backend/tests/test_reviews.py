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
    "favorite_dishes": ["mac and cheese", "roasted vegetables"],
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
    assert data["favorite_dishes"] == ["Mac and cheese", "Roasted vegetables"]


@pytest.mark.asyncio
async def test_create_review_defaults_favorite_dishes_for_legacy_requests(client):
    review_data = {key: value for key, value in REVIEW_DATA.items() if key != "favorite_dishes"}

    response = await client.post("/reviews/", json=review_data)

    assert response.status_code == 200
    assert response.json()["favorite_dishes"] == []


@pytest.mark.asyncio
async def test_review_capitalizes_only_the_first_character_of_each_favorite_dish(client):
    response = await client.post(
        "/reviews/",
        json={**REVIEW_DATA, "favorite_dishes": ["mAC and cheese", " pIZZA"]},
    )

    assert response.status_code == 200
    assert response.json()["favorite_dishes"] == ["Mac and cheese", "Pizza"]


@pytest.mark.asyncio
async def test_review_update_capitalizes_only_the_first_character_of_each_favorite_dish(client):
    created = await client.post("/reviews/", json=REVIEW_DATA)
    response = await client.put(
        f"/reviews/{created.json()['uuid']}",
        json={"favorite_dishes": ["mAC and cheese", " pIZZA"]},
    )

    assert response.status_code == 200
    assert response.json()["favorite_dishes"] == ["Mac and cheese", "Pizza"]


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
        "favorite_dishes": ["pizza", "salad"],
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
    assert data["favorite_dishes"] == ["Pizza", "Salad"]

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


@pytest.mark.parametrize("rating", [0, 1, 10, 11], ids=["below-ui-min", "ui-min", "ui-max", "above-ui-max"])
@pytest.mark.asyncio
async def test_backend_currently_accepts_integer_ratings_without_range_validation(client, rating):
    response = await client.post("/reviews/", json={**REVIEW_DATA, "rating": rating})

    # The backend model currently requires an integer but defines no 1-10 (or 1-5) bound.
    assert response.status_code == 200
    assert response.json()["rating"] == rating


@pytest.mark.asyncio
async def test_review_text_update_and_delete_are_currently_unauthenticated(client):
    created = await client.post("/reviews/", json=REVIEW_DATA)
    review_id = created.json()["uuid"]

    updated = await client.put(
        f"/reviews/{review_id}",
        json={"note": "Updated without bearer authentication"},
    )
    deleted = await client.delete(f"/reviews/{review_id}")

    assert updated.status_code == 200
    assert updated.json()["note"] == "Updated without bearer authentication"
    assert deleted.status_code == 200
    assert (await client.get(f"/reviews/{review_id}")).status_code == 404
