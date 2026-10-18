from datetime import datetime, timedelta, timezone
from io import BytesIO

import jwt
from PIL import Image
import pytest
import pytest_asyncio

import database
from controllers.auth import issue_access_token
from main import app
from routes.photo import get_photo_bucket
from settings import get_settings
from gridfs.errors import NoFile


TEST_SECRET = "photo-route-tests-secret-with-sufficient-entropy"
OWNER_UUID = "owner-uuid"
OTHER_UUID = "other-uuid"


def image_bytes(image_format: str = "JPEG") -> bytes:
    output = BytesIO()
    Image.new("RGB", (80, 60), (40, 130, 210)).save(output, format=image_format)
    return output.getvalue()


class FakeGridOut:
    def __init__(self, record):
        self.metadata = record["metadata"]
        self._data = record["data"]

    async def read(self):
        return self._data


class FakeGridFSBucket:
    def __init__(self):
        self.files = {}
        self.files_collection = database.reviews_collection.database.get_collection("photos.files")

    async def upload_from_stream_with_id(self, file_id, filename, source, *, metadata):
        record = {
            "_id": file_id,
            "filename": filename,
            "data": source.read(),
            "metadata": metadata,
        }
        self.files[file_id] = record
        await self.files_collection.insert_one({key: value for key, value in record.items() if key != "data"})

    async def delete(self, file_id):
        self.files.pop(file_id, None)
        await self.files_collection.delete_one({"_id": file_id})

    async def open_download_stream(self, file_id):
        if file_id not in self.files:
            raise NoFile("Photo not found")
        return FakeGridOut(self.files[file_id])


@pytest_asyncio.fixture
async def photo_api(client, monkeypatch):
    bucket = FakeGridFSBucket()
    monkeypatch.setenv("AUTH_TOKEN_SECRET", TEST_SECRET)
    get_settings.cache_clear()
    app.dependency_overrides[get_photo_bucket] = lambda: bucket
    try:
        yield client, bucket
    finally:
        app.dependency_overrides.pop(get_photo_bucket, None)
        get_settings.cache_clear()


def bearer_token(user_id: str = OWNER_UUID) -> str:
    token, _ = issue_access_token(user_id, TEST_SECRET)
    return token


def review_payload(photo_ids, user_id: str = OWNER_UUID):
    now = datetime.now(timezone.utc).isoformat()
    return {
        "user_id": user_id,
        "location_id": "location-1",
        "rating": 8,
        "note": "A good meal",
        "meal_type": "Lunch",
        "created_at": now,
        "updated_at": now,
        "photo_ids": photo_ids,
    }


async def upload_owned_photo(client, user_id: str = OWNER_UUID) -> str:
    response = await client.post(
        "/photos/",
        headers={"Authorization": f"Bearer {bearer_token(user_id)}"},
        files={"file": ("food.jpg", image_bytes())},
    )
    assert response.status_code == 201
    return response.json()["uuid"]


@pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP"])
@pytest.mark.asyncio
async def test_authenticated_upload_stores_owner_and_pending_metadata(
    photo_api, image_format
):
    client, bucket = photo_api
    response = await client.post(
        "/photos/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        files={"file": ("food.bin", image_bytes(image_format), "text/plain")},
    )

    assert response.status_code == 201
    photo_id = response.json()["uuid"]
    metadata = bucket.files[photo_id]["metadata"]
    assert metadata["owner_uuid"] == OWNER_UUID
    assert metadata["status"] == "pending"
    assert metadata["content_type"] in {"image/jpeg", "image/png", "image/webp"}
    assert metadata["uploaded_at"] is not None


@pytest.mark.parametrize(
    "authorization",
    [
        None,
        "Bearer not-a-token",
        f"Bearer {jwt.encode({'sub': OWNER_UUID, 'exp': datetime.now(timezone.utc) - timedelta(minutes=1)}, TEST_SECRET, algorithm='HS256')}",
        f"Bearer {bearer_token()[:-1]}x",
    ],
    ids=["missing", "invalid", "expired", "tampered"],
)
@pytest.mark.asyncio
async def test_upload_rejects_missing_invalid_expired_and_tampered_tokens(
    photo_api, authorization
):
    client, _ = photo_api
    headers = {"Authorization": authorization} if authorization else {}
    response = await client.post(
        "/photos/", headers=headers, files={"file": ("food.jpg", image_bytes())}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_rejects_invalid_and_oversized_images(photo_api):
    client, _ = photo_api
    headers = {"Authorization": f"Bearer {bearer_token()}"}

    invalid = await client.post(
        "/photos/", headers=headers, files={"file": ("food.jpg", b"invalid")}
    )
    oversized = await client.post(
        "/photos/",
        headers=headers,
        files={"file": ("food.jpg", b"x" * (5 * 1024 * 1024 + 1))},
    )

    assert invalid.status_code == 400
    assert oversized.status_code == 413


@pytest.mark.asyncio
async def test_pending_photo_is_not_publicly_retrievable(photo_api):
    client, _ = photo_api
    upload = await client.post(
        "/photos/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        files={"file": ("food.jpg", image_bytes())},
    )

    response = await client.get(f"/photos/{upload.json()['uuid']}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_photo_is_retrievable_when_saved_review_matches_owner(photo_api):
    client, bucket = photo_api
    upload = await client.post(
        "/photos/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        files={"file": ("food.jpg", image_bytes())},
    )
    photo_id = upload.json()["uuid"]
    await database.reviews_collection.insert_one(
        {"uuid": "review-1", "user_id": OWNER_UUID, "photo_ids": [photo_id]}
    )

    response = await client.get(f"/photos/{photo_id}")

    assert response.status_code == 200
    assert response.headers["content-type"] == bucket.files[photo_id]["metadata"]["content_type"]
    assert response.content == bucket.files[photo_id]["data"]
    with Image.open(BytesIO(response.content)) as decoded:
        assert decoded.size == (80, 60)


@pytest.mark.asyncio
async def test_photo_is_hidden_when_review_author_does_not_match_owner(photo_api):
    client, _ = photo_api
    upload = await client.post(
        "/photos/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        files={"file": ("food.jpg", image_bytes())},
    )
    photo_id = upload.json()["uuid"]
    await database.reviews_collection.insert_one(
        {"uuid": "review-2", "user_id": OTHER_UUID, "photo_ids": [photo_id]}
    )

    response = await client.get(f"/photos/{photo_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_missing_photo_returns_404(photo_api):
    client, _ = photo_api
    response = await client.get("/photos/nonexistent-photo")
    assert response.status_code == 404


@pytest.mark.parametrize(
    "authorization",
    [
        None,
        "Bearer invalid-token",
        f"Bearer {jwt.encode({'sub': OWNER_UUID, 'iat': int(datetime.now(timezone.utc).timestamp()) - 120, 'exp': int((datetime.now(timezone.utc) - timedelta(minutes=1)).timestamp())}, TEST_SECRET, algorithm='HS256')}",
    ],
    ids=["missing", "invalid", "expired"],
)
@pytest.mark.asyncio
async def test_photo_review_creation_requires_valid_token(photo_api, authorization):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)
    headers = {"Authorization": authorization} if authorization else {}

    response = await client.post(
        "/reviews/", headers=headers, json=review_payload([photo_id])
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_photo_review_creation_requires_authenticated_review_owner(photo_api):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)

    response = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token(OTHER_UUID)}"},
        json=review_payload([photo_id]),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_review_rejects_duplicate_and_more_than_three_photo_ids(photo_api):
    client, _ = photo_api
    headers = {"Authorization": f"Bearer {bearer_token()}"}

    duplicate = await client.post(
        "/reviews/", headers=headers, json=review_payload(["same", "same"])
    )
    excessive = await client.post(
        "/reviews/", headers=headers, json=review_payload(["1", "2", "3", "4"])
    )

    assert duplicate.status_code == 422
    assert excessive.status_code == 422


@pytest.mark.asyncio
async def test_review_rejects_missing_or_other_users_photo(photo_api):
    client, _ = photo_api
    other_users_photo_id = await upload_owned_photo(client, OTHER_UUID)
    headers = {"Authorization": f"Bearer {bearer_token()}"}

    missing = await client.post(
        "/reviews/", headers=headers, json=review_payload(["missing-photo"])
    )
    other_owner = await client.post(
        "/reviews/",
        headers=headers,
        json=review_payload([other_users_photo_id]),
    )

    assert missing.status_code == 400
    assert other_owner.status_code == 403


@pytest.mark.asyncio
async def test_photo_can_only_be_attached_to_one_review(photo_api):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)
    headers = {"Authorization": f"Bearer {bearer_token()}"}
    first = await client.post(
        "/reviews/", headers=headers, json=review_payload([photo_id])
    )
    second = await client.post(
        "/reviews/", headers=headers, json=review_payload([photo_id])
    )

    assert first.status_code == 200
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_text_update_without_photo_ids_preserves_photo_and_public_access(photo_api):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)
    created = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([photo_id]),
    )
    review_id = created.json()["uuid"]

    updated = await client.put(
        f"/reviews/{review_id}",
        headers={"Authorization": f"Bearer {bearer_token(OWNER_UUID)}"},
        json={"note": "Edited without replacing photos"},
    )
    retained = await client.put(
        f"/reviews/{review_id}",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json={"photo_ids": [photo_id]},
    )
    retrieved_photo = await client.get(f"/photos/{photo_id}")

    assert updated.status_code == 200
    assert updated.json()["photo_ids"] == [photo_id]
    assert retained.status_code == 200
    assert retained.json()["photo_ids"] == [photo_id]
    assert retrieved_photo.status_code == 200


@pytest.mark.parametrize("photo_ids", [[], None], ids=["empty-list", "null"])
@pytest.mark.asyncio
async def test_photo_list_update_requires_auth_even_when_clearing(photo_api, photo_ids):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)
    created = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([photo_id]),
    )

    response = await client.put(
        f"/reviews/{created.json()['uuid']}", json={"photo_ids": photo_ids}
    )
    still_public = await client.get(f"/photos/{photo_id}")

    assert response.status_code == 401
    assert still_public.status_code == 200


@pytest.mark.parametrize("photo_ids", [[], None], ids=["empty-list", "null"])
@pytest.mark.asyncio
async def test_owner_can_explicitly_clear_photo_list(photo_api, photo_ids):
    client, bucket = photo_api
    photo_id = await upload_owned_photo(client)
    created = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([photo_id]),
    )

    response = await client.put(
        f"/reviews/{created.json()['uuid']}",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json={"photo_ids": photo_ids},
    )
    photo_response = await client.get(f"/photos/{photo_id}")

    assert response.status_code == 200
    assert photo_response.status_code == 404
    metadata = (await bucket.files_collection.find_one({"_id": photo_id}))["metadata"]
    assert metadata["unreferenced_since"] is not None
    assert "cleanup_claim" not in metadata


@pytest.mark.asyncio
async def test_deleting_review_starts_photo_grace_period(photo_api):
    client, bucket = photo_api
    photo_id = await upload_owned_photo(client)
    created = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([photo_id]),
    )

    deleted = await client.delete(
        f"/reviews/{created.json()['uuid']}",
        headers={"Authorization": f"Bearer {bearer_token(OWNER_UUID)}"},
    )

    assert deleted.status_code == 200
    metadata = (await bucket.files_collection.find_one({"_id": photo_id}))["metadata"]
    assert metadata["unreferenced_since"] is not None
    assert "cleanup_claim" not in metadata


@pytest.mark.asyncio
async def test_failed_photo_claim_releases_claims_acquired_earlier(photo_api):
    client, bucket = photo_api
    first = await upload_owned_photo(client)
    second = await upload_owned_photo(client)
    bucket.files[second]["metadata"]["cleanup_claim"] = "deleting"
    await bucket.files_collection.update_one(
        {"_id": second}, {"$set": {"metadata.cleanup_claim": "deleting"}}
    )

    response = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([first, second]),
    )

    assert response.status_code == 409
    first_metadata = (await bucket.files_collection.find_one({"_id": first}))["metadata"]
    assert "cleanup_claim" not in first_metadata


@pytest.mark.asyncio
async def test_other_user_cannot_modify_review_photo_references(photo_api):
    client, _ = photo_api
    photo_id = await upload_owned_photo(client)
    created = await client.post(
        "/reviews/",
        headers={"Authorization": f"Bearer {bearer_token()}"},
        json=review_payload([photo_id]),
    )

    response = await client.put(
        f"/reviews/{created.json()['uuid']}",
        headers={"Authorization": f"Bearer {bearer_token(OTHER_UUID)}"},
        json={"photo_ids": []},
    )

    assert response.status_code == 403
    assert (await client.get(f"/photos/{photo_id}")).status_code == 200
