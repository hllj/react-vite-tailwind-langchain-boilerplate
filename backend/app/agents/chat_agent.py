from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, Union, AsyncGenerator, Any
import os
import traceback
import urllib.parse
import requests
import base64
import google.generativeai as genai
from io import BytesIO
from pathlib import Path
from dotenv import load_dotenv

# Make sure environment variables are loaded
load_dotenv()

class ChatAgent:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        
        # Get API base URL from environment (default for local development)
        self.base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        
        # Configure genai with API key for model listing
        genai.configure(api_key=api_key)
        
        # Set the correct model names after checking available models
        self.text_model_name = "gemini-1.5-pro"  # Updated from gemini-2.0-flash
        self.vision_model_name = "gemini-1.5-pro" # Updated from gemini-2.0-pro-vision
        
        # Print available models for debugging
        self._list_available_models()
        
        # Non-streaming client for text-only
        self.gemini_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model=self.text_model_name,
            temperature=0.7
        )
        
        # Vision model for images
        self.vision_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model=self.vision_model_name,
            temperature=0.7
        )
        
        # Streaming-enabled clients
        self.gemini_streaming_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model=self.text_model_name,
            temperature=0.7,
            streaming=True
        )
        
        self.vision_streaming_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model=self.vision_model_name,
            temperature=0.7,
            streaming=True
        )
        
        # Add a simple cache for processed images to avoid redundant processing
        self._image_cache = {}
    
    def _list_available_models(self):
        """List available Gemini models and their supported methods (for debugging)"""
        try:
            models = genai.list_models()
            print("Available Gemini models:")
            for model in models:
                if "gemini" in model.name:
                    print(f"- {model.name}")
                    print(f"  Supported generation methods: {model.supported_generation_methods}")
        except Exception as e:
            print(f"Error listing models: {e}")
    
    def _is_multimodal_request(self, messages: List[Dict[str, Any]]) -> bool:
        """Detect if a request contains multimodal content (images)"""
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        return True
        return False

    def _process_image(self, image_url: str) -> Dict[str, Any]:
        """Process image URL to ensure it's in a format Gemini can use"""
        # Check cache first
        if image_url in self._image_cache:
            print(f"Using cached image data for {image_url}")
            return self._image_cache[image_url]
            
        try:
            # For absolute URLs from external sources
            if image_url.startswith(('http://')) and not image_url.startswith('http://localhost'):
                # Download the image
                print(f"Downloading external image from {image_url}")
                response = requests.get(image_url, timeout=10)  # Shorter timeout for external resources
                response.raise_for_status()
                
                # Get the image data and content type
                image_data = response.content
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                
                # Convert to base64
                base64_image = base64.b64encode(image_data).decode('utf-8')
                data_url = f"data:{content_type};base64,{base64_image}"
                
                # Cache the result
                self._image_cache[image_url] = {"url": data_url}
                return {"url": data_url}
                
            # For HTTPS URLs (typical external resources)
            elif image_url.startswith('https://'):
                print(f"Downloading HTTPS image from {image_url}")
                response = requests.get(image_url, timeout=10)  # Shorter timeout
                response.raise_for_status()
                
                image_data = response.content
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                
                base64_image = base64.b64encode(image_data).decode('utf-8')
                data_url = f"data:{content_type};base64,{base64_image}"
                
                # Cache the result
                self._image_cache[image_url] = {"url": data_url}
                return {"url": data_url}
                
            # Handle relative URLs from local uploads by directly accessing the filesystem
            elif image_url.startswith('/uploads/'):
                # Extract filename and find the file on disk
                filename = os.path.basename(image_url)
                encoded_filename = urllib.parse.unquote(filename)  # Ensure filename is properly decoded
                
                # Construct the path to the file in the uploads directory
                # Note: The uploads directory is at the root level of the project
                uploads_dir = Path("uploads")  # Use Path for better cross-platform compatibility
                file_path = uploads_dir / encoded_filename
                
                print(f"Reading local file from {file_path}")
                
                if not file_path.exists():
                    raise FileNotFoundError(f"Image file not found: {file_path}")
                
                # Read the file directly from disk
                with open(file_path, "rb") as f:
                    image_data = f.read()
                
                # Determine content type from file extension
                content_type = 'image/jpeg'  # Default
                if filename.lower().endswith('.png'):
                    content_type = 'image/png'
                elif filename.lower().endswith('.gif'):
                    content_type = 'image/gif'
                elif filename.lower().endswith('.webp'):
                    content_type = 'image/webp'
                
                base64_image = base64.b64encode(image_data).decode('utf-8')
                data_url = f"data:{content_type};base64,{base64_image}"
                
                print(f"Successfully processed local image (size: {len(image_data)} bytes)")
                
                # Cache the result
                self._image_cache[image_url] = {"url": data_url}
                return {"url": data_url}
                
            else:
                # If it's already a data URL
                if image_url.startswith('data:'):
                    return {"url": image_url}
                else:
                    raise ValueError(f"Unsupported image URL format: {image_url}")
        except Exception as e:
            print(f"Error processing image {image_url}: {str(e)}")
            traceback.print_exc()
            raise ValueError(f"Failed to process image: {str(e)}")

    def _fix_image_urls(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert image URLs to a format compatible with Gemini"""
        fixed_messages = []
        
        for msg in messages:
            content = msg.get("content", "")
            
            # Handle multimodal content (list of parts)
            if isinstance(content, list):
                fixed_parts = []
                
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        image_url = part.get("image_url", {}).get("url", "")
                        
                        # Skip empty URLs
                        if not image_url:
                            print("Warning: Empty image URL detected, skipping")
                            continue
                            
                        try:
                            # Process the image to get a data URL
                            processed_image = self._process_image(image_url)
                            part["image_url"] = processed_image
                            fixed_parts.append(part)
                        except Exception as e:
                            print(f"Error processing image, skipping: {str(e)}")
                    else:
                        fixed_parts.append(part)
                
                fixed_msg = {**msg, "content": fixed_parts}
            else:
                fixed_msg = msg
            
            fixed_messages.append(fixed_msg)
        
        return fixed_messages

    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[Union[HumanMessage, AIMessage, SystemMessage]]:
        """Convert dict messages to LangChain message format"""
        # First fix any image URLs
        messages = self._fix_image_urls(messages)
        
        converted_messages = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            # Handle different message roles
            if role == "user":
                converted_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                converted_messages.append(AIMessage(content=content))
            elif role == "system":
                converted_messages.append(SystemMessage(content=content))
                
        return converted_messages

    async def get_response(self, messages: List[Dict[str, Any]], model: str = None) -> str:
        """Get response from Gemini model"""
        try:
            # Use provided model or default to text model
            if not model or "vision" not in model:
                model_to_use = self.text_model_name
            else:
                model_to_use = self.vision_model_name
                
            print(f"Using model: {model_to_use} for request")
                
            # Convert messages to LangChain format
            converted_messages = self._convert_messages(messages)
            
            # Choose the appropriate client based on content and model
            is_multimodal = self._is_multimodal_request(messages)
            client = self.vision_client if is_multimodal else self.gemini_client
            
            # Make the request
            response = await client.ainvoke(converted_messages)
            return response.content
        except Exception as e:
            raise Exception(f"Error getting response from Gemini: {str(e)}")
    
    async def get_streaming_response(self, messages: List[Dict[str, Any]], model: str = None) -> AsyncGenerator[str, None]:
        """Get streaming response from Gemini model"""
        try:
            # Use provided model or default to text model
            if not model or "vision" not in model:
                model_to_use = self.text_model_name
            else:
                model_to_use = self.vision_model_name
                
            print(f"Using model: {model_to_use} for streaming request")
            
            print("Converting messages for streaming...")
            converted_messages = self._convert_messages(messages)
            
            # Choose the appropriate streaming client based on content and model
            is_multimodal = self._is_multimodal_request(messages)
            client = self.vision_streaming_client if is_multimodal else self.gemini_streaming_client
            
            print(f"Starting streaming response with model: {model_to_use}, multimodal: {is_multimodal}")
            
            if is_multimodal:
                print("Multimodal request details:")
                for i, msg in enumerate(converted_messages):
                    if hasattr(msg, 'content') and isinstance(msg.content, list):
                        for j, part in enumerate(msg.content):
                            if hasattr(part, 'type') and part.type == 'image_url':
                                print(f"  Message {i}, Part {j}: {part.image_url}")
            
            # Stream the response
            stream = client.astream(converted_messages)
            
            # Yield each chunk as it arrives
            async for chunk in stream:
                if hasattr(chunk, 'content') and chunk.content:
                    print(f"Yielding content: {chunk.content[:20]}...")
                    yield chunk.content
                else:
                    print(f"Received chunk without content: {type(chunk)}")
            
            print("Streaming complete")
        except Exception as e:
            print(f"Error in get_streaming_response: {str(e)}")
            print(traceback.format_exc())
            raise Exception(f"Error getting streaming response from Gemini: {str(e)}")