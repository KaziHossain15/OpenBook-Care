# OpenBook Care

OpenBook Care is a healthcare cost-transparency web app built for BU CS411. Users can enter demographics, compare insurance plans, simulate annual usage costs, and ask an AI assistant for educational guidance about plan tradeoffs and insurance terms.

Stack:
- React 18 + TypeScript + Vite (`frontend/`)
- FastAPI + Python (`backend/`)
- Anthropic Claude API + local AI/ML module (`ai-ml/`)

## Running Locally

The app uses two local processes:
- Vite frontend on `http://localhost:5173`
- FastAPI backend on `http://localhost:8000`

### Prerequisites

- Node.js 18+
- Python 3.9+

### 1. Configure Environment Variables

From the project root:

```bash
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

### 2. Install All Dependencies (One Command)

Run the install script from the project root:

```bash
bash install-deps.sh
```

This installs:
- Backend Python dependencies from `backend/requirements.txt`
  - `fastapi==0.115.5`
  - `uvicorn[standard]==0.32.1`
  - `httpx==0.27.2`
- Frontend npm dependencies from `frontend/package.json`

The script creates a backend virtual environment at `backend/.venv` and installs Python packages there.

### 3. Run the App (One Command)

From the project root:

```bash
bash run-all.sh
```

This starts:
- Backend on `http://localhost:8000`
- Frontend on `http://localhost:5173`

If `run-all.sh` does not work on your machine, use the manual steps below.

### 4. Manual: Start the Backend

In one terminal:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

The backend exposes:
- `GET /api/plans?zip=XXXXX`
- `POST /api/chat/session`
- `POST /api/chat/{session_id}/acknowledge-disclaimer`
- `POST /api/chat/{session_id}/messages`

### 5. Manual: Start the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` requests to `localhost:8000`.

### 6. Manual: Compile the Program (Production Build)

If `run-all.sh` fails or you want to verify the frontend build manually:

```bash
cd frontend
npm run build
```

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

## Deploying (Vercel frontend + hosted API)

The UI is a static Vite build; the FastAPI service must run separately (Docker-friendly repo layout).

### 1. Deploy the API (Dockerfile)

The repo-root **`Dockerfile`** copies **`backend/`** and **`ai-ml/`** and runs Uvicorn from `backend/`.

You can deploy this image on **Railway**, **Render**, **Fly.io**, **GCP Cloud Run**, etc. Configure these **server-side** variables on that platform (never expose API keys to the browser):

- `ANTHROPIC_API_KEY`
- `OPENBOOK_CHAT_MODE` (e.g. `anthropic` or `mock`)
- Optional: `ANTHROPIC_MODEL`
- Optional CORS tuning (see `.env.example`): `CORS_ALLOW_ORIGINS`, `CORS_ALLOW_ORIGIN_REGEX`

Render users can start from **`render.yaml`** as a blueprint.

### 2. Deploy the frontend on Vercel

In the Vercel project:

- **Root Directory**: `frontend`
- **Build**: `npm run build` (or `pnpm build` if you use pnpm)
- **Output**: `dist`

**SPA routing:** `frontend/vercel.json` rewrites unknown paths to `index.html` so React Router deep links work after refresh.

### 3. Connect the browser to `/api`

Pick **one** strategy:

**A — Same-origin proxy (leave `VITE_API_BASE_URL` unset)**  
Edit **`frontend/vercel.json`** so the **`/api` rewrite runs before** the SPA fallback, targeting your deployed API origin:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_API_HOST/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Replace `YOUR_API_HOST` with your API hostname (no path). The frontend keeps calling relative `/api/...`; Vercel proxies those requests server-side.

**B — Direct API URL (`VITE_API_BASE_URL`)**  
Add your API origin (no trailing slash) in Vercel **Environment Variables**:

```env
VITE_API_BASE_URL=https://YOUR_API_HOST
```

Rebuild/redeploy. The backend must allow your frontend origin via **`CORS_ALLOW_ORIGINS`** and/or the default **`https://*.vercel.app`** regex (see `.env.example`).

### 4. Local smoke test (SPA fallback)

After `npm install` in `frontend/`:

```bash
cd frontend && npm run smoke
```

This builds the app and checks that `/`, `/cost-results`, `/compare-plans`, `/ai-assistant`, and `/simulate-usage` return HTTP 200 when served as a static SPA (same behavior Vercel relies on for client-side routes).

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
- Run `bash install-deps.sh` from the project root to install backend packages into `backend/.venv`

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
