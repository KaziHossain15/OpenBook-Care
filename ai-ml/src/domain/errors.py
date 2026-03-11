"""Domain-specific errors for chat session behavior."""


class DomainValidationError(ValueError):
    """Raised when a domain invariant is violated."""


class SessionClosedError(DomainValidationError):
    """Raised when a closed session is asked to accept new work."""


class DisclaimerRequiredError(DomainValidationError):
    """Raised when a user message is sent before disclaimer acknowledgement."""


class EmptyMessageError(DomainValidationError):
    """Raised when message content is empty after normalization."""
