# ChatbotController

Primary responsibility:
- coordinate chat-related system operations

Expected operations:
- create session
- acknowledge disclaimer
- submit message

GRASP:
- Controller

Must not:
- build prompts inline
- own session persistence
- contain provider SDK logic
