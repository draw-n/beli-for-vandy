from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from api.user import router as user_router
from controllers.user import UserController
from database import client, db
from settings import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    await client.admin.command("ping")
    await UserController(db).ensure_indexes()
    try:
        yield
    finally:
        await client.close()


app = FastAPI(
    title="Beli for Vanderbilt API",
    description="API for Vanderbilt dining discovery, ratings, reviews, and friends.",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(user_router)


@app.get("/", tags=["System"], summary="Check API health")
async def root():
    return {"message": "Beli for Vanderbilt API is up and running!"}


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
