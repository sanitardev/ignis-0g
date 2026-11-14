import asyncio
import importlib
import json
from contextlib import asynccontextmanager
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException

from app.ai.providers import ProviderTimeout
from app.ai.retrieval import Evidence
from app.main import app


@pytest.mark.parametrize("case", [
    "valid", "partial", "omitted", "missing", "false_pair", "invalid_index", "unavailable", "unknown",
])
def test_compare_http_contract(monkeypatch, case):
    main = importlib.import_module("app.main")
    comparison = importlib.import_module("app.ai.comparison")
    evidence = [
        Evidence(uuid4(), uuid4(), slug, slug, "https://example.org", text, "Results")
        for slug, text in [
            ("alpha", "The samples were examined optically."),
            ("beta", "The samples were examined optically in a separate setup."),
            ("alpha", "The report includes an illustration of the apparatus."),
        ]
    ]
    model_calls = []
    embedding_calls = []
    study_ids = ["alpha", "beta", "gamma"] if case in {"partial", "omitted"} else ["alpha", "beta"]
    if case == "omitted":
        evidence.append(Evidence(uuid4(), uuid4(), "gamma", "gamma", "https://example.org", "Setup noted.", "Methods"))

    async def require_study(slug):
        if case == "unknown":
            raise HTTPException(404, ("STUDY_NOT_FOUND", "Study not found"))

    class Repository:
        async def indexed_studies(self, slugs, revision):
            assert slugs == study_ids
            return {"alpha"} if case == "missing" else {item.study_slug for item in evidence}

        async def search_comparison(self, slugs, query, vector, revision, limit):
            assert slugs == study_ids
            assert "measurements" in query and limit >= len(study_ids)
            return evidence

    class Provider:
        model_id = "test"

        async def embed_query(self, query):
            embedding_calls.append(query)
            if case == "unavailable":
                raise ProviderTimeout()
            return [1.0] + [0.0] * 1023

        async def generate(self, messages):
            model_calls.append(messages)
            data = json.loads(messages[-1]["content"])
            assert data["study_ids"] == study_ids
            assert [item["study_id"] for item in data["evidence"]] == [item.study_slug for item in evidence]
            return {
                "status": "answered",
                "summary": "The methods have a common feature.",
                "similarities": [{
                    "text": "Both used optical observation.",
                    "citation_indices": {"false_pair": [1, 3], "invalid_index": [1, 99]}.get(case, [2, 1]),
                }],
                "differences": [],
                "limitations": ["The setups differed."],
            }

    @asynccontextmanager
    async def providers(settings):
        provider = Provider()
        yield provider, None, provider

    monkeypatch.setattr(main.repository, "require_study", require_study)
    monkeypatch.setattr(main, "rate_windows", {})
    monkeypatch.setattr(comparison, "PgVectorRepository", Repository)
    monkeypatch.setattr(comparison, "configured_providers", providers)

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            return await client.post("/api/v1/assistant/compare", json={"study_ids": study_ids, "focus": "Compare measurements"})

    response = asyncio.run(run())
    if case in {"unknown", "unavailable"}:
        assert response.status_code == (404 if case == "unknown" else 504)
        assert not model_calls
        return
    assert response.status_code == 200, response.text
    result = response.json()
    if case in {"valid", "partial", "omitted"}:
        assert result["status"] == "answered"
        assert result["similarities"][0]["citation_indices"] == [1, 2]
        assert [item["chunk_id"] for item in result["citations"]] == [str(evidence[1].chunk_id), str(evidence[0].chunk_id)]
        if case == "partial":
            assert any("No available excerpts" in limit and "gamma" in limit for limit in result["limitations"])
        if case == "omitted":
            assert any("not covered" in limit and "gamma" in limit for limit in result["limitations"])
    else:
        assert result["status"] == "insufficient_evidence"
        assert not result["similarities"] and not result["citations"]
        if case == "missing":
            assert any("beta" in limit for limit in result["limitations"])
            assert not embedding_calls and not model_calls
