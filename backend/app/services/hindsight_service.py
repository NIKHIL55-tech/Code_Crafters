import urllib.request
import urllib.error
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class HindsightService:
    def __init__(self):
        self.api_key = settings.hindsight_api_key
        self.base_url = settings.hindsight_base_url
        self.bank_id = settings.hindsight_bank_id

    def _make_request(self, method: str, path: str, data: dict = None):
        if not self.api_key or not self.base_url or not self.bank_id:
            logger.warning("Hindsight credentials missing.")
            return None

        url = f"{self.base_url.rstrip('/')}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        req = urllib.request.Request(url, headers=headers, method=method)
        if data is not None:
            req.data = json.dumps(data).encode('utf-8')
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            logger.error(f"Hindsight HTTPError {e.code}: {e.reason}")
            try:
                logger.error(e.read().decode('utf-8'))
            except:
                pass
            return None
        except Exception as e:
            logger.error(f"Hindsight Request Error: {str(e)}")
            return None

    def retain(self, project_id: str, content: str):
        path = f"/v1/default/banks/{self.bank_id}/memories"
        payload = {
            "items": [
                {
                    "content": content,
                    "tags": [f"project:{project_id}"]
                }
            ]
        }
        return self._make_request("POST", path, payload)

    def recall(self, project_id: str, query: str):
        path = f"/v1/default/banks/{self.bank_id}/memories/recall"
        payload = {
            "query": query,
            "tags": [f"project:{project_id}"],
            "tags_match": "all_strict",
            "limit": 5
        }
        return self._make_request("POST", path, payload)

    def get_or_create_project_brief(self, project_id: str):
        # 1. Check if there are any durable memories for this project
        recall_res = self.recall(project_id, "project memories")
        items = recall_res.get("results", []) if recall_res else []
        
        # If zero project-specific durable memories, return empty status
        if not items:
            return {
                "status": "empty",
                "content": None,
                "last_refreshed_at": None
            }
            
        path = f"/v1/default/banks/{self.bank_id}/mental-models"
        res = self._make_request("GET", path)
        if res and "items" in res:
            for item in res["items"]:
                if f"project:{project_id}" in item.get("tags", []) and item.get("name") == "Project Brief":
                    mm_id = item.get("id")
                    if mm_id:
                        return self._make_request("GET", f"/v1/default/banks/{self.bank_id}/mental-models/{mm_id}")
        
        # Create it if it doesn't exist
        payload = {
            "name": "Project Brief",
            "source_query": "Summarize the current state of this project using its durable project memories. Include the architecture, technology stack, important requirements, key decisions, configuration, constraints, current implementation state, and important changes. Ignore conversational noise and temporary questions. Prefer the latest valid decisions when there are changes.",
            "tags": [f"project:{project_id}"],
            "trigger": {
                "refresh_after_consolidation": True,
                "tags_match": "all_strict",
                "exclude_mental_models": True
            }
        }
        create_res = self._make_request("POST", path, payload)
        
        # After creation, trigger a refresh explicitly
        if create_res and "mental_model_id" in create_res:
            mm_id = create_res["mental_model_id"]
            refresh_path = f"/v1/default/banks/{self.bank_id}/mental-models/{mm_id}/refresh"
            self._make_request("POST", refresh_path)
            
            res_after = self._make_request("GET", f"/v1/default/banks/{self.bank_id}/mental-models/{mm_id}")
            return res_after
                        
        return None
