from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    chat_id: int

class Message(MessageBase):
    id: int
    chat_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    chat_id: int
    message: str
    memory_enabled: bool = False
