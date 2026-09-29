import pytest
from unittest.mock import patch, MagicMock
from app.services.hindsight_service import HindsightService

def test_get_or_create_project_brief_empty():
    hs = HindsightService()
    with patch.object(hs, "recall") as mock_recall:
        # Mock Hindsight returning 0 results
        mock_recall.return_value = {"results": []}
        
        result = hs.get_or_create_project_brief("proj-empty")
        
        mock_recall.assert_called_once_with("proj-empty", "project memories")
        assert result == {
            "status": "empty",
            "content": None,
            "last_refreshed_at": None
        }

@patch.object(HindsightService, "_make_request")
def test_get_or_create_project_brief_has_memories(mock_make_request):
    hs = HindsightService()
    
    with patch.object(hs, "recall") as mock_recall:
        # 1. Hindsight recall returns valid results
        mock_recall.return_value = {"results": [{"id": "m1", "text": "MERN stack memory"}]}
        
        # Mock the mental models endpoint
        # First call gets the mental models list
        # We'll simulate no existing mental model, so it creates one
        mock_make_request.side_effect = [
            {"items": []}, # GET /mental-models
            {"mental_model_id": "mm-new"}, # POST create
            None, # POST refresh
            {"status": "updating", "content": "Generating content..."} # GET instance
        ]
        
        result = hs.get_or_create_project_brief("proj-full")
        
        # 2. It recognizes those results and does NOT return "empty"
        mock_recall.assert_called_once_with("proj-full", "project memories")
        assert result is not None
        assert result.get("status") != "empty"
        assert mock_make_request.call_count == 4
