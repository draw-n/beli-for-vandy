import os

from dotenv import load_dotenv
from pymongo import AsyncMongoClient

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")

# Create PyMongo async client
client = AsyncMongoClient(MONGO_URI, tz_aware=True)

# Connect to main app database
db = client.beli_db

# Collection definitions based on your project user stories
users_collection = db.get_collection("users")
locations_collection = db.get_collection("locations")
reviews_collection = db.get_collection("reviews")
follows_collection = db.get_collection("follows")
