from __future__ import annotations

import asyncio
import json
import logging
from time import monotonic
from collections.abc import Awaitable, Callable, Sequence
from typing import TYPE_CHECKING, Protocol, runtime_checkable
from urllib.parse import urlsplit

import httpx

if TYPE_CHECKING:
    from app.ai.retrieval import Evidence

logger = logging.getLogger("uvicorn.error.rag")

Message = dict[str, str]
TextDelta = Callable[[str], Awaitable[None]]


class ProviderUnavailable(Exception):
    pass


class ProviderTimeout(ProviderUnavailable):
    pass


class StreamingUnsupported(ProviderUnavailable):
    pass


class EmbeddingProvider(Protocol):
    @property
    def model_id(self) -> str: ...
    async def embed_documents(self, texts: Sequence[str]) -> Sequence[Sequence[float]]: ...
    async def embed_query(self, query: str) -> Sequence[float]: ...


class RerankerProvider(Protocol):
    async def rerank(self, query: str, documents: Sequence[Evidence]) -> Sequence[int]:
        """Return zero-based positions in descending relevance order."""
        ...


class LLMProvider(Protocol):
    async def generate(self, messages: Sequence[Message]) -> object: ...


@runtime_checkable
class StreamingLLMProvider(LLMProvider, Protocol):
    async def generate_stream(self, messages: Sequence[Message], on_delta: TextDelta) -> object: ...


class JsonAPI:
    def __init__(self, client: httpx.AsyncClient, base_url: str, key: str, timeout: float, retries: int):
        self.client = client
        self.base_url = base_url.rstrip("/")
        self.key = key
        self.timeout = timeout
        self.retries = retries

    def _headers(self) -> dict[str, str]:
        url = urlsplit(self.base_url)
        if url.scheme != "https" or not url.hostname or url.username or url.password or not self.key:
            raise ProviderUnavailable("Missing or invalid provider configuration")
        return {"Authorization": f"Bearer {self.key}"}

    async def post(self, path: str, payload: dict) -> dict:
        headers = self._headers()
        for attempt in range(self.retries + 1):
            started = monotonic()
            try:
                async with asyncio.timeout(self.timeout):
                    response = await self.client.post(
                        self.base_url + path,
                        headers=headers,
                        json=payload, timeout=self.timeout, follow_redirects=False,
                    )
            except (TimeoutError, httpx.TimeoutException):
                failure = ProviderTimeout
            except httpx.TransportError:
                failure = ProviderUnavailable
            else:
                logger.info("rag provider endpoint=%s status=%d attempt=%d elapsed_ms=%d", path, response.status_code, attempt + 1, (monotonic() - started) * 1000)
                if response.is_success:
                    try:
                        data = response.json()
                    except ValueError:
                        raise ProviderUnavailable("Invalid provider response") from None
                    if not isinstance(data, dict):
                        raise ProviderUnavailable("Invalid provider response")
                    return data

                failure = ProviderUnavailable
                if response.status_code not in {408, 429, 500, 502, 503, 504}:
                    raise failure(f"Provider returned HTTP {response.status_code}")
                if response.status_code in {408, 504}:
                    failure = ProviderTimeout

            if failure is ProviderTimeout or failure is ProviderUnavailable:
                logger.info("rag provider endpoint=%s outcome=%s attempt=%d", path, failure.__name__, attempt + 1)
            if attempt == self.retries:
                raise failure("Provider request failed") from None
            await asyncio.sleep(0.15 * (2 ** attempt))
        raise ProviderUnavailable

    async def stream(self, path: str, payload: dict, on_event: Callable[[dict], Awaitable[None]]) -> None:
        headers = {**self._headers(), "Accept": "text/event-stream"}
        try:
            async with asyncio.timeout(self.timeout):
                async with self.client.stream(
                    "POST", self.base_url + path, headers=headers, json=payload,
                    timeout=self.timeout, follow_redirects=False,
                ) as response:
                    if response.status_code in {400, 405, 415, 422, 501}:
                        raise StreamingUnsupported("Provider rejected streaming request")
                    if response.status_code in {408, 504}:
                        raise ProviderTimeout("Provider timed out")
                    if not response.is_success:
                        raise ProviderUnavailable(f"Provider returned HTTP {response.status_code}")
                    if response.headers.get("content-type", "").split(";")[0].strip() != "text/event-stream":
                        raise StreamingUnsupported("Provider did not return an event stream")

                    data = []
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            data.append(line[5:].lstrip(" "))
                        elif not line and data:
                            value = "\n".join(data)
                            data.clear()
                            if value == "[DONE]":
                                return
                            event = json.loads(value)
                            if not isinstance(event, dict) or event.get("error") is not None:
                                raise ProviderUnavailable("Provider stream reported an error")
                            await on_event(event)
        except (TimeoutError, httpx.TimeoutException):
            raise ProviderTimeout("Provider stream timed out") from None
        except (httpx.TransportError, ValueError):
            raise ProviderUnavailable("Provider stream could not be read") from None
