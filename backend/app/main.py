from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .routers import chat
from .socket_manager import socket_app
import os

# Load environment variables at the very beginning
load_dotenv()

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

# Include routers
app.include_router(chat.router)

# Mount the Socket.IO app - note we're mounting at the root level now
app.mount("/", socket_app)

@app.get("/api/health")
async def root():
    return {"message": "Welcome to Agent Chat API"}