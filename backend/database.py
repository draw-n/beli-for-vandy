from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from settings import get_settings

DEFAULT_DATABASE_NAME = "beli_db"


def database_from_uri(client: AsyncIOMotorClient) -> AsyncIOMotorDatabase:
    """Select the URI database, retaining the local development default."""
    return client.get_default_database(DEFAULT_DATABASE_NAME)


# Create Motor async client and select the database named by MONGODB_URI.
client = AsyncIOMotorClient(get_settings().mongodb_uri, tz_aware=True)
db = database_from_uri(client)

# Collection definitions based on your project user stories
users_collection = db.get_collection("users")
locations_collection = db.get_collection("locations")
reviews_collection = db.get_collection("reviews")
follows_collection = db.get_collection("follows")
