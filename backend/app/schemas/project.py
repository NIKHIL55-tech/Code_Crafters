from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    persona: str

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: str

class Project(ProjectBase):
    id: int
    project_identifier: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
