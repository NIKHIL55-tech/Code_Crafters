import urllib.request
import urllib.error
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.model = settings.groq_model or "llama3-8b-8192"

    def generate_response(self, user_message: str, memory_context: str = None, persona: str = "You are a helpful AI assistant.", memory_enabled: bool = True, chat_history: list = None) -> str:
        if not self.api_key:
            logger.warning("Groq credentials missing.")
            return "Error: Groq API key not configured."

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CodeCrafter/1.0"
        }
        
        system_prompt = persona if persona else "You are a helpful AI assistant."
        
        # General response guidelines to avoid inventing history and over-generating
        system_prompt += "\n\nRESPONSE GUIDELINES:\n"
        system_prompt += "- When a user makes a simple technology decision (e.g. 'I want to use MERN stack'), acknowledge it concisely. Do not proactively generate large tutorials, architecture plans, or starter code unless explicitly requested.\n"
        system_prompt += "- Do NOT assume unstated project history. For example, if a user selects a technology, do not assume they are migrating from another stack, or that the project already uses related ecosystem tools, unless they explicitly state it.\n"
        
        if not memory_enabled:
            system_prompt += "- PROJECT MEMORY IS CURRENTLY OFF. Do NOT use memories from previous chats/projects, Project Brief, or Memory Inspector.\n"
            system_prompt += "- Do NOT answer project-specific questions using information about ChatGPT, OpenAI, GPT, FastAPI, React, Hindsight, Groq, or Code Crafter's internal technology unless explicitly provided in the CURRENT conversation.\n"
            system_prompt += "- If the user asks for a project-specific fact not present in the current conversation, clearly say that you don't have that information because project memory is OFF.\n"
            system_prompt += "- You may use information explicitly stated earlier in the CURRENT conversation, and you may use general knowledge when answering general knowledge questions.\n"
        else:
            if memory_context:
                system_prompt += f"\n\nRETRIEVED PROJECT MEMORY:\n{memory_context}\n\n(Note: The above is retrieved memory from past conversations. Do not claim it is what the user just said now. Use it to inform your answers about the project.)"
            else:
                system_prompt += "\n\n(Note: Project memory is ON, but no relevant past memories were retrieved for this query. Do not hallucinate past project facts.)"
                
        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            for msg in chat_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
        messages.append({"role": "user", "content": f"CURRENT USER MESSAGE:\n{user_message}"})

        data = {
            "model": self.model,
            "messages": messages
        }

        req = urllib.request.Request(url, headers=headers, method="POST", data=json.dumps(data).encode('utf-8'))
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f"Groq API Error: {str(e)}")
            return "Error: Unable to generate response from Groq."

    def evaluate_memory(self, user_msg: str, assistant_msg: str) -> dict:
        if not self.api_key:
            return {"should_retain": False}
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CodeCrafter/1.0"
        }
        
        system_prompt = """You are a memory extraction gate. Analyze the user/assistant exchange.
Determine if it contains durable, useful project knowledge (e.g. project requirements, explicit project decisions, architecture decisions, technology choices, API/interface decisions, database/schema decisions, important configuration facts, persistent constraints, user preferences that materially affect the project, established implementation facts).
If it is just conversational noise, temporary debugging chatter, repeated questions, generic troubleshooting instructions, one-off diagnostic commands, generic systemctl/docker/kubectl/curl instructions, generic explanations, greetings, acknowledgements, or temporary errors, return should_retain=false.

CRITICAL: 
- Do not retain an exchange merely because it contains technical words (e.g. 'systemctl status nginx' is NOT durable project memory). Retain only if the information is useful for answering future questions about THIS PROJECT (e.g. 'Our production deployment uses Nginx as the reverse proxy').
- Extract ONLY explicit decisions. Do NOT invent unsupported facts such as 'The project is a full-stack JavaScript application' or 'The user migrated from JavaScript' unless the user actually established those facts explicitly.

Return JSON EXACTLY in this format:
{
  "should_retain": true or false,
  "memory_type": "PROJECT_DECISION" | "PROJECT_FACT" | "CONVERSATIONAL_NOISE" | "CLARIFICATION" | "REQUIREMENT" | "CONFIGURATION" | "CONSTRAINT" | "IMPORTANT_CHANGE",
  "memory": "Extract concisely the durable memory here, or null if false",
  "reason": "Why this was retained or not"
}"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User: {user_msg}\nAssistant: {assistant_msg}"}
        ]
        
        data = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"}
        }
        
        req = urllib.request.Request(url, headers=headers, method="POST", data=json.dumps(data).encode('utf-8'))
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                content = result['choices'][0]['message']['content']
                return json.loads(content)
        except Exception as e:
            logger.error(f"Groq Evaluation Error: {str(e)}")
            return {"should_retain": False}
