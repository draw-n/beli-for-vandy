from fastapi import FastAPI
import os
from dotenv import load_dotenv
import uvicorn

# Load variables from .env file
load_dotenv()
PORT = int(os.getenv("PORT", 8000))  # Default to 8000 if not set
HOST = os.getenv("HOST", "localhost")  # Default to localhost if not set

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)