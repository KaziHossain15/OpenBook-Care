# AI/ML Section

This folder contains the OpenBook Care AI assistant implementation used by the FastAPI backend.

Current responsibilities:
- chat session creation and persistence
- disclaimer acknowledgement enforcement
- safe educational responses for insurance and healthcare-cost questions
- prompt normalization from frontend simulation context
- live Anthropic Claude integration
- mock fallback mode for local development

## Live API Setup

The AI/ML code expects the backend process to have these environment variables available:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENBOOK_CHAT_MODE=anthropic
# Optional:
# ANTHROPIC_MODEL=claude-sonnet-4-6
```

Recommended workflow:

1. Copy `/Users/tz/Desktop/BU/cs411/OpenBook-Care/.env.example` to `.env`
2. Add your own Anthropic API key
3. Restart the backend

## Main Areas

- `docs/` design notes and handoff docs
- `src/domain/` chat session, messages, disclaimer, domain rules
- `src/application/` chatbot controller and explanation service
- `src/contracts/` DTOs and error codes
- `src/infrastructure/` prompt builder, session store, mock gateway, Anthropic gateway
- `tests/` unit tests for the AI/ML slice

## Behavior Notes

- The disclaimer must be acknowledged before the first user message.
- Unsafe medical-treatment questions are blocked before provider generation.
- The frontend passes current plan and simulation summary context into chat requests.
- Responses return a `providerMode` field so you can confirm whether the assistant used `anthropic`, `mock`, or the local `safety-filter`.
