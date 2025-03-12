from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, Union
import os
from dotenv import load_dotenv

# Make sure environment variables are loaded
load_dotenv()

class ChatAgent:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
            
        self.gemini_client = ChatGoogleGenerativeAI(
            api_key=api_key,  # Changed from google_api_key to api_key
            model="gemini-2.0-flash",
            temperature=0.7
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