"""Isolated FastAPI app for real browser integration tests.

This module deliberately avoids ``main.app`` because its lifespan pings the
configured MongoDB server. All persistence in this app is in-memory and scoped
to this process; no Atlas URI is used.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gridfs.errors import NoFile
from mongomock_motor import AsyncMongoMockClient

import database


_client = AsyncMongoMockClient()
database.client = _client
database.db = _client.get_database("beli_frontend_integration")
database.users_collection = database.db.get_collection("users")
database.locations_collection = database.db.get_collection("locations")
database.reviews_collection = database.db.get_collection("reviews")
database.follows_collection = database.db.get_collection("follows")


class _DownloadStream:
    def __init__(self, content: bytes, metadata: dict):
        self._content = content
        self.metadata = metadata

    async def read(self) -> bytes:
        return self._content


class InMemoryGridFSBucket:
    """GridFS-shaped test double; FastAPI still handles real HTTP requests."""

    def __init__(self):
        self.files_collection = database.db.get_collection("photos.files")
        self._content: dict[str, bytes] = {}

    async def upload_from_stream_with_id(self, file_id, filename, source, *, metadata):
        data = source.read() if hasattr(source, "read") else bytes(source)
        self._content[str(file_id)] = data
        await self.files_collection.insert_one({
            "_id": file_id,
            "filename": filename,
            "metadata": metadata,
        })

    async def open_download_stream(self, file_id):
        document = await self.files_collection.find_one({"_id": file_id})
        if document is None or str(file_id) not in self._content:
            raise NoFile(f"No file with id {file_id}")
        return _DownloadStream(self._content[str(file_id)], document.get("metadata", {}))


photo_bucket = InMemoryGridFSBucket()


@asynccontextmanager
async def lifespan(_: FastAPI):
    from controllers.user import UserController

    await UserController(database.db).ensure_indexes()
    await database.locations_collection.insert_one({
        "uuid": "integration-commons",
        "name": "Integration Commons",
        "address": "Test Campus",
        "tags": ["Dining hall"],
        "hours": [],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    })
    yield


app = FastAPI(title="Beli Integration Test API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:14200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes.follow import router as follow_router  # noqa: E402
from routes.location import router as location_router  # noqa: E402
from routes.photo import get_photo_bucket, router as photo_router  # noqa: E402
from routes.review import router as review_router  # noqa: E402
from routes.user import router as user_router  # noqa: E402

app.dependency_overrides[get_photo_bucket] = lambda: photo_bucket
app.include_router(user_router)
app.include_router(location_router)
app.include_router(review_router)
app.include_router(follow_router)
app.include_router(photo_router)
