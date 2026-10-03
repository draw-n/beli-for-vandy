import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from models.follow import FollowCreate


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
	raise ValueError("MONGODB_URI is not set in the .env file")


def seed_follows() -> None:
	client = MongoClient(MONGODB_URI)

	try:
		db = client["beli_db"]
		users = [
			user["uuid"]
			for user in db["users"].find({}, {"_id": 0, "uuid": 1})
		]

		if len(users) < 5:
			raise ValueError("Seed at least five users before seeding follows")

		now = datetime.now(timezone.utc)
		follow_data = [
			(0, 1, True),
			(1, 0, True),
			(0, 2, True),
			(2, 0, True),
			(1, 3, False),
			(3, 4, False),
			(4, 0, False),
		]

		documents = []
		for index, (from_index, to_index, is_mutual) in enumerate(follow_data):
			follow = FollowCreate(
				from_user_id=users[from_index],
				to_user_id=users[to_index],
				is_mutual=is_mutual,
				created_at=now - timedelta(days=index + 1),
			)
			documents.append({**follow.model_dump(), "uuid": str(uuid4())})

		follows = db["follows"]
		follows.delete_many({})
		result = follows.insert_many(documents)
		print(f"Inserted {len(result.inserted_ids)} follows.")
	except PyMongoError as error:
		print(f"MongoDB error: {error}")
	finally:
		client.close()


if __name__ == "__main__":
	seed_follows()
