from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.project import Project
from app.schemas.project import Project as ProjectSchema, ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=List[ProjectSchema])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectSchema)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

import uuid

@router.post("/", response_model=ProjectSchema)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.model_dump(), project_identifier=str(uuid.uuid4()))
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(project_id: int, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.name = project_update.name
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    from app.models.chat import Chat
    from app.models.message import Message
    
    chats = db.query(Chat).filter(Chat.project_id == project_id).all()
    chat_ids = [c.id for c in chats]
    
    if chat_ids:
        db.query(Message).filter(Message.chat_id.in_(chat_ids)).delete(synchronize_session=False)
        db.query(Chat).filter(Chat.project_id == project_id).delete(synchronize_session=False)
        
    db.delete(project)
    db.commit()
    return {"status": "deleted"}

@router.get("/{project_id}/brief")
def get_project_brief(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    from app.services.hindsight_service import HindsightService
    hs = HindsightService()
    
    recall_res = hs.recall(project.project_identifier, "project memories")
    facts = recall_res.get("results") or []
    if len(facts) == 0:
        return {
            "status": "empty",
            "content": None,
            "last_refreshed_at": None
        }

    brief = hs.get_or_create_project_brief(project.project_identifier)
    
    if not brief:
        return {"status": "not_found", "content": None}
        
    content = brief.get("content")
    is_updating = not content or "Generating content" in content or brief.get("is_stale", False)
        
    return {
        "status": "updating" if is_updating else "ready",
        "content": content,
        "last_refreshed_at": brief.get("last_refreshed_at")
    }
