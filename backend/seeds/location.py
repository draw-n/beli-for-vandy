import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from datetime import datetime

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

# The seed records use JavaScript-style object keys; map them to MongoDB keys.
uuid = "uuid"
name = "name"
address = "address"
tags = "tags"
hours = "hours"
day = "day"
created_at = "created_at"
updated_at = "updated_at"


def Date(value):
    """Convert the seed date strings to values accepted by MongoDB."""
    return datetime.fromisoformat(value)

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in the .env file")


def seed_locations():
    client = MongoClient(MONGODB_URI)

    try:
        # Change this to your database name
        db = client["beli_db"]

        # Change this to your collection name
        locations = db["locations"]

        seed_data = [
            {
                uuid: '650408b4-bf68-11f1-a035-00155de17b17',
                name: 'The Commons Dining Center',
                address: 'Peabody Campus',
                tags: ['All You Can Eat'],
                hours: [
                    ("Monday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Tuesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Wednesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Thursday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Friday", "7:00 AM", "8:00 PM", "All Day"),
                    ("Saturday", "9:00 AM", "8:00 PM", "All Day"),
                    ("Sunday", "9:00 AM", "9:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-20'),
                updated_at: Date('2026-09-20'),
            },

                {
                uuid: '71497d48-bf68-11f1-b291-00155de17b17',
                name: 'Rand Dining Center',
                address: 'Rand Hall',
                tags: ['Meals'],
                hours: [
                    ("Monday", "7:30 AM", "8:00 PM", "All Day"),
                    ("Tuesday", "7:30 AM", "8:00 PM", "All Day"),
                    ("Wednesday", "7:30 AM", "8:00 PM", "All Day"),
                    ("Thursday", "7:30 AM", "8:00 PM", "All Day"),
                    ("Friday", "7:30 AM", "7:00 PM", "All Day"),
                    ("Saturday", "10:00 AM", "6:00 PM", "All Day"),
                    ("Sunday", "10:00 AM", "6:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-19'),
                updated_at: Date('2026-09-19'),
            },

            {
                uuid: '77b5928e-bf68-11f1-b446-00155de17b17',
                name: 'EBI Dining Center',
                address: 'E. Bronson Ingram College',
                tags: ['All You Can Eat'],
                hours: [
                    ("Monday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Tuesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Wednesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Thursday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Friday", "7:00 AM", "8:00 PM", "All Day"),
                    ("Saturday", "9:00 AM", "8:00 PM", "All Day"),
                    ("Sunday", "9:00 AM", "8:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-18'),
                updated_at: Date('2026-09-18'),
            },
            {
                uuid: '7eb57842-bf68-11f1-91cd-00155de17b17',
                name: 'The Kitchen at Kissam',
                address: 'Kissam Center',
                tags: ['Meals'],
                hours: [
                    ("Monday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Tuesday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Wednesday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Thursday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Friday", "11:00 AM", "7:00 PM", "All Day"),
                    ("Saturday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Sunday", "11:00 AM", "8:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-17'),
                updated_at: Date('2026-09-17'),
            },

            {
                uuid: '84fea8e0-bf68-11f1-bf87-00155de17b17',
                name: 'Rothschild Dining Center',
                address: 'Rothschild College',
                tags: ['All You Can Eat'],
                hours: [
                    ("Monday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Tuesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Wednesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Thursday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Friday", "7:00 AM", "8:00 PM", "All Day"),
                    ("Saturday", "9:00 AM", "8:00 PM", "All Day"),
                    ("Sunday", "9:00 AM", "8:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-16'),
                updated_at: Date('2026-09-16'),
            },

            {
                uuid: '8ac38d2c-bf68-11f1-8280-00155de17b17',
                name: 'Cafe Carmichael',
                address: 'Carmichael College',
                tags: ['Meals'],
                hours: [
                    ("Monday", "8:00 AM", "5:00 PM", "All Day"),
                    ("Tuesday", "8:00 AM", "5:00 PM", "All Day"),
                    ("Wednesday", "8:00 AM", "5:00 PM", "All Day"),
                    ("Thursday", "8:00 AM", "5:00 PM", "All Day"),
                    ("Friday", "8:00 AM", "3:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-15'),
                updated_at: Date('2026-09-15')
                },

                {
                uuid: '9042d4c4-bf68-11f1-8d0a-00155de17b17',
                name: 'The Pub at Overcup Oak',
                address: 'Rand Hall',
                tags: ['Meals'],
                hours: [
                    ("Monday", "11:00 AM", "10:00 PM", "All Day"),
                    ("Tuesday", "11:00 AM", "10:00 PM", "All Day"),
                    ("Wednesday", "11:00 AM", "10:00 PM", "All Day"),
                    ("Thursday", "11:00 AM", "10:00 PM", "All Day"),
                    ("Friday", "11:00 AM", "11:00 PM", "All Day"),
                    ("Saturday", "12:00 PM", "11:00 PM", "All Day"),
                    ("Sunday", "12:00 PM", "9:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-14'),
                updated_at: Date('2026-09-14')
                
            },

            {
                uuid: '94caa936-bf68-11f1-a27b-00155de17b17',
                name: 'Zeppos Dining',
                address: 'Zeppos College',
                tags: ['All You Can Eat'],
                hours: [
                    ("Monday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Tuesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Wednesday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Thursday", "7:00 AM", "9:00 PM", "All Day"),
                    ("Friday", "7:00 AM", "8:00 PM", "All Day"),
                    ("Saturday", "9:00 AM", "8:00 PM", "All Day"),
                    ("Sunday", "9:00 AM", "8:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-13'),
                updated_at: Date('2026-09-13')
            },

                {
                uuid: '99b8727a-bf68-11f1-b6fa-00155de17b17',
                name: 'West End Bagel Co Production',
                address: 'West End',
                tags: ['Meals'],
                hours: [
                    ("Monday", "7:00 AM", "3:00 PM", "All Day"),
                    ("Tuesday", "7:00 AM", "3:00 PM", "All Day"),
                    ("Wednesday", "7:00 AM", "3:00 PM", "All Day"),
                    ("Thursday", "7:00 AM", "3:00 PM", "All Day"),
                    ("Friday", "7:00 AM", "3:00 PM", "All Day"),
                    ("Saturday", "8:00 AM", "3:00 PM", "All Day"),
                    ("Sunday", "8:00 AM", "3:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-13'),
                updated_at: Date('2026-09-13')
            },

            {
                uuid: '9e7fff76-bf68-11f1-a0fa-00155de17b17',
                name: 'Local Java Cafe at Alumni',
                address: 'Alumni Hall',
                tags: ['Meals'],
                hours: [
                    ("Monday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Tuesday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Wednesday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Thursday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Friday", "7:30 AM", "4:00 PM", "All Day"),
                    ("Saturday", "8:00 AM", "5:00 PM", "All Day"),
                    ("Sunday", "8:00 AM", "5:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-12'),
                updated_at: Date('2026-09-12')
            },

            {
                uuid: 'a7e7ebaa-bf68-11f1-ab13-00155de17b17',
                name: 'VandyBlenz',
                address: 'Rand Hall',
                tags: ['Meals'],
                hours: [
                    ("Monday", "8:00 AM", "7:00 PM", "All Day"),
                    ("Tuesday", "8:00 AM", "7:00 PM", "All Day"),
                    ("Wednesday", "8:00 AM", "7:00 PM", "All Day"),
                    ("Thursday", "8:00 AM", "7:00 PM", "All Day"),
                    ("Friday", "8:00 AM", "5:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-11'),
                updated_at: Date('2026-09-11')
            },

            {
                uuid: 'ab7be104-bf68-11f1-ad63-00155de17b17',
                name: 'Wasabi',
                address: 'Rand Hall',
                tags: ['Meals'],
                hours: [
                    ("Monday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Tuesday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Wednesday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Thursday", "11:00 AM", "8:00 PM", "All Day"),
                    ("Friday", "11:00 AM", "7:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-10'),
                updated_at: Date('2026-09-10')
            },

            {
                uuid: 'b02c17fa-bf68-11f1-ab42-00155de17b17',
                name: 'Suzies',
                address: 'Various Locations',
                tags: ['Meals'],
                hours: [
                    ("Monday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Tuesday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Wednesday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Thursday", "7:30 AM", "5:00 PM", "All Day"),
                    ("Friday", "7:30 AM", "4:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-09'),
                updated_at: Date('2026-09-09')
            },

            {
                uuid: 'b58fd57e-bf68-11f1-89c9-00155de17b17',
                name: 'Holy Smokes Kosher Food Truck',
                address: 'Central Campus',
                tags: ['Meals'],
                hours: [
                    ("Monday", "11:00 AM", "7:00 PM", "All Day"),
                    ("Tuesday", "11:00 AM", "7:00 PM", "All Day"),
                    ("Wednesday", "11:00 AM", "7:00 PM", "All Day"),
                    ("Thursday", "11:00 AM", "7:00 PM", "All Day"),
                ],
                created_at: Date('2026-09-08'),
                updated_at: Date('2026-09-08')
                },
            ]

        # Optional: make the seed script safe to run repeatedly
        locations.delete_many({})

        result = locations.insert_many(seed_data)

        print(f"Inserted {len(result.inserted_ids)} locations.")

    except PyMongoError as e:
        print(f"MongoDB error: {e}")

    finally:
        client.close()


if __name__ == "__main__":
    seed_locations()
