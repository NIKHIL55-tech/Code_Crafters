from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.chat import Chat
from app.models.project import Project
from app.schemas.chat import Chat as ChatSchema, ChatCreate, ChatUpdate

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("/project/{project_id}", response_model=List[ChatSchema])
def get_project_chats(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Chat).filter(Chat.project_id == project_id).order_by(Chat.created_at.desc()).all()

@router.get("/{chat_id}", response_model=ChatSchema)
def get_chat(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.post("/", response_model=ChatSchema)
def create_chat(chat: ChatCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == chat.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db_chat = Chat(**chat.model_dump())
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

@router.put("/{chat_id}", response_model=ChatSchema)
def update_chat(chat_id: int, chat_update: ChatUpdate, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat.title = chat_update.title
    db.commit()
    db.refresh(chat)
    return chat

@router.delete("/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Also delete associated messages (if cascade isn't set up, we should delete messages first)
    from app.models.message import Message
    db.query(Message).filter(Message.chat_id == chat_id).delete()
    
    db.delete(chat)
    db.commit()
    return {"status": "deleted"}
