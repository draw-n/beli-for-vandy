from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from auth.repository import AccountRepository
from auth.router import router as auth_router
from database import client, db
from settings import get_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    await client.admin.command("ping")
    await AccountRepository(db).ensure_indexes()
    try:
        yield
    finally:
        await client.close()


app = FastAPI(title="Beli for Vanderbilt API", lifespan=lifespan)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Beli for Vanderbilt API is up and running!"}


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
