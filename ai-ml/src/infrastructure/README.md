# Infrastructure

This folder contains the technical service layer for the AI/ML slice.

Current contents:
- `chat_session_store.py` in-memory chat session storage
- `prompt_builder.py` normalization of frontend chat context
- `llm_gateway.py` provider contract and result types
- `mock_llm_gateway.py` deterministic local fallback responses
- `anthropic_llm_gateway.py` live Anthropic Messages API integration
- `llm_gateway_factory.py` gateway selection

## Anthropic Configuration

The live gateway reads:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENBOOK_CHAT_MODE=anthropic
# Optional:
# ANTHROPIC_MODEL=claude-sonnet-4-6
```

If no API key is present, the backend can still run with the mock gateway.

These modules isolate:
- provider-specific HTTP details
- prompt formatting
- safe provider switching
- testable fallback behavior
