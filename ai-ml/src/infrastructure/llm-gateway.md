# LlmGateway

Primary responsibility:
- isolate real LLM/provider integration details

Draft rules:
- normalize provider results
- shield the rest of the system from SDK/provider changes

GRASP:
- Pure Fabrication
- Protected Variations

Current draft implementation:
- `llm_gateway.py` defines the shared interface and result types
- `mock_llm_gateway.py` implements the local deterministic provider
- `anthropic_llm_gateway.py` implements one live provider adapter
- `llm_gateway_factory.py` selects a provider without changing controller code
