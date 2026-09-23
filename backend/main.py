import os
from fastapi import FastAPI
from dotenv import load_dotenv
import uvicorn
from database import client

from routes.review import router as review_router

# Load environment variables from .env file
load_dotenv()

PORT = int(os.getenv("PORT", 8000))  # Default to 8000 if not set
HOST = os.getenv("HOST", "0.0.0.0")  # '0.0.0.0' or 'localhost'

app = FastAPI(title="Beli for Vanderbilt API")

@app.on_event("startup")
async def startup_db_client():
    try:
        # Ping the MongoDB cluster to verify connectivity
        await client.admin.command('ping')
        print("\n------------------------------------------------")
        print("Successfully connected to MongoDB Atlas!")
        print("------------------------------------------------\n")
    except Exception as e:
        print(f"\nFailed to connect to MongoDB: {e}\n")


app.include_router(review_router)

@app.get("/")
async def root():
    return {"message": "Beli for Vanderbilt API is up and running!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
