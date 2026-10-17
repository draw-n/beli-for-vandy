from datetime import datetime, timedelta, timezone

import pytest

from controllers.photo_cleanup import cleanup_orphan_photos, find_orphan_candidates
from controllers.photo_storage import claim_photo


NOW = datetime(2026, 10, 17, 12, tzinfo=timezone.utc)


class FakeBucket:
    def __init__(self, files_collection):
        self.files_collection = files_collection
        self.deleted = []

    async def delete(self, photo_id):
        self.deleted.append(photo_id)
        await self.files_collection.delete_one({"_id": photo_id})


async def add_file(collection, photo_id, *, uploaded_at=None, metadata=None):
    file_metadata = {
        "owner_uuid": "owner-1",
        "status": "pending",
        "uploaded_at": uploaded_at or NOW - timedelta(days=2),
    }
    if metadata:
        file_metadata.update(metadata)
    await collection.insert_one({"_id": photo_id, "metadata": file_metadata})


@pytest.mark.asyncio
async def test_scan_uses_review_references_grace_and_conservative_metadata(mock_db):
    files = mock_db["photos.files"]
    reviews = mock_db["reviews"]
    await add_file(files, "old-orphan")
    await add_file(files, "referenced")
    await add_file(files, "recent", uploaded_at=NOW - timedelta(hours=23))
    await add_file(files, "malformed-time", metadata={"uploaded_at": "yesterday"})
    await files.insert_one({"_id": "missing-time", "metadata": {"owner_uuid": "owner-1", "status": "pending"}})
    await add_file(files, "missing-owner", metadata={"owner_uuid": None})
    await add_file(files, "moderation", metadata={"status": "awaiting_moderation"})
    await reviews.insert_one({"uuid": "r1", "photo_ids": ["referenced"]})

    candidates = await find_orphan_candidates(reviews, files, now=NOW)

    assert [item["photo_id"] for item in candidates] == ["old-orphan"]
    assert candidates[0]["reason"] == "never attached"


@pytest.mark.asyncio
async def test_detached_photo_grace_starts_at_unreferenced_since(mock_db):
    files = mock_db["photos.files"]
    reviews = mock_db["reviews"]
    await add_file(
        files,
        "recently-detached",
        metadata={"unreferenced_since": NOW - timedelta(minutes=5)},
    )
    await add_file(
        files,
        "old-detached",
        metadata={"unreferenced_since": NOW - timedelta(hours=25)},
    )

    candidates = await find_orphan_candidates(reviews, files, now=NOW)

    assert [item["photo_id"] for item in candidates] == ["old-detached"]
    assert candidates[0]["reason"] == "detached from review"


@pytest.mark.asyncio
async def test_dry_run_and_explicit_cleanup_delete_only_through_gridfs(mock_db):
    files = mock_db["photos.files"]
    reviews = mock_db["reviews"]
    bucket = FakeBucket(files)
    await add_file(files, "orphan")

    dry_run = await cleanup_orphan_photos(bucket, reviews, files, now=NOW)
    assert dry_run["candidate_count"] == 1
    assert bucket.deleted == []
    assert await files.find_one({"_id": "orphan"}) is not None

    deleted = await cleanup_orphan_photos(bucket, reviews, files, delete=True, now=NOW)
    assert [item["photo_id"] for item in deleted["deleted"]] == ["orphan"]
    assert bucket.deleted == ["orphan"]
    assert await files.find_one({"_id": "orphan"}) is None

    repeated = await cleanup_orphan_photos(bucket, reviews, files, delete=True, now=NOW)
    assert repeated["candidate_count"] == 0


@pytest.mark.asyncio
async def test_photo_referenced_after_scan_is_preserved(mock_db):
    files = mock_db["photos.files"]
    reviews = mock_db["reviews"]
    bucket = FakeBucket(files)
    await add_file(files, "orphan")
    candidates = await find_orphan_candidates(reviews, files, now=NOW)
    await reviews.insert_one({"uuid": "late-review", "photo_ids": ["orphan"]})

    result = await cleanup_orphan_photos(
        bucket, reviews, files, delete=True, now=NOW, candidates=candidates
    )

    assert result["deleted"] == []
    assert bucket.deleted == []
    assert await files.find_one({"_id": "orphan"}) is not None


@pytest.mark.asyncio
async def test_atomic_claim_allows_only_one_operation(mock_db):
    files = mock_db["photos.files"]
    await add_file(files, "claimed")

    assert await claim_photo("claimed", "deleting", bucket=FakeBucket(files))
    assert not await claim_photo("claimed", "in_use", bucket=FakeBucket(files))


@pytest.mark.asyncio
async def test_existing_claim_and_unknown_status_are_never_candidates(mock_db):
    files = mock_db["photos.files"]
    reviews = mock_db["reviews"]
    await add_file(files, "claimed", metadata={"cleanup_claim": "in_use"})
    await add_file(files, "unknown-state", metadata={"status": "under_review"})

    assert await find_orphan_candidates(reviews, files, now=NOW) == []


@pytest.mark.asyncio
async def test_database_scan_error_never_reaches_gridfs_delete(mock_db):
    files = mock_db["photos.files"]
    bucket = FakeBucket(files)
    await add_file(files, "orphan")

    class BrokenReviews:
        def find(self, *_args, **_kwargs):
            raise RuntimeError("database unavailable")

    with pytest.raises(RuntimeError, match="database unavailable"):
        await cleanup_orphan_photos(bucket, BrokenReviews(), files, delete=True, now=NOW)

    assert bucket.deleted == []
