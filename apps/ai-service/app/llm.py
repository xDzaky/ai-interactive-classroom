"""
app/llm.py — P08-T01
LiteLLM wrapper for unified LLM access.

Usage:
    from app.llm import complete, DEFAULT_MODEL

    result = await complete(messages=[{"role": "user", "content": "Hello"}])
"""
import os
from typing import Any

import litellm


# Default model — overridable via env var
DEFAULT_MODEL: str = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")

# LiteLLM global config
litellm.drop_params = True          # ignore unsupported params silently
litellm.set_verbose = False         # suppress verbose logs in production


async def complete(
    messages: list[dict[str, str]],
    model: str | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    Call LiteLLM completion and return a normalised dict:
      {
        "content": str,          # text of first choice
        "model": str,            # model used
        "usage": {               # token usage
          "prompt_tokens": int,
          "completion_tokens": int,
          "total_tokens": int,
        },
      }
    Raises litellm.exceptions.APIError on provider errors.
    """
    resolved_model = model or DEFAULT_MODEL
    response = await litellm.acompletion(
        model=resolved_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        **kwargs,
    )
    choice = response.choices[0]
    content: str = choice.message.content or ""
    usage = response.usage or {}
    return {
        "content": content,
        "model": resolved_model,
        "usage": {
            "prompt_tokens": getattr(usage, "prompt_tokens", 0),
            "completion_tokens": getattr(usage, "completion_tokens", 0),
            "total_tokens": getattr(usage, "total_tokens", 0),
        },
    }
