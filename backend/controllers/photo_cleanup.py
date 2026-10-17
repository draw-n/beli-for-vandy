"""Conservative, manually invoked cleanup for unreferenced GridFS photos."""

from datetime import datetime, timedelta, timezone
from typing import Any

from controllers.photo_storage import claim_photo, release_photo_claim


async def find_orphan_candidates(
    reviews_collection: Any,
    files_collection: Any,
    *,
    now: datetime | None = None,
    grace_period: timedelta = timedelta(hours=24),
) -> list[dict[str, Any]]:
    """Find old, valid, pending GridFS files absent from all saved reviews."""
    now = now or datetime.now(timezone.utc)
    referenced_ids: set[str] = set()
    async for review in reviews_collection.find(
        {"photo_ids": {"$exists": True, "$ne": None}}, {"photo_ids": 1}
    ):
        photo_ids = review.get("photo_ids")
        if isinstance(photo_ids, list):
            referenced_ids.update(photo_id for photo_id in photo_ids if isinstance(photo_id, str))

    candidates: list[dict[str, Any]] = []
    async for file_record in files_collection.find({}):
        photo_id = file_record.get("_id")
        metadata = file_record.get("metadata")
        if not isinstance(photo_id, str) or not isinstance(metadata, dict):
            continue
        if photo_id in referenced_ids:
            continue
        if not isinstance(metadata.get("owner_uuid"), str) or not metadata["owner_uuid"]:
            continue
        if metadata.get("status") != "pending" or metadata.get("cleanup_claim") is not None:
            continue
        uploaded_at = metadata.get("uploaded_at")
        if not isinstance(uploaded_at, datetime):
            continue

        timestamp_key = "unreferenced_since" if "unreferenced_since" in metadata else "uploaded_at"
        timestamp = metadata.get(timestamp_key)
        if not isinstance(timestamp, datetime):
            continue
        # BSON dates represent UTC; some isolated Mongo mocks return naive values.
        timestamp = timestamp.replace(tzinfo=timezone.utc) if timestamp.tzinfo is None else timestamp
        age = now - timestamp.astimezone(timezone.utc)
        if age < grace_period:
            continue

        candidates.append({
            "photo_id": photo_id,
            "age": age,
            "reason": "detached from review" if timestamp_key == "unreferenced_since" else "never attached",
        })
    return candidates


async def cleanup_orphan_photos(
    bucket: Any,
    reviews_collection: Any,
    files_collection: Any,
    *,
    delete: bool = False,
    now: datetime | None = None,
    grace_period: timedelta = timedelta(hours=24),
    candidates: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run dry-run by default; delete only individually claimed, rechecked files."""
    if candidates is None:
        candidates = await find_orphan_candidates(
            reviews_collection, files_collection, now=now, grace_period=grace_period
        )
    result: dict[str, Any] = {"candidate_count": len(candidates), "deleted": []}
    if not delete:
        result["candidates"] = candidates
        return result

    for candidate in candidates:
        photo_id = candidate["photo_id"]
        if not await claim_photo(photo_id, "deleting", bucket=bucket):
            continue
        try:
            if await reviews_collection.find_one({"photo_ids": photo_id}, {"_id": 1}):
                continue
            await bucket.delete(photo_id)
            result["deleted"].append(candidate)
        finally:
            # No-op after successful GridFS deletion; releases the claim on errors/references.
            await release_photo_claim(photo_id, "deleting", bucket=bucket)
    return result
