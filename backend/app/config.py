"""Centralized configuration loaded from environment / .env."""
import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")

# CORS: open for the demo. Tighten before any real deployment.
ALLOWED_ORIGINS = ["*"]
