from motor.motor_asyncio import AsyncIOMotorClient

from database import database_from_uri


def test_database_name_comes_from_connection_uri():
    client = AsyncIOMotorClient("mongodb://localhost:27017/beli_staging")

    try:
        assert database_from_uri(client).name == "beli_staging"
    finally:
        client.close()


def test_database_name_defaults_for_local_uri_without_path():
    client = AsyncIOMotorClient("mongodb://localhost:27017")

    try:
        assert database_from_uri(client).name == "beli_db"
    finally:
        client.close()
