"""Thin wrapper around the Anthropic SDK.

Phase 0 only needs to confirm the client can be constructed and the key is
present. Later phases (analyze, concierge chat) build on `client` and `MODEL`.
"""
from anthropic import Anthropic

from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

MODEL = ANTHROPIC_MODEL

# A single shared client instance for the app.
client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


def is_configured() -> bool:
    """True when an API key is set, so /health can report readiness."""
    return bool(ANTHROPIC_API_KEY)
