import asyncio
import socketio
import traceback
from typing import Dict, Any, List, Union

# Create a Socket.IO server instance with proper CORS configuration and longer timeouts
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:5173"],  # Be explicit about allowed origins
    logger=True,  # Enable logging for debugging
    engineio_logger=True,  # Enable Engine.IO logging
    ping_timeout=60,  # Increase ping timeout to 60s (default is 20s)
    ping_interval=25,  # Shorter ping interval to detect disconnections earlier
    max_http_buffer_size=5 * 1024 * 1024  # Increase buffer size for larger messages (5MB)
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
        # Get the model from the request or use default (let the agent decide)
        model = data.get('model')
        
        # Start streaming response
        async for token in chat_agent.get_streaming_response(
            messages=data.get('messages', []),
            model=model
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
            'model': model or chat_agent.text_model_name  # Use the actual model name
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
    model = data.get('model')  # Get model but let the agent decide which one to use
    
    print(f"Processing multimodal request with {len(file_urls)} files")
    
    # Log the URLs for debugging
    for i, url in enumerate(file_urls):
        print(f"File URL {i+1}: {url}")
    
    # Notify client that processing is starting
    await sio.emit('chat_start', {}, to=sid)
    await asyncio.sleep(0.1)
    
    try:
        # Special debug message for multimodal requests
        print(f"Starting multimodal request processing for client {sid}")
        
        # Keep connection alive during potentially long processing
        await sio.emit('heartbeat', {'status': 'processing'}, to=sid)
        
        # Send periodic heartbeats during the potentially long image processing
        heartbeat_task = asyncio.create_task(send_periodic_heartbeats(sid))
        
        try:
            # Log the message content
            for i, msg in enumerate(messages):
                print(f"Message {i+1} role: {msg.get('role', 'unknown')}")
                content = msg.get('content', '')
                
                if isinstance(content, list):
                    print(f"  Message {i+1} has {len(content)} content parts")
                    for j, part in enumerate(content):
                        part_type = part.get('type', 'unknown')
                        print(f"    Part {j+1} type: {part_type}")
                        
                        if part_type == 'image_url':
                            # Only log the start of the URL to avoid flooding logs
                            img_url = part.get('image_url', {}).get('url', 'none')
                            print(f"    Part {j+1} image URL: {img_url[:50]}...")
            
            # Start streaming response - pass the multimodal content
            token_count = 0
            async for token in chat_agent.get_streaming_response(
                messages=messages,
                model=model
            ):
                # Check if client is still connected
                if sid not in connected_clients:
                    print(f"Client {sid} disconnected during streaming, stopping generation")
                    break
                    
                # Process the same way as regular text responses
                if token and isinstance(token, str):
                    if token not in streaming_sessions[sid]["last_tokens"]:
                        await sio.emit('chat_token', {'token': token}, to=sid)
                        streaming_sessions[sid]["full_response"] += token
                        
                        last_tokens = streaming_sessions[sid]["last_tokens"]
                        last_tokens.add(token)
                        if len(last_tokens) > 5:
                            last_tokens.pop()
                        
                        # Send heartbeat every 20 tokens to keep connection alive
                        token_count += 1
                        if token_count % 20 == 0:
                            await sio.emit('heartbeat', {'status': 'generating'}, to=sid)
                            
                        await asyncio.sleep(0.01)
                    else:
                        print(f"Skipping duplicate token: {token}")
            
            # Signal the end of streaming
            if sid in connected_clients:
                await sio.emit('chat_complete', {
                    'status': 'success',
                    'model': chat_agent.vision_model_name  # Use the actual vision model name
                }, to=sid)
            
            # Clean up
            if sid in streaming_sessions:
                del streaming_sessions[sid]
                
        finally:
            # Cancel the heartbeat task when done or on error
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
            
    except Exception as e:
        print(f"Error in multimodal_chat_request for {sid}: {str(e)}")
        print(traceback.format_exc())  # Print full traceback for debugging
        
        if sid in connected_clients:
            await sio.emit('chat_error', {
                'status': 'error',
                'message': f"Error processing image request: {str(e)}"
            }, to=sid)
        
        if sid in streaming_sessions:
            del streaming_sessions[sid]

# New helper function to send periodic heartbeats
async def send_periodic_heartbeats(sid):
    """Send periodic heartbeats to keep the connection alive during long processing"""
    try:
        while True:
            if sid not in connected_clients:
                break
                
            await sio.emit('heartbeat', {'status': 'processing'}, to=sid)
            await asyncio.sleep(5)  # Send heartbeat every 5 seconds
    except asyncio.CancelledError:
        # Expected when the task is cancelled
        pass
    except Exception as e:
        print(f"Error in heartbeat task: {str(e)}")
