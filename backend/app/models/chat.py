from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any

class ImageUrl(BaseModel):
    url: str

class ContentPart(BaseModel):
    type: str  # "text" or "image_url"
    text: Optional[str] = None
    image_url: Optional[ImageUrl] = None

class Message(BaseModel):
    role: str
    content: Union[str, List[ContentPart]]

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gemini-1.5-flash"  # Updated default model

class ChatResponse(BaseModel):
    response: str
    model: str