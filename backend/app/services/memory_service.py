from app.services.hindsight_service import HindsightService
import logging

logger = logging.getLogger(__name__)

class MemoryService:
    def __init__(self):
        self.hindsight = HindsightService()

    def get_context(self, project_id: str, message: str, memory_enabled: bool) -> dict:
        """Returns a dict with 'context_str' and 'raw_response'"""
        if not memory_enabled:
            return {"context_str": None, "raw_response": None}
            
        try:
            res = self.hindsight.recall(str(project_id), message)
            if not res:
                return {"context_str": None, "raw_response": None}
                
            results = res.get("results", [])
            expected_tag = f"project:{project_id}"
            results = [
                r for r in results 
                if expected_tag in r.get("tags", [])
            ][:5]
            
            if not results:
                return {"context_str": None, "raw_response": res}
                
            context_str = "\n".join([f"- {r.get('text', '')}" for r in results])
            
            # Update raw response to only include limited results
            res["results"] = results
            return {"context_str": context_str, "raw_response": res}
        except Exception as e:
            logger.error(f"Error in memory recall: {str(e)}")
            return {"context_str": None, "raw_response": None}

    def retain_interaction(self, project_id: str, user_msg: str, assistant_msg: str):
        from app.services.groq_service import GroqService
        groq_service = GroqService()
        
        evaluation = groq_service.evaluate_memory(user_msg, assistant_msg)
        
        if evaluation.get("should_retain") and evaluation.get("memory"):
            logger.info(f"Retaining memory for project {project_id}: {evaluation['memory']}")
            try:
                return self.hindsight.retain(str(project_id), evaluation["memory"])
            except Exception as e:
                logger.error(f"Error in memory retain: {str(e)}")
                return None
        else:
            logger.info(f"Memory rejected for project {project_id}: {evaluation.get('reason')}")
            return None
