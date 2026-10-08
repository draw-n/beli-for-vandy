import os
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from controllers.security import hash_password
from models.user import UserCreate, UserType


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DEFAULT_PASSWORD = "password123"

if not MONGODB_URI:
	raise ValueError("MONGODB_URI is not set in the .env file")


def seed_users() -> None:
	client = MongoClient(MONGODB_URI)

	try:
		users = client["beli_db"]["users"]
		created_at = datetime.now(timezone.utc)
		seed_data = [
			UserCreate(
				username="ava.martin",
				first_name="Ava",
				last_name="Martin",
				email="ava.martin@vanderbilt.edu",
				year_graduation=2027,
				type=UserType.STUDENT,
				home_city="Nashville",
				password=DEFAULT_PASSWORD,
			),
			UserCreate(
				username="liam.johnson",
				first_name="Liam",
				last_name="Johnson",
				email="liam.johnson@vanderbilt.edu",
				year_graduation=2026,
				type=UserType.STUDENT,
				home_city="Atlanta",
				password=DEFAULT_PASSWORD,
			),
			UserCreate(
				username="sofia.chen",
				first_name="Sofia",
				last_name="Chen",
				email="sofia.chen@vanderbilt.edu",
				year_graduation=2028,
				type=UserType.STUDENT,
				home_city="Chicago",
				password=DEFAULT_PASSWORD,
			),
			UserCreate(
				username="marcus.williams",
				first_name="Marcus",
				last_name="Williams",
				email="marcus.williams@vanderbilt.edu",
				year_graduation=None,
				type=UserType.FACULTY,
				home_city="Memphis",
				password=DEFAULT_PASSWORD,
			),
			UserCreate(
				username="elena.rodriguez",
				first_name="Elena",
				last_name="Rodriguez",
				email="elena.rodriguez@vanderbilt.edu",
				year_graduation=2029,
				type=UserType.STUDENT,
				home_city="Miami",
				password=DEFAULT_PASSWORD,
			),
		]

		documents = [
			{
				**user.model_dump(exclude={"password"}),
				"email": str(user.email).lower(),
				"password_hash": hash_password(user.password),
				"uuid": str(uuid4()),
				"created_at": created_at,
				"type": user.type.value,
			}
			for user in seed_data
		]

		users.delete_many({})
		result = users.insert_many(documents)
		print(f"Inserted {len(result.inserted_ids)} users.")
	except PyMongoError as error:
		print(f"MongoDB error: {error}")
	finally:
		client.close()


if __name__ == "__main__":
	seed_users()
