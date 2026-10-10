import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from seeds.follow import seed_follows
from seeds.location import seed_locations
from seeds.review import seed_reviews
from seeds.user import seed_users

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the .env file")

def seed_database():
    client = MongoClient(MONGODB_URI)

    try:
        seed_locations()
        seed_users()
        seed_follows()
        seed_reviews()
        print("Database seeded successfully.")
    except PyMongoError as e:
        print(f"An error occurred while seeding the database: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    seed_database()