import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from models.review import ReviewCreate


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
	raise ValueError("MONGODB_URI is not set in the .env file")


def seed_reviews() -> None:
	client = MongoClient(MONGODB_URI)

	try:
		db = client["beli_db"]
		users = list(db["users"].find({}, {"_id": 0, "uuid": 1}))
		locations = list(db["locations"].find({}, {"_id": 0, "uuid": 1, "name": 1}))

		if not users or not locations:
			raise ValueError("Seed users and locations before seeding reviews")

		now = datetime.now(timezone.utc)
		review_data = [
			(0, 0, 5, "A great variety of meals and plenty of seating.", "Dinner"),
			(1, 1, 4, "Reliable option when I am near Rand.", "Lunch"),
			(2, 2, 5, "The food is fresh and the staff is welcoming.", "Breakfast"),
			(3, 3, 3, "Good selection, although it can get busy.", "Dinner"),
			(4, 4, 4, "A convenient spot between classes.", "Lunch"),
			(0, 5, 4, None, "Breakfast"),
		]

		documents = []
		for user_index, location_index, rating, note, meal_type in review_data:
			created_at = now - timedelta(days=len(documents) + 1)
			review = ReviewCreate(
				user_id=users[user_index % len(users)]["uuid"],
				location_id=locations[location_index % len(locations)]["uuid"],
				rating=rating,
				note=note,
				meal_type=meal_type,
				created_at=created_at,
				updated_at=created_at,
			)
			documents.append({**review.model_dump(), "uuid": str(uuid4())})

		reviews = db["reviews"]
		reviews.delete_many({})
		result = reviews.insert_many(documents)
		print(f"Inserted {len(result.inserted_ids)} reviews.")
	except PyMongoError as error:
		print(f"MongoDB error: {error}")
	finally:
		client.close()


if __name__ == "__main__":
	seed_reviews()
