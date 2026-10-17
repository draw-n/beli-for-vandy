#!/usr/bin/env python3
"""Manually inspect or remove old, unreferenced GridFS photo files."""

import argparse
import asyncio
from datetime import timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pymongo.errors import PyMongoError

from controllers.photo_cleanup import cleanup_orphan_photos, find_orphan_candidates
from settings import get_settings


DATABASE_NAME_FALLBACK = "beli_db"
MONGODB_CONNECT_TIMEOUT_MS = 5_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grace-hours", type=float, default=24)
    parser.add_argument("--delete", action="store_true", help="Actually delete eligible files.")
    parser.add_argument(
        "--confirm-database",
        help="Required with --delete; must exactly match the selected database name.",
    )
    args = parser.parse_args()
    if args.grace_hours <= 0:
        parser.error("--grace-hours must be greater than zero")
    return args


async def main() -> None:
    args = parse_args()
    client = AsyncIOMotorClient(
        get_settings().mongodb_uri,
        tz_aware=True,
        serverSelectionTimeoutMS=MONGODB_CONNECT_TIMEOUT_MS,
        connectTimeoutMS=MONGODB_CONNECT_TIMEOUT_MS,
    )
    try:
        db = client.get_default_database(DATABASE_NAME_FALLBACK)
        database_name = db.name
        print(f"Selected database: {database_name}", flush=True)
        if args.delete and args.confirm_database != database_name:
            raise SystemExit(
                "Deletion requires --confirm-database matching the selected database."
            )

        try:
            await client.admin.command("ping")
        except PyMongoError as error:
            raise SystemExit(
                "MongoDB connection failed within 5 seconds. Check that the configured "
                "server is running and reachable; no cleanup was performed."
            ) from error

        bucket = AsyncIOMotorGridFSBucket(db, bucket_name="photos")
        reviews_collection = db.get_collection("reviews")
        files_collection = db.get_collection("photos.files")
        grace_period = timedelta(hours=args.grace_hours)
        candidates = await find_orphan_candidates(
            reviews_collection,
            files_collection,
            grace_period=grace_period,
        )
        print(f"Eligible candidates: {len(candidates)}", flush=True)
        result = await cleanup_orphan_photos(
            bucket,
            reviews_collection,
            files_collection,
            delete=args.delete,
            grace_period=grace_period,
            candidates=candidates,
        )
        if not args.delete:
            for candidate in result["candidates"]:
                print(
                    f"DRY RUN photo_id={candidate['photo_id']} age={candidate['age']} "
                    f"reason={candidate['reason']}"
                )
            print("Dry run only; no files were deleted.")
            return

        for candidate in result["deleted"]:
            print(
                f"DELETED photo_id={candidate['photo_id']} age={candidate['age']} "
                f"reason={candidate['reason']}"
            )
        print(f"Deleted files: {len(result['deleted'])}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
