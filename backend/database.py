import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")

# Create Motor Async Client
client = AsyncIOMotorClient(MONGO_URI)

# Connect to main app database
db = client.beli_db

# Collection definitions based on your project user stories
users_collection = db.get_collection("users")
dining_halls_collection = db.get_collection("dining_halls")
reviews_collection = db.get_collection("reviews")
friendships_collection = db.get_collection("friendships")
