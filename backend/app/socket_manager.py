import asyncio
import socketio
from typing import Dict, Any, List, Union

# Create a Socket.IO server instance with proper CORS configuration
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:5173"],  # Be explicit about allowed origins
    logger=True,  # Enable logging for debugging
    engineio_logger=True  # Enable Engine.IO logging
)

# Remove cors_allowed_origins parameter from ASGIApp constructor as it's not supported
socket_app = socketio.ASGIApp(
    sio,
    socketio_path="socket.io"  # Use the default Socket.IO path
)

connected_clients = {}
# Track streaming sessions to prevent duplicate tokens
streaming_sessions = {}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    connected_clients[sid] = True

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in connected_clients:
        del connected_clients[sid]
    if sid in streaming_sessions:
        del streaming_sessions[sid]

@sio.event
async def chat_request(sid, data):
    """Handle chat requests from clients and stream responses"""
    from .agents.chat_agent import ChatAgent
    
    chat_agent = ChatAgent()
    print(f"Received chat request from {sid}: {data}")
    
    # Reset session tracking for this client
    streaming_sessions[sid] = {"last_tokens": set(), "full_response": ""}
    
    # Notify client that processing is starting
    await sio.emit('chat_start', {}, to=sid)
    await asyncio.sleep(0.1)  # Small delay to ensure the start message is processed
    
    try:
        # Start streaming response
        async for token in chat_agent.get_streaming_response(
            messages=data.get('messages', []),
            model=data.get('model', 'gemini-2.0-flash')
        ):
            # Ensure token is a string and not empty
            if token and isinstance(token, str):
                # Check if this is a new token
                if token not in streaming_sessions[sid]["last_tokens"]:
                    print(f"Sending token to {sid}: {token}")
                    # Emit each token as it arrives
                    await sio.emit('chat_token', {'token': token}, to=sid)
                    streaming_sessions[sid]["full_response"] += token
                    
                    # Keep track of last few tokens to avoid duplicates
                    # Store only the last 5 tokens to avoid memory issues
                    last_tokens = streaming_sessions[sid]["last_tokens"]
                    last_tokens.add(token)
                    if len(last_tokens) > 5:
                        last_tokens.pop()
                    
                    # Small delay to see the streaming effect
                    await asyncio.sleep(0.01)
                else:
                    print(f"Skipping duplicate token: {token}")
        
        print(f"Chat complete for {sid}, full response length: {len(streaming_sessions[sid]['full_response'])}")
        # Signal the end of streaming with the complete response
        await sio.emit('chat_complete', {
            'status': 'success',
            'model': data.get('model', 'gemini-2.0-flash')
        }, to=sid)
        
        # Clean up the session data
        if sid in streaming_sessions:
            del streaming_sessions[sid]
            
    except Exception as e:
        print(f"Error in chat_request for {sid}: {str(e)}")
        # Handle errors
        await sio.emit('chat_error', {
            'status': 'error',
            'message': str(e)
        }, to=sid)
        
        # Clean up the session data
        if sid in streaming_sessions:
            del streaming_sessions[sid]

@sio.event
async def multimodal_chat_request(sid, data):
    """Handle multimodal chat requests containing images and text"""
    from .agents.chat_agent import ChatAgent
    
    chat_agent = ChatAgent()
    print(f"Received multimodal chat request from {sid}")
    
    # Reset session tracking for this client
    streaming_sessions[sid] = {"last_tokens": set(), "full_response": ""}
    
    # Extract data from the request
    messages = data.get('messages', [])
    file_urls = data.get('fileUrls', [])
    model = data.get('model', 'gemini-2.0-pro-vision')  # Default to vision model
    
    print(f"Processing multimodal request with {len(file_urls)} files and model {model}")
    
    # Log the URLs for debugging
    for i, url in enumerate(file_urls):
        print(f"File URL {i+1}: {url}")
    
    # Notify client that processing is starting
    await sio.emit('chat_start', {}, to=sid)
    await asyncio.sleep(0.1)
    
    try:
        # Start streaming response - pass the multimodal content
        async for token in chat_agent.get_streaming_response(
            messages=messages,
            model=model
        ):
            # Process the same way as regular text responses
            if token and isinstance(token, str):
                if token not in streaming_sessions[sid]["last_tokens"]:
                    await sio.emit('chat_token', {'token': token}, to=sid)
                    streaming_sessions[sid]["full_response"] += token
                    
                    last_tokens = streaming_sessions[sid]["last_tokens"]
                    last_tokens.add(token)
                    if len(last_tokens) > 5:
                        last_tokens.pop()
                    
                    await asyncio.sleep(0.01)
                else:
                    print(f"Skipping duplicate token: {token}")
        
        # Signal the end of streaming
        await sio.emit('chat_complete', {
            'status': 'success',
            'model': model
        }, to=sid)
        
        # Clean up
        if sid in streaming_sessions:
            del streaming_sessions[sid]
            
    except Exception as e:
        print(f"Error in multimodal_chat_request for {sid}: {str(e)}")
        await sio.emit('chat_error', {
            'status': 'error',
            'message': str(e)
        }, to=sid)
        
        if sid in streaming_sessions:
            del streaming_sessions[sid]
