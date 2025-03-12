from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from ..agents.chat_agent import ChatAgent

router = APIRouter(prefix="/chat", tags=["chat"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "gemini-2.0-flash"

class ChatResponse(BaseModel):
    response: str
    model: str

chat_agent = ChatAgent()

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await chat_agent.get_response(
            messages=[{"role": msg.role, "content": msg.content} for msg in request.messages],
            model=request.model
        )
        return ChatResponse(response=response, model=request.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 