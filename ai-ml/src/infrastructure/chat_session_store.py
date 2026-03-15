"""In-memory storage for chat sessions."""

from __future__ import annotations

from typing import Dict
from uuid import UUID

from domain import ChatSession


class InMemoryChatSessionStore:
    """Simple in-memory store used for early development and testing."""

    def __init__(self) -> None:
        self._sessions: Dict[str, ChatSession] = {}

    def save(self, session: ChatSession) -> ChatSession:
        self._sessions[str(session.session_id)] = session
        return session

    def get(self, session_id: str | UUID) -> ChatSession | None:
        return self._sessions.get(str(session_id))
