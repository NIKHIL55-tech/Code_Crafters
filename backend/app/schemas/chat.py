from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ChatBase(BaseModel):
    title: str

class ChatCreate(ChatBase):
    project_id: int

class ChatUpdate(BaseModel):
    title: str

class Chat(ChatBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
