# AI/ML Design Note

Status: working draft

## Purpose

This document defines the AI/ML slice for OpenBook Care clearly enough that it can be built in
parallel with the rest of the project.

This slice is responsible for:
- the AI chatbot flow
- disclaimer acknowledgement
- safe educational responses
- plan explanation output
- mock mode for early frontend/backend integration

This slice is not responsible for:
- insurance plan search
- pricing API ingestion
- ranking implementation owned by another teammate
- authentication
- full application routing or page layout

## Why This Exists

The team is building parts separately first and combining later. That only works if each part has a
clear boundary and stable interface. This document is meant to be the boundary for the AI/ML
section.

It is based on the current course and project direction:
- Deliverable 2 requires an AI assistant that provides educational insurance guidance
- Deliverable 2 requires a disclaimer stating the AI assistant is not medical, legal, or insurance
  professional advice
- Individual Assignment 2 already defines the chatbot use case, disclaimer flow, domain model,
  operation contract, and software classes

## AI/ML Scope

### Primary user value

The AI/ML section helps the user understand:
- insurance terms
- plan tradeoffs
- why a plan may be ranked higher or lower
- what parts of an estimate are uncertain
- what the system output means in plain language

### Hard constraints

- educational guidance only
- no diagnosis
- no treatment recommendation
- no emergency triage beyond safe redirection
- no direct exposure of provider API keys in frontend code
- no dependence on PHI

### Expected behavior

- the chatbot must require disclaimer acknowledgement before the first message in a session
- the chatbot must respond in simple language
- the chatbot must fail safely when the LLM is unavailable
- the chatbot should use available app context when useful
- the chatbot should support mock responses so UI work can proceed before real LLM wiring

## Proposed Folder Intent

This is a draft workspace, not the final repository structure. The intent is:

### `ai-ml/docs/`

Design and coordination artifacts.

Planned contents:
- this design note
- prompt rules
- response examples
- integration handoff notes

### `ai-ml/src/`

Draft implementation owned by the AI/ML workstream.

Planned contents:
- chat session model
- disclaimer logic
- chatbot controller/service logic
- mock response provider
- LLM gateway wrapper
- explanation service

### `ai-ml/tests/`

Draft tests for the AI/ML slice.

Planned contents:
- disclaimer flow tests
- safe fallback tests
- unsafe prompt handling tests
- contract tests for request/response shapes

## Ownership Boundary

The AI/ML workstream should own these internal concepts:
- `ChatSession`
- `ChatMessage`
- `Disclaimer`
- `DisclaimerAcknowledgement`
- `ChatbotServiceRequest`
- `ChatbotServiceResponse`
- `ChatbotController`
- `LlmGateway`
- `ExplanationService`

The AI/ML workstream should consume, but not own, these external concepts:
- selected plans
- ranked plan results
- user profile inputs
- estimator outputs
- frontend page state

That means the AI/ML side should accept normalized context from the rest of the app rather than
reach deeply into unrelated modules.

## Design Principles

This slice should explicitly follow GRASP and standard modular design principles.

### GRASP mapping

- `Controller`
  - `ChatbotController` handles system events related to chat use cases
  - it should coordinate work, not contain prompt-building or provider-specific logic

- `Information Expert`
  - `ChatSession` is the expert on conversation state
  - `ChatSession` should decide whether messages can be appended and should update
    `lastActivityAt`
  - `ExplanationService` is the expert on explanation generation rules, not the controller

- `Creator`
  - `ChatSession` should create and own `ChatMessage` instances because it aggregates them
  - `LlmGateway` implementations should create provider request/response records because they manage the
    external call

- `Pure Fabrication`
  - `LlmGateway` implementations, `PromptBuilder`, and `ChatSessionStore` are service-layer objects created
    to keep domain logic clean and testable

- `Low Coupling`
  - AI/ML code should depend on normalized context objects, not raw React state, raw API
    payloads, or direct frontend component structure

- `High Cohesion`
  - each module should have one clear purpose: session state, prompt generation, provider access,
    explanation generation, or persistence

- `Protected Variations`
  - all LLM-specific behavior should be isolated behind a gateway interface so provider changes do
    not affect the rest of the system

### Practical design rules

- do not let controller code construct prompt strings directly
- do not let provider-specific code update domain state directly
- do not let the frontend own disclaimer enforcement rules
- do not let explanation logic be scattered across chat, ranking, and UI code

## High-Level Architecture

The simplest clean split is:

1. Frontend sends a request to the backend AI endpoint.
2. Backend validates session state and disclaimer acknowledgement.
3. Backend builds a compact AI context object from user inputs and selected plans.
4. Backend sends a structured prompt to either:
   - a mock response provider, or
   - a real LLM gateway
5. Backend stores the assistant response in the chat session.
6. Backend returns a normalized response to the frontend.

### Internal components

- `ChatbotController`
  - entry point for AI/chat requests
  - validates input
  - coordinates disclaimer checks
  - calls gateway/service layer

- `ChatSessionStore`
  - stores current conversation state
  - can be in-memory at first
  - can later move to database storage

- `PromptBuilder`
  - converts app context into a concise prompt package
  - keeps prompt formatting out of controller code

- `LlmGateway`
  - provider-agnostic wrapper interface for real LLM providers
  - isolates provider-specific code

- `MockLlmGateway`
  - deterministic or semi-deterministic draft responses
  - used during early UI integration and testing

- provider adapters
  - `AnthropicLlmGateway` is one implementation
  - future implementations may include OpenAI, Gemini, or other providers

- `ExplanationService`
  - generates short plan explanation text
  - may start as rule-based before using an LLM

## Responsibility Assignment

This section is the most important part of the design note. It defines who does what.

### `ChatbotController`

Responsibilities:
- receive application-level requests for session creation, disclaimer acknowledgement, and
  message submission
- validate request shape and required fields
- delegate session retrieval and storage
- delegate prompt creation
- delegate provider call
- convert domain/service outcomes into stable API responses

Must not:
- store chat history itself
- build prompt text inline
- contain hardcoded provider logic
- contain ranking explanation rules

### `ChatSession`

Responsibilities:
- represent one chat session
- know whether the session is open
- know whether the disclaimer has been acknowledged
- create and append messages
- update session activity timestamps

Must not:
- call the provider directly
- know HTTP or JSON details
- know frontend UI behavior

### `ChatMessage`

Responsibilities:
- represent one message in a session
- preserve role, content, creation time, and message status

Must not:
- decide business rules
- trigger external calls

### `ChatSessionStore`

Responsibilities:
- save and retrieve `ChatSession`
- abstract whether storage is in-memory or database-backed

Must not:
- contain provider logic
- contain prompt logic

### `PromptBuilder`

Responsibilities:
- translate normalized app context plus user question into a compact prompt package
- enforce prompt size and trimming rules
- keep system prompt and context formatting centralized

Must not:
- own session state
- call the model directly

### `LlmGateway`

Responsibilities:
- send provider requests
- normalize provider responses
- isolate all model/provider SDK details
- produce a consistent result shape for the controller

Must not:
- know about frontend rendering
- own disclaimer checks
- mutate session objects directly

### `MockLlmGateway`

Responsibilities:
- emulate `LlmGateway` behavior for local development and testing
- provide deterministic category-based responses

Must not:
- introduce a different contract from the real gateway

### `ExplanationService`

Responsibilities:
- create short explanations for plan ranking, tradeoffs, and uncertainty
- encapsulate explanation heuristics or rules

Must not:
- own chat transcript state
- depend on a live provider in the first version

## Collaboration Flow

This is the intended object interaction for `POST /api/ai/chat/message`.

1. `ChatbotController` receives the request.
2. `ChatbotController` asks `ChatSessionStore` for the session.
3. `ChatbotController` asks `ChatSession` whether the disclaimer requirement is satisfied.
4. `ChatSession` creates and appends the user message.
5. `ChatbotController` asks `PromptBuilder` to build the prompt package.
6. `ChatbotController` calls an `LlmGateway` implementation or `MockLlmGateway`.
7. `LlmGateway` returns a normalized result.
8. `ChatSession` creates and appends the assistant message.
9. `ChatSessionStore` persists the updated session.
10. `ChatbotController` returns the API response.

This preserves:
- controller coordination
- domain ownership of message creation
- provider isolation
- testable boundaries

## Data Model

These are the draft core entities based on your individual assignment.

### `ChatSession`

Fields:
- `sessionId: UUID`
- `status: "open" | "closed"`
- `createdAt: DateTime`
- `lastActivityAt: DateTime`
- `disclaimerAcknowledged: boolean`
- `disclaimerVersion: string | null`

Purpose:
- represents one chatbot interaction session
- holds or links to chat messages

Invariants:
- a closed session cannot accept new messages
- a session cannot send the first user question before disclaimer acknowledgement
- `lastActivityAt` must change whenever a message is appended

### `ChatMessage`

Fields:
- `messageId: UUID`
- `sessionId: UUID`
- `role: "user" | "assistant" | "system"`
- `content: string`
- `createdAt: DateTime`
- `status: "completed" | "failed"`

Purpose:
- stores each user or assistant message

Invariants:
- `role` must be one of `user`, `assistant`, or `system`
- `content` must not be empty after validation

### `Disclaimer`

Fields:
- `disclaimerId: string`
- `text: string`
- `version: string`

Purpose:
- identifies the current disclaimer text shown to the user

### `DisclaimerAcknowledgement`

Fields:
- `ackId: UUID`
- `sessionId: UUID`
- `disclaimerVersion: string`
- `acknowledgedAt: DateTime`

Purpose:
- records that the user accepted the disclaimer for the current chat open event

Invariant:
- acknowledgement must reference the disclaimer version shown to the user

### `ChatbotServiceRequest`

Fields:
- `requestId: UUID`
- `sessionId: UUID`
- `prompt: string`
- `sentAt: DateTime`
- `provider: string`

Purpose:
- records a request sent to the AI provider or mock provider

### `ChatbotServiceResponse`

Fields:
- `responseId: UUID`
- `requestId: UUID`
- `content: string`
- `receivedAt: DateTime`
- `status: "success" | "error" | "blocked"`

Purpose:
- records the provider outcome

## Context Contract From The Rest Of The App

The AI/ML section should not depend on raw UI state. It should receive a normalized context object.

### Draft context shape

```json
{
  "userInputs": {
    "ageRange": "26-35",
    "familySize": 2,
    "region": "MA",
    "riskPreference": "low-risk",
    "budgetLimit": 12000
  },
  "selectedPlans": [
    {
      "planId": "plan_a",
      "name": "Example PPO",
      "monthlyPremium": 420,
      "deductible": 1500,
      "outOfPocketMax": 7000,
      "estimatedYearlyCostMin": 6200,
      "estimatedYearlyCostMax": 9800,
      "rankReason": "Lower expected yearly cost for low-risk profile"
    }
  ],
  "currentView": "plan-comparison",
  "source": "frontend"
}
```

Rules:
- every field is optional except `source`
- if plan data is missing, the chatbot should still answer general insurance questions
- context should contain summary data, not raw external API payloads

## API Contract

The goal is to keep the public contract stable even if implementation changes.

### Contract rule

The API layer should expose stable request and response shapes even if:
- the session store changes
- the prompt format changes
- the provider changes from mock to real LLM
- explanation generation moves from rules to a hybrid strategy

### `POST /api/ai/chat/session`

Purpose:
- create or reopen a chat session

Request:

```json
{}
```

Response:

```json
{
  "sessionId": "2f8ab710-27f6-4d99-b1d4-1ef2a7a7ddef",
  "status": "open",
  "disclaimerRequired": true,
  "disclaimer": {
    "version": "v1",
    "text": "NOT MEDICAL ADVICE. This assistant provides educational information only."
  }
}
```

### `POST /api/ai/chat/disclaimer/ack`

Purpose:
- record disclaimer acknowledgement for a session

Request:

```json
{
  "sessionId": "2f8ab710-27f6-4d99-b1d4-1ef2a7a7ddef",
  "disclaimerVersion": "v1"
}
```

Response:

```json
{
  "sessionId": "2f8ab710-27f6-4d99-b1d4-1ef2a7a7ddef",
  "acknowledged": true,
  "acknowledgedAt": "2026-03-11T10:30:00Z"
}
```

### `POST /api/ai/chat/message`

Purpose:
- submit one user message and receive one assistant response

Request:

```json
{
  "sessionId": "2f8ab710-27f6-4d99-b1d4-1ef2a7a7ddef",
  "message": "Why is this PPO ranked above the HDHP?",
  "context": {
    "userInputs": {
      "ageRange": "26-35",
      "familySize": 2,
      "riskPreference": "low-risk"
    },
    "selectedPlans": [
      {
        "planId": "plan_a",
        "name": "Example PPO",
        "estimatedYearlyCostMin": 6200,
        "estimatedYearlyCostMax": 9800,
        "rankReason": "Lower expected yearly cost for low-risk profile"
      },
      {
        "planId": "plan_b",
        "name": "Example HDHP",
        "estimatedYearlyCostMin": 4300,
        "estimatedYearlyCostMax": 14000,
        "rankReason": "Lower premium but higher worst-case risk"
      }
    ],
    "currentView": "plan-comparison",
    "source": "frontend"
  }
}
```

Success response:

```json
{
  "sessionId": "2f8ab710-27f6-4d99-b1d4-1ef2a7a7ddef",
  "userMessage": {
    "messageId": "2ff2f58c-d863-4ff0-9be1-9a80a2a117a1",
    "role": "user",
    "content": "Why is this PPO ranked above the HDHP?"
  },
  "assistantMessage": {
    "messageId": "a1979c4b-f337-4f6b-9053-5ca4b255d8c6",
    "role": "assistant",
    "content": "The PPO is ranked higher because it appears to have lower downside risk for your profile, even if its monthly premium is higher."
  },
  "providerMode": "mock",
  "disclaimerShown": true
}
```

Error response example:

```json
{
  "errorCode": "DISCLAIMER_REQUIRED",
  "message": "You must acknowledge the disclaimer before sending a message."
}
```

### Optional future endpoint

`POST /api/ai/explain-plan`

Purpose:
- return a short targeted explanation for one plan without requiring full chat UI

This can support the Deliverable 2 idea of a small AI analysis under each plan card.

## Backend Response Rules

The AI/ML backend should enforce these rules before calling the provider:

- reject empty messages
- reject missing session IDs
- reject messages if disclaimer is not acknowledged
- trim oversized context
- do not send raw secrets or internal metadata to the model
- detect obvious emergency or diagnosis requests and answer with safe redirection

### Validation order

Use this order consistently:

1. validate request shape
2. load session
3. validate session state
4. validate disclaimer acknowledgement
5. validate message content
6. normalize and trim context
7. apply unsafe-request screening
8. build prompt
9. call gateway
10. persist outcome

## Safety Policy

The assistant must stay in these lanes:
- educational explanations of insurance terms
- explanations of plan tradeoffs
- interpretation of the system's own outputs
- plain-language explanation of cost ranges and uncertainty

The assistant must not:
- diagnose
- prescribe medication
- tell the user which treatment to take
- replace emergency services
- pretend certainty where data is incomplete

### Safe response pattern for risky requests

If the user asks for diagnosis, treatment, or urgent medical advice:
- remind them the assistant is not medical advice
- avoid direct diagnosis
- advise contacting a qualified professional or emergency services when appropriate
- keep the response short and explicit

## Prompt Strategy

The first version should use a simple system prompt plus a compact context block.

### System prompt goals

- describe the assistant as educational only
- require simple language
- prohibit diagnosis and treatment advice
- instruct the model to say when information is uncertain
- prefer short answers unless the user asks for detail

### Prompt inputs

- user question
- selected plan summaries
- high-level user input summary
- current screen or current workflow state
- safety instructions

### Prompt builder rule

Never pass the raw full app state. Build a compact explicit prompt payload.

## Mock Mode

Mock mode is required for early parallel development.

### Why

- frontend can integrate without waiting for Claude
- tests can run without network calls
- prompt design can evolve without blocking UI work

### Mock mode behavior

- return deterministic responses for common question categories
- categories:
  - definition question
  - comparison question
  - ranking explanation question
  - uncertainty question
  - unsafe medical question
  - provider unavailable fallback

### Example mock response categories

- "What is a deductible?"
- "Why is Plan A ranked above Plan B?"
- "Why is this estimate a range?"
- "I have chest pain, what should I do?"

## Failure Handling

The user should never be left with a broken chat panel.

Required failure modes:
- provider timeout
- provider error
- invalid request
- blocked unsafe request

Required UI-friendly behavior:
- return a clean error code
- preserve the chat session
- allow retry
- avoid crashing or losing previous messages

### Error ownership

- `ChatbotController` maps failures to API errors
- `ChatSessionStore` reports missing session or persistence failures
- `LlmGateway` implementations report provider failures in normalized form
- `PromptBuilder` reports invalid or oversized prompt construction issues
- domain objects should not throw provider-specific errors

## Explanation Engine

The AI/ML section should also support short explanation text outside the full chatbot.

### Purpose

Support features like:
- short explanation under each plan card
- "why this ranking?" tooltip or panel
- uncertainty explanation note

### Suggested first implementation

Start rule-based, not LLM-based.

Reason:
- easier to test
- more deterministic
- works without network
- fits deliverable needs better in the short term

### Example explanation inputs

- plan premium
- deductible
- out-of-pocket max
- expected yearly range
- worst-case yearly range
- risk preference
- ranking reason from estimator

### Example output

"This plan is ranked higher because its total yearly range is more stable for a low-risk user, even though the monthly premium is higher."

## Suggested Implementation Order

Build in this order:

1. write the stable request/response schemas
2. implement in-memory `ChatSession` and `ChatMessage`
3. implement disclaimer acknowledgement flow
4. implement `MockLlmGateway`
5. implement `POST /api/ai/chat/message`
6. implement unsafe-request guardrails
7. implement short rule-based `ExplanationService`
8. integrate real LLM providers behind `LlmGateway`

This order lets your section show visible progress early and keeps the real provider integration as
the last swap.

## Integration Expectations For Teammates

The frontend teammate should provide:
- a chat panel or modal
- disclaimer acknowledgement UI
- message input and transcript rendering
- normalized context payload when available

The backend/data teammate should provide:
- normalized selected-plan data
- stable field names for estimator outputs
- environment variable handling for provider keys

The estimator/ranking teammate should provide:
- one concise ranking reason per plan
- one concise uncertainty reason per estimate

## Open Decisions

These can wait, but should be resolved before merging work:
- final backend framework file structure
- database persistence versus temporary in-memory storage for chat sessions
- exact field names for plan comparison data
- whether plan explanations are generated by rules only or can use LLM refinement
- whether chat history persists between browser refreshes

## Recommended First Draft Package Breakdown

This is still provisional, but it gives a cleaner mental model for the code later.

- `domain/`
  - `chat_session`
  - `chat_message`
  - `disclaimer`

- `application/`
  - `chatbot_controller`
  - `explanation_service`

- `infrastructure/`
  - `chat_session_store`
  - `prompt_builder`
  - `llm_gateway`
  - provider-specific LLM adapters
  - `mock_llm_gateway`

- `contracts/`
  - request/response DTOs
  - error codes

The key point is separation by responsibility, not by framework.

## Practical Definition Of Done For The AI/ML Slice

The AI/ML draft is in good shape when:
- a user can open chat and see the disclaimer
- acknowledgement is required before first message
- a user can ask a plan or insurance question and get a mock response
- unsafe medical questions are redirected safely
- the frontend can integrate using stable JSON shapes
- there is a simple explanation output for ranked plans
- basic tests cover disclaimer flow and failure handling
