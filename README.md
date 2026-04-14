# OpenBook Care

OpenBook Care is a healthcare cost-transparency web app built for BU CS411. Users can enter demographics, compare insurance plans, simulate annual usage costs, and ask an AI assistant for educational guidance about plan tradeoffs and insurance terms.

Stack:
- React 18 + TypeScript + Vite (`frontend/`)
- FastAPI + Python (`backend/`)
- Anthropic Claude API + local AI/ML module (`ai-ml/`)

## Running Locally

The app uses two local processes:
- the Vite frontend on `http://localhost:5173`
- the FastAPI backend on `http://localhost:8000`

### Prerequisites

- Node.js 18+
- Python 3.9+

### 1. Configure Your Own API Key

Copy the example file and add your own Anthropic API key:

```bash
cd /Users/tz/Desktop/BU/cs411/OpenBook-Care
cp .env.example .env
```

Edit `.env` and set:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENBOOK_CHAT_MODE=anthropic
# Optional:
# ANTHROPIC_MODEL=claude-sonnet-4-6
```

Notes:
- `.env` is local-only and should not be committed.
- `OPENBOOK_CHAT_MODE=anthropic` enables live Claude responses.
- If `ANTHROPIC_API_KEY` is missing, the app falls back to mock chat mode.
- If you change `.env`, restart the backend.

### 2. Start the Backend

In one terminal:

```bash
cd /Users/tz/Desktop/BU/cs411/OpenBook-Care/backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

or

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The backend exposes:
- `GET /api/plans?zip=XXXXX`
- `POST /api/chat/session`
- `POST /api/chat/{session_id}/acknowledge-disclaimer`
- `POST /api/chat/{session_id}/messages`

### 3. Start the Frontend

In a second terminal:

```bash
cd /Users/tz/Desktop/BU/cs411/OpenBook-Care/frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to `localhost:8000`.

## Testing the AI Assistant

Use the browser flow:

1. Open [http://localhost:5173](http://localhost:5173)
2. Enter user preferences
3. Compare plans and open the cost simulation detail view
4. Click `Talk to AI Assistant`
5. Acknowledge the `NOT MEDICAL ADVICE` disclaimer
6. Ask a question about the selected plan, deductible, premiums, or annual cost estimate

The assistant should:
- show the disclaimer before chatting
- preserve chat history during the session
- use the current plan and simulation context
- block unsafe medical-treatment questions
- return to the cost simulation page with the previous simulation state restored

You can confirm live Claude usage in two ways:
- in the app UI, the assistant badge should show `Live API`
- in raw API responses, `providerMode` should be `anthropic`

## Manual API Test

Create a session:

```bash
curl -s -X POST http://localhost:8000/api/chat/session
```

Acknowledge the disclaimer:

```bash
curl -s -X POST http://localhost:8000/api/chat/<SESSION_ID>/acknowledge-disclaimer \
  -H "Content-Type: application/json" \
  -d '{"acknowledged": true}'
```

Send a message:

```bash
curl -s -X POST http://localhost:8000/api/chat/<SESSION_ID>/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"What does the deductible mean for this plan?","context":{}}'
```

If the live Anthropic integration is active, the response will contain:

```json
"providerMode": "anthropic"
```

## Project Structure

```text
frontend/   React + TypeScript + Vite app
backend/    FastAPI backend for plans and chat routes
ai-ml/      AI/ML slice: chat session logic, prompt building, and LLM gateway code
```

## AI/ML Module

The `ai-ml/` folder contains:
- disclaimer acknowledgement flow
- chat session state
- prompt normalization
- mock and Anthropic gateway implementations
- safe fallback behavior for unavailable providers

## Common Issues

`uvicorn: command not found`
- Use `python3 -m uvicorn main:app --reload --port 8000`

`pip: command not found`
- Use `python3 -m pip install -r requirements.txt`

`npm: command not found`
- Install Node.js and restart your terminal

`providerMode` shows `mock`
- Check that `.env` exists at the project root
- Check that `ANTHROPIC_API_KEY` is valid
- Check that `OPENBOOK_CHAT_MODE=anthropic`
- Restart the backend after editing `.env`

Anthropic returns a model error
- Set `ANTHROPIC_MODEL=claude-sonnet-4-6` in `.env`
- Restart the backend
