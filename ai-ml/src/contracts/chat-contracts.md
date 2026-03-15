# Chat Contracts Draft

This contract layer now has DTO-style Python classes in
`src/contracts/chat_contracts.py`.

Current DTOs:
- `CreateSessionRequestDTO`
- `CreateSessionResponseDTO`
- `AcknowledgeDisclaimerRequestDTO`
- `AcknowledgeDisclaimerResponseDTO`
- `SubmitMessageRequestDTO`
- `SubmitMessageResponseDTO`
- `ExplainPlanRequestDTO`
- `ExplainPlanResponseDTO`
- `MessageDTO`
- `DisclaimerPayload`
- `ErrorResponseDTO`

Current rule:
- controller code should assemble DTOs first, then convert them with `to_dict()`
- public response shapes stay JSON-friendly
- internal contract fields become explicit and less typo-prone

Source of truth:
- `docs/ai-ml-design-note.md`
- `src/contracts/chat_contracts.py`
