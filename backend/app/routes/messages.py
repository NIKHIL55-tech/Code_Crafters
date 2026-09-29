from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.message import ChatRequest
from app.models.chat import Chat
from app.models.message import Message
from app.models.project import Project
from app.services.groq_service import GroqService
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/messages", tags=["messages"])
groq_service = GroqService()
memory_service = MemoryService()

@router.post("/chat")
def handle_chat(request: ChatRequest, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == request.chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    project = db.query(Project).filter(Project.id == chat.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Recall
    memory_data = memory_service.get_context(project.project_identifier, request.message, request.memory_enabled)
    context_str = memory_data.get("context_str")
    
    # 1.5 Get recent chat history
    recent_messages = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at.asc()).all()[-10:]
    history = [{"role": m.role, "content": m.content} for m in recent_messages]
    
    # 2. Call Groq
    persona = project.persona if project.persona else "You are a helpful AI assistant."
    response_text = groq_service.generate_response(
        request.message, 
        memory_context=context_str, 
        persona=persona, 
        memory_enabled=request.memory_enabled,
        chat_history=history
    )
    
    # 3. Store messages
    user_message_db = Message(chat_id=chat.id, role="user", content=request.message)
    db.add(user_message_db)
    
    assistant_message_db = Message(chat_id=chat.id, role="assistant", content=response_text)
    db.add(assistant_message_db)
    db.commit()
    
    # 4. Retain
    memory_service.retain_interaction(project.project_identifier, request.message, response_text)
    
    return {
        "response": response_text,
        "memory_used": request.memory_enabled,
        "memory_data": memory_data.get("raw_response")
    }

from typing import List
from app.schemas.message import Message as MessageSchema

@router.get("/chat/{chat_id}", response_model=List[MessageSchema])
def get_chat_messages(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
