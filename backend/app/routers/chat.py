from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Union, Optional, Dict, Any
from ..agents.chat_agent import ChatAgent
from ..models.chat import Message, ChatRequest, ChatResponse, ContentPart, ImageUrl

router = APIRouter(prefix="/chat", tags=["chat"])

chat_agent = ChatAgent()

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Convert Pydantic models to dictionaries for the agent
        messages = []
        for msg in request.messages:
            if isinstance(msg.content, str):
                messages.append({"role": msg.role, "content": msg.content})
            else:
                # Handle multimodal content
                messages.append({"role": msg.role, "content": [part.dict() for part in msg.content]})
        
        response = await chat_agent.get_response(
            messages=messages,
            model=request.model
        )
        return ChatResponse(response=response, model=request.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))