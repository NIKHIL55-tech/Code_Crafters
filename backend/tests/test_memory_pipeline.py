import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine, get_db
from sqlalchemy.orm import sessionmaker
from app.models.project import Project
from app.models.chat import Chat

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    p1 = Project(name="Project A", persona="Persona A", project_identifier="test-uuid-1")
    p2 = Project(name="Project B", persona="Persona B", project_identifier="test-uuid-2")
    db.add(p1)
    db.add(p2)
    db.commit()
    
    c1 = Chat(project_id=p1.id, title="Chat 1")
    c2 = Chat(project_id=p2.id, title="Chat 2")
    db.add(c1)
    db.add(c2)
    db.commit()
    yield
    Base.metadata.drop_all(bind=test_engine)

@patch("app.routes.messages.groq_service")
@patch("app.routes.messages.memory_service")
def test_memory_disabled(mock_memory_service, mock_groq_service):
    mock_memory_service.get_context.return_value = {"context_str": None, "raw_response": None}
    mock_groq_service.generate_response.return_value = "Mocked Groq Response"
    
    response = client.post("/api/messages/chat", json={
        "chat_id": 1,
        "message": "Hello without memory",
        "memory_enabled": False
    })
    
    assert response.status_code == 200
    assert response.json()["response"] == "Mocked Groq Response"
    assert response.json()["memory_used"] is False
    
    mock_memory_service.get_context.assert_called_once_with("test-uuid-1", "Hello without memory", False)
    mock_groq_service.generate_response.assert_called_once_with(
        "Hello without memory", memory_context=None, persona="Persona A"
    )

@patch("app.routes.messages.groq_service")
@patch("app.routes.messages.memory_service")
def test_memory_enabled(mock_memory_service, mock_groq_service):
    mock_memory_service.get_context.return_value = {
        "context_str": "- Past memory", 
        "raw_response": {"results": [{"text": "Past memory"}]}
    }
    mock_groq_service.generate_response.return_value = "Mocked Groq Response with Memory"
    
    response = client.post("/api/messages/chat", json={
        "chat_id": 1,
        "message": "Hello with memory",
        "memory_enabled": True
    })
    
    assert response.status_code == 200
    assert response.json()["memory_used"] is True
    assert "results" in response.json()["memory_data"]
    
    mock_memory_service.get_context.assert_called_once_with("test-uuid-1", "Hello with memory", True)
    mock_groq_service.generate_response.assert_called_once_with(
        "Hello with memory", memory_context="- Past memory", persona="Persona A"
    )

from app.services.memory_service import MemoryService
from app.services.hindsight_service import HindsightService

@patch("app.services.groq_service.GroqService.evaluate_memory")
@patch.object(HindsightService, "recall")
@patch.object(HindsightService, "retain")
def test_memory_service_isolation(mock_retain, mock_recall, mock_evaluate_memory):
    mock_evaluate_memory.return_value = {"should_retain": True, "memory": "User: User msg\nAssistant: Assistant msg"}
    ms = MemoryService()
    ms.get_context("99", "Test memory", True)
    mock_recall.assert_called_once_with("99", "Test memory")
    ms.retain_interaction("99", "User msg", "Assistant msg")
    mock_retain.assert_called_once_with("99", "User: User msg\nAssistant: Assistant msg")

def test_hindsight_service_tags():
    hs = HindsightService()
    with patch.object(hs, "_make_request") as mock_make_request:
        hs.retain("proj-123", "Some content")
        called_payload = mock_make_request.call_args[0][2]
        assert called_payload["items"][0]["tags"] == ["project:proj-123"]
        
        hs.recall("proj-456", "Some query")
        called_payload = mock_make_request.call_args[0][2]
        assert called_payload["tags"] == ["project:proj-456"]
