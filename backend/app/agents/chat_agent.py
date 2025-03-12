from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, Union, AsyncGenerator
import os
from dotenv import load_dotenv

# Make sure environment variables are loaded
load_dotenv()

class ChatAgent:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        
        # Non-streaming client
        self.gemini_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-flash",
            temperature=0.7
        )
        
        # Streaming-enabled client
        self.gemini_streaming_client = ChatGoogleGenerativeAI(
            api_key=api_key,
            model="gemini-2.0-flash",
            temperature=0.7,
            streaming=True
        )

    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Union[HumanMessage, AIMessage, SystemMessage]]:
        """Convert dict messages to LangChain message format"""
        converted_messages = []
        for msg in messages:
            content = msg["content"]
            if msg["role"] == "user":
                converted_messages.append(HumanMessage(content=content))
            elif msg["role"] == "assistant":
                converted_messages.append(AIMessage(content=content))
            elif msg["role"] == "system":
                converted_messages.append(SystemMessage(content=content))
        return converted_messages

    async def get_response(self, messages: List[Dict[str, str]], model: str = "gemini-2.0-flash") -> str:
        """Get response from Gemini model"""
        try:
            converted_messages = self._convert_messages(messages)
            response = await self.gemini_client.ainvoke(converted_messages)
            return response.content
        except Exception as e:
            raise Exception(f"Error getting response from Gemini: {str(e)}")
    
    async def get_streaming_response(self, messages: List[Dict[str, str]], model: str = "gemini-2.0-flash") -> AsyncGenerator[str, None]:
        """Get streaming response from Gemini model"""
        try:
            print("Converting messages for streaming...")
            converted_messages = self._convert_messages(messages)
            
            print("Starting streaming response with model:", model)
            # IMPORTANT: Don't use 'await' here - astream() returns an async generator directly
            stream = self.gemini_streaming_client.astream(converted_messages)
            
            # We need to iterate over the stream
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