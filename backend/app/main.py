from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pathlib import Path
from .routers import chat, upload
from .socket_manager import socket_app
import os

# Load environment variables at the very beginning
load_dotenv()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Agent Chat API")

# Configure CORS - make sure to allow all needed origins
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]  # Add both localhost and IP

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files server for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(chat.router)
app.include_router(upload.router)

# Mount the Socket.IO app - note we're mounting at the root level now
app.mount("/", socket_app)

@app.get("/api/health")
async def root():
    return {"message": "Welcome to Agent Chat API"}