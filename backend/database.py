from motor.motor_asyncio import AsyncIOMotorClient

from settings import get_settings

# Create Motor async client
client = AsyncIOMotorClient(get_settings().mongodb_uri, tz_aware=True)

# Connect to main app database
db = client.beli_db

# Collection definitions based on your project user stories
users_collection = db.get_collection("users")
locations_collection = db.get_collection("locations")
reviews_collection = db.get_collection("reviews")
follows_collection = db.get_collection("follows")
