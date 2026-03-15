## OpenBook Care – Homepage Frontend

This repository contains a React + Vite frontend located in `homepage/frontend`.

### Prerequisites

- **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org).  
- **Package manager**: The project works with `npm`, `yarn`, or `pnpm`. The examples below use **npm**.

### 1. Clone or open the project

- **If using Git**:  
  - `git clone <your-repo-url>`  
  - `cd OpenBook Care`
- **If this folder is already on your machine** (e.g. you downloaded or unzipped it):  
  - Open it in your editor/terminal  
  - `cd "OpenBook Care"`

### 2. Install dependencies

All frontend code and its `package.json` live in `homepage/frontend`.

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
cd "homepage/frontend"
npm install
```

This downloads all required dependencies into `node_modules`.

### 3. Run the development server (for local testing)

From inside `homepage/frontend`:

```bash
npm run dev
```

- Vite will start a dev server (by default at `http://localhost:5173` or whatever URL it prints in the terminal).
- Open that URL in your browser to view the app.

### 4. Build for production (optional)

To compile the app and create an optimized production build:

```bash
cd "homepage/frontend"
npm run build
```

Vite will output static assets into the `dist` folder.

### 5. Preview the production build (optional)

After building, you can preview the production build locally:

```bash
cd "homepage/frontend"
npm run preview
```

Then open the URL Vite prints (usually `http://localhost:4173`).

### Common issues

- **Command not found: npm**  
  - Install Node.js from [nodejs.org](https://nodejs.org), then restart your terminal.
- **Port already in use**  
  - If `npm run dev` complains about a port being used, either stop the other process or let Vite pick another port when prompted.

## AI/ML Draft Structure

The `ai-ml/` folder contains the draft AI/ML workstream for OpenBook Care. This section is not yet wired into the frontend, but it already contains the core chat and explanation logic.

### Current AI/ML responsibilities
- chatbot session flow
- disclaimer acknowledgement
- safe educational responses
- plan explanation generation
- provider-agnostic LLM gateway design

### Folder overview

- `ai-ml/docs/`
  - design notes and architecture documentation
  - main file: `ai-ml/docs/ai-ml-design-note.md`

- `ai-ml/src/domain/`
  - core entities and rules
  - chat session, chat message, disclaimer, domain errors

- `ai-ml/src/application/`
  - use-case coordination
  - chatbot controller and explanation service

- `ai-ml/src/contracts/`
  - DTO-style request/response contracts
  - error code definitions

- `ai-ml/src/infrastructure/`
  - in-memory session store
  - prompt builder
  - provider-agnostic LLM gateway
  - mock LLM gateway
  - Anthropic adapter
  - LLM gateway factory

- `ai-ml/tests/`
  - tests for domain, application, contracts, and infrastructure

### Current status
- functional at the Python module level
- supports mock chat flow and explanation flow
- not yet connected to FastAPI routes or frontend UI
