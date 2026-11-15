import asyncio
import json

import httpx
import pytest

from app.ai.llm import RemoteLLM
from app.ai.providers import JsonAPI, ProviderUnavailable
from app.ai.service import RagService
from app.ai.settings import RagSettings
from app.schemas.assistant import ChatRequest
from tests.rag_mocks import MockEmbedding


def sse(frame):
    return f"data: {json.dumps(frame)}\r\n\r\n".encode()


@pytest.mark.parametrize("finish", ["stop", "length", "error", None])
def test_provider_streams_only_answer_text_before_completion(finish):
    class NoIndex:
        async def has_chunks(self, request, revision):
            return False

    async def run():
        chunks = []
        answer = 'La flamme perd de la chaleur.\nUne mesure de température aide à le vérifier. 🔬'
        head, tail = answer.split("\n")
        fragment = json.dumps(head, ensure_ascii=True)[:-1]
        last_fragment = json.dumps("\n" + tail, ensure_ascii=True)[1:]

        async def emit(text):
            chunks.append(text)

        class ResponseBody(httpx.AsyncByteStream):
            async def __aiter__(self):
                yield b": processing\r\n\r\n"
                for part in [
                    '{"status":"answered","basis":"general_knowledge","evidence_assessment":{"note":"internal"},',
                    '"answer":' + fragment,
                ]:
                    yield sse({"choices": [{"delta": {"content": part}}]})
                assert "".join(chunks) == head
                if finish == "error":
                    yield sse({"error": {"message": "upstream error"}})
                    return
                yield sse({"choices": [{"delta": {"content": last_fragment + ',"citation_indices":[]}'}}]})
                if finish is not None:
                    yield sse({"choices": [{"delta": {}, "finish_reason": finish}]})
                yield b"data: [DONE]\r\n\r\n"

        async def handle(request):
            payload = json.loads(request.content)
            assert payload["stream"] is True
            data = json.loads(payload["messages"][1]["content"])
            assert data["question"] == "Pourquoi la flamme s’éteint-elle ?"
            assert data["conversation"][0]["content"] == "Explain flame extinction."
            assert "directly in that language" in payload["messages"][0]["content"]
            return httpx.Response(200, headers={"content-type": "text/event-stream"}, stream=ResponseBody())

        async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
            llm = RemoteLLM(JsonAPI(client, "https://openrouter.ai/api/v1", "mock", 2, 0), "test", 1000)
            rag = RagService(MockEmbedding(), None, llm, RagSettings(), NoIndex())
            request = ChatRequest(
                message="Pourquoi la flamme s’éteint-elle ?",
                history=[{"role": "user", "content": "Explain flame extinction."}],
            )
            if finish == "stop":
                result = await rag.ask(request, on_delta=emit)
                assert result.status == "answered" and result.answer.endswith(answer)
                assert "".join(chunks) == answer
            else:
                with pytest.raises(ProviderUnavailable):
                    await rag.ask(request, on_delta=emit)

    asyncio.run(run())


def test_provider_without_streaming_falls_back_to_one_json_response():
    requests = []

    async def handle(request):
        streaming = json.loads(request.content).get("stream", False)
        requests.append(streaming)
        if streaming:
            return httpx.Response(400)
        return httpx.Response(200, json={"choices": [{"finish_reason": "stop", "message": {
            "content": '{"status":"answered","answer":"Bonjour"}',
        }}]})

    async def emit(text):
        pytest.fail(f"Unexpected delta: {text}")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
            llm = RemoteLLM(JsonAPI(client, "https://example.test/v1", "mock", 2, 0), "test", 1000)
            result = await llm.generate_stream([], emit)
            assert result["answer"] == "Bonjour"

    asyncio.run(run())
    assert requests == [True, False]
