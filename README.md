# OpenBook Care

<<<<<<< HEAD
This repository contains a React + Vite frontend located in `frontend`.
=======
A healthcare cost-transparency web app built for BU CS411. Users input demographics, compare insurance plans with live regional pricing, simulate healthcare usage costs, and get educational guidance from an AI assistant.

**Stack:** React 18 + TypeScript + Vite (frontend) · FastAPI + Python (backend) · Anthropic Claude API (AI/ML)

---

## Running Locally

Two processes must run simultaneously: the Vite frontend and the FastAPI backend.
>>>>>>> 495f4fdf8417c59b4bb0ccfbeb5b0e00239ec43f

### Prerequisites

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **Python** 3.9+ — [python.org](https://python.org)

---

<<<<<<< HEAD
- **If using Git**:  
  - `git clone <your-repo-url>`  
  - `cd OpenBook Care`
- **If this folder is already on your machine** (e.g. you downloaded or unzipped it):  
  - Open it in your editor/terminal  
  - `cd "OpenBook Care"`

### 2. Install dependencies

All frontend code and its `package.json` live in `frontend`.

**Option A – Recommended: use the helper script**

From the project root:

```bash
cd "OpenBook Care"
chmod +x install-deps.sh   # first time only
./install-deps.sh
```
This will install all required dependencies for you

**Option B – Manual install**

```bash
cd "frontend"
npm install
```

This downloads all required dependencies into `node_modules`.

### 3. Run the development server (for local testing)

From inside `frontend`:

```bash
=======
### 1. Frontend

```bash
cd frontend
npm install
>>>>>>> 495f4fdf8417c59b4bb0ccfbeb5b0e00239ec43f
npm run dev
```

Runs at `http://localhost:5173`. The Vite dev proxy forwards all `/api/*` requests to the backend on port 8000 automatically — no CORS configuration needed.

---

### 2. Backend (CMS Integration)

In a **separate terminal**:

```bash
<<<<<<< HEAD
cd "frontend"
=======
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

> **Note:** Use `python -m uvicorn` rather than `uvicorn` directly if the command is not found after install.

The backend exposes one endpoint:

```
GET /api/plans?zip=XXXXX
```

Pulls live regional copay data from two CMS datasets (Family Practice `bb4c-dcdf`, Internal Medicine `9735-7176`). No API key required. If the backend is not running, the frontend silently falls back to static plan data.

**Verify the backend is working:**

```bash
curl "http://localhost:8000/api/plans?zip=02134"
```

You should see JSON with real regional copay figures.

---

### 3. Build for production

```bash
cd frontend
>>>>>>> 495f4fdf8417c59b4bb0ccfbeb5b0e00239ec43f
npm run build
```

Output goes to `frontend/dist/`.

---

## Project Structure

<<<<<<< HEAD
```bash
cd "frontend"
npm run preview
=======
```
frontend/        React + TypeScript + Vite app
backend/         FastAPI backend (CMS integration)
ai-ml/           Python AI/ML module (chatbot, explanation service, LLM gateway)
>>>>>>> 495f4fdf8417c59b4bb0ccfbeb5b0e00239ec43f
```

---

## AI/ML Module

The `ai-ml/` folder contains the chatbot and cost-explanation logic powered by the Anthropic Claude API. It is functional at the Python module level and supports mock and live chat flows. It is not yet connected to FastAPI routes or the frontend UI.

### Responsibilities

- Chatbot session flow and disclaimer acknowledgement
- Safe educational responses (no medical/legal advice)
- Plan explanation generation
- Provider-agnostic LLM gateway with Anthropic adapter

### Folder overview

| Path | Contents |
|---|---|
| `ai-ml/docs/` | Design notes and architecture documentation |
| `ai-ml/src/domain/` | Core entities: chat session, message, disclaimer, domain errors |
| `ai-ml/src/application/` | Use-case coordination: chatbot controller, explanation service |
| `ai-ml/src/contracts/` | DTO-style request/response contracts, error codes |
| `ai-ml/src/infrastructure/` | Session store, prompt builder, LLM gateway, Anthropic adapter |
| `ai-ml/tests/` | Tests for domain, application, contracts, and infrastructure layers |

---

## Common Issues

**`uvicorn: command not found`**
Use `python -m uvicorn main:app --reload --port 8000` instead.

**`pip: command not found`**
Use `python -m pip install -r requirements.txt` instead.

**`npm: command not found`**
Install Node.js from [nodejs.org](https://nodejs.org) and restart your terminal.

**Port already in use**
Stop the conflicting process or change the port. If you change the backend port, update the proxy target in `frontend/vite.config.ts` to match.
