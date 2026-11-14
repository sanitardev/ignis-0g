import json
import logging
from collections.abc import Sequence
from urllib.parse import urlsplit

from app.ai.providers import JsonAPI, Message, ProviderUnavailable


class RemoteLLM:
    def __init__(
        self, api: JsonAPI, model: str, max_output_tokens: int, *, fallback: "RemoteLLM | None" = None,
    ):
        self.api = api
        self.model = model
        self.max_output_tokens = max_output_tokens
        self.fallback = fallback

    async def generate(self, messages: Sequence[Message]) -> object:
        try:
            return await self._generate(messages)
        except ProviderUnavailable as error:
            if self.fallback is None:
                raise
            logging.getLogger(__name__).info("Using secondary chat model after %s", type(error).__name__)
            return await self.fallback.generate(messages)

    async def _generate(self, messages: Sequence[Message]) -> object:
        if not self.model:
            raise ProviderUnavailable("Chat model is missing")
        payload = {
            "model": self.model,
            "messages": list(messages),
            "max_tokens": self.max_output_tokens,
            "temperature": 0.2,
        }
        if urlsplit(self.api.base_url).hostname == "openrouter.ai":
            payload["reasoning"] = {"enabled": False}
            payload["response_format"] = {"type": "json_object"}
            payload["provider"] = {"sort": "latency", "require_parameters": True}
        response = await self.api.post("/chat/completions", payload)
        try:
            choice = response["choices"][0]
            if choice["finish_reason"] == "length":
                raise ProviderUnavailable("Chat response exceeded the output token limit")
            if choice["finish_reason"] not in {"stop", "end_turn"}:
                raise ProviderUnavailable("Chat response ended before completion")
            content = choice["message"]["content"].strip()
            if content.startswith("```json") and content.endswith("```"):
                content = content[7:-3].strip()
            result = json.loads(content)
            if not isinstance(result, dict):
                raise ValueError
            return result
        except (ValueError, KeyError, TypeError, AttributeError, IndexError):
            raise ProviderUnavailable("Invalid chat response") from None
