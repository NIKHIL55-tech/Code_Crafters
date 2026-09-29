# Code Crafter - Universal AI Workspace

## Project Objective
Build a reliable, polished, demonstrable prototype whose central innovation is **PROJECT-SCOPED PERSISTENT AI MEMORY** across multiple independent chats.

## Problem
Normal AI chat systems often lose important context when a user starts a new conversation, switches tasks within a project, or returns to a project after some time. Users repeatedly have to explain architecture, design decisions, and constraints.

## Solution - Universal AI Workspace
A universal AI workspace where users create Projects and select a professional persona (Coding, Medical, Legal, Research, Business, General). Each project has its own isolated, persistent memory. When users start a new chat within the same project, the AI recalls relevant information from previous conversations through Hindsight, providing context-aware responses.

## Core Features

### Projects and Multiple Chats
Users can create distinct projects. A single project can contain multiple independent chats (e.g., Backend, Frontend, Database). All chats within a project share the same project-scoped memory.

### Hindsight Persistent Memory
The system integrates with **Hindsight Cloud** as a dedicated long-term memory layer to perform RETAIN and RECALL operations.

### RETAIN / RECALL Pipeline
- **RETAIN:** When a user and assistant interact, a memory extraction gate (powered by Groq) analyzes the exchange to determine if it contains durable, useful project knowledge (e.g., explicit decisions, architecture, tech choices). If so, it is retained in Hindsight.
- **RECALL:** When the user sends a new message, the backend recalls relevant facts from Hindsight and injects them into the context before generating the response.

### Project-Scoped Memory & UUID Isolation
Each project has a strict memory boundary using **UUID-based project identifiers** (`project_identifier`). Strict tagging (`tags_match: "all_strict"`) ensures that queries in one project only recall memories associated with that exact project. Cross-project isolation guarantees memory from Project A cannot leak into Project B.

### Memory ON / OFF
A UI feature allows users to toggle memory:
- **OFF**: No Hindsight recall is performed. The assistant operates statelessly (only utilizing the current conversation's chat history) and clearly states if it lacks project-specific context.
- **ON**: Hindsight recall is performed and context is injected into the prompt.

### Memory Inspector
A UI component that displays the real retrieved memory information (content, relevance, source) when memory is ON, providing transparency and traceability.

### Project Brief & Hindsight Mental Models
An automated "Project Brief" is generated for each project using **Hindsight Mental Models**. It synthesizes the durable project memories into a coherent summary document that users can view to understand the current state and architecture of their project. 

### Groq LLM Integration & Persona System
**Groq** serves as the LLM inference layer, powering both conversational responses and memory evaluation. Users select a persona (e.g., Coding, Legal) for each project, which adjusts the system prompt.

## Architecture
- **Frontend**: Next.js, TypeScript, Tailwind CSS, App Router
- **Backend**: Python, FastAPI, Pydantic, SQLAlchemy
- **LLM**: Groq API (`llama3-8b-8192`)
- **Persistent Memory**: Hindsight Cloud
- **Local Database**: SQLite

## Setup Instructions

### Environment Variables
Copy `.env.example` to `.env` in the `backend` directory and fill in your credentials:
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `HINDSIGHT_API_KEY`
- `HINDSIGHT_BASE_URL`
- `HINDSIGHT_BANK_ID`
- `DATABASE_URL`

### Running Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing & Verification
Unit tests and integration tests can be run in the `backend` directory:
```bash
pytest
```
Verification scripts confirm UUID isolation, memory extraction behavior, Project Brief generation, and Memory OFF adherence.

## Known Limitations & Future Improvements
- SQLite is used instead of a production database like PostgreSQL.
- No user authentication system is currently implemented.
- Future improvements include expanding the Project Brain (knowledge synthesis) and supporting more complex cross-referencing capabilities.
