import os

from dotenv import load_dotenv
from pymongo import AsyncMongoClient

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")

# Create PyMongo async client
client = AsyncMongoClient(MONGO_URI)

# Connect to main app database
db = client.beli_db

# Collection definitions based on your project user stories
users_collection = db.get_collection("users")
dining_halls_collection = db.get_collection("dining_halls")
reviews_collection = db.get_collection("reviews")
friendships_collection = db.get_collection("friendships")
