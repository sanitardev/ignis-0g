import json
import logging
from collections.abc import Sequence
from urllib.parse import urlsplit

from app.ai.providers import JsonAPI, Message, ProviderUnavailable, StreamingUnsupported, TextDelta


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

    def _payload(self, messages: Sequence[Message]) -> dict:
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
        return payload

    async def generate_stream(self, messages: Sequence[Message], on_delta: TextDelta) -> object:
        content: list[str] = []
        received = 0
        finish_reason = None

        async def on_event(event: dict) -> None:
            nonlocal finish_reason, received
            choices = event.get("choices")
            if choices == []:
                return
            try:
                choice = choices[0]
                delta = (choice.get("delta") or {}).get("content")
                reason = choice.get("finish_reason")
            except (TypeError, KeyError, AttributeError, IndexError):
                raise ProviderUnavailable("Invalid chat stream event") from None
            if reason is not None and reason not in ("stop", "end_turn"):
                raise ProviderUnavailable("Chat stream ended before completion")
            if reason is not None:
                finish_reason = reason
            if isinstance(delta, str) and delta:
                received += len(delta)
                if received > 256_000:
                    raise ProviderUnavailable("Chat stream exceeded the response size limit")
                content.append(delta)
                await on_delta(delta)

        try:
            await self.api.stream("/chat/completions", {**self._payload(messages), "stream": True}, on_event)
            if finish_reason is None:
                raise ProviderUnavailable("Chat stream ended without a completion event")
            return self._parse_content("".join(content))
        except StreamingUnsupported:
            return await self.generate(messages)
        except ProviderUnavailable:
            if self.fallback is None or content:
                raise
            return await self.fallback.generate_stream(messages, on_delta)

    async def _generate(self, messages: Sequence[Message]) -> object:
        response = await self.api.post("/chat/completions", self._payload(messages))
        try:
            choice = response["choices"][0]
            if choice["finish_reason"] == "length":
                raise ProviderUnavailable("Chat response exceeded the output token limit")
            if choice["finish_reason"] not in {"stop", "end_turn"}:
                raise ProviderUnavailable("Chat response ended before completion")
            return self._parse_content(choice["message"]["content"])
        except (KeyError, TypeError, IndexError):
            raise ProviderUnavailable("Invalid chat response") from None

    @staticmethod
    def _parse_content(content: str) -> dict:
        try:
            content = content.strip()
            if content.startswith("```json") and content.endswith("```"):
                content = content[7:-3].strip()
            result = json.loads(content)
            if not isinstance(result, dict):
                raise ValueError
            return result
        except (ValueError, TypeError, AttributeError):
            raise ProviderUnavailable("Invalid chat response") from None
