from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from controllers.user import UserController
from database import client, db
from routes.user import router as user_router
from settings import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    await client.admin.command("ping")
    settings = get_settings()
    await UserController(db, settings.session_ttl_seconds).ensure_indexes()
    try:
        yield
    finally:
        await client.close()


app = FastAPI(title="Beli for Vanderbilt API", lifespan=lifespan)
app.include_router(user_router)


@app.get("/")
async def root():
    return {"message": "Beli for Vanderbilt API is up and running!"}


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
