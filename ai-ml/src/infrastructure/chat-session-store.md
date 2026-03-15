# ChatSessionStore

Primary responsibility:
- save and retrieve chat sessions

Draft strategy:
- start with in-memory storage
- swap to database-backed storage later without changing controller behavior

GRASP:
- Pure Fabrication
- Protected Variations
