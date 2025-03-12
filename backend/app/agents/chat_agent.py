from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, Union, AsyncGenerator, Any
import os
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
        
        # Non-streaming client for text-only
        self.gemini_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-flash",
            temperature=0.7
        )
        
        # Vision model for images
        self.vision_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-pro-vision",
            temperature=0.7
        )
        
        # Streaming-enabled clients
        self.gemini_streaming_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-flash",
            temperature=0.7,
            streaming=True
        )
        
        self.vision_streaming_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-pro-vision",
            temperature=0.7,
            streaming=True
        )

    def _is_multimodal_request(self, messages: List[Dict[str, Any]]) -> bool:
        """Detect if a request contains multimodal content (images)"""
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        return True
        return False

    def _fix_image_urls(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert relative image URLs to absolute URLs"""
        fixed_messages = []
        
        for msg in messages:
            content = msg.get("content", "")
            
            # Handle multimodal content (list of parts)
            if isinstance(content, list):
                fixed_parts = []
                
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        image_url = part.get("image_url", {}).get("url", "")
                        
                        # Convert relative URLs to absolute URLs
                        if image_url.startswith("/uploads/"):
                            absolute_url = f"{self.base_url}{image_url}"
                            part["image_url"]["url"] = absolute_url
                            print(f"Converted URL: {image_url} -> {absolute_url}")
                            
                        fixed_parts.append(part)
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

    async def get_response(self, messages: List[Dict[str, Any]], model: str = "gemini-2.0-flash") -> str:
        """Get response from Gemini model"""
        try:
            # Convert messages to LangChain format
            converted_messages = self._convert_messages(messages)
            
            # Choose the appropriate client based on content and model
            is_multimodal = self._is_multimodal_request(messages)
            client = self.vision_client if (is_multimodal or "vision" in model) else self.gemini_client
            
            # Make the request
            response = await client.ainvoke(converted_messages)
            return response.content
        except Exception as e:
            raise Exception(f"Error getting response from Gemini: {str(e)}")
    
    async def get_streaming_response(self, messages: List[Dict[str, Any]], model: str = "gemini-2.0-flash") -> AsyncGenerator[str, None]:
        """Get streaming response from Gemini model"""
        try:
            print("Converting messages for streaming...")
            converted_messages = self._convert_messages(messages)
            
            # Choose the appropriate streaming client based on content and model
            is_multimodal = self._is_multimodal_request(messages)
            client = self.vision_streaming_client if (is_multimodal or "vision" in model) else self.gemini_streaming_client
            
            print(f"Starting streaming response with model: {model}, multimodal: {is_multimodal}")
            
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
            import traceback
            print(f"Error in get_streaming_response: {str(e)}")
            print(traceback.format_exc())
            raise Exception(f"Error getting streaming response from Gemini: {str(e)}")