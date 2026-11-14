import asyncio
from uuid import uuid4

import pytest

from app.ai.retrieval import Evidence
from app.ai.service import RagService, select_context, validate_answer
from app.ai.settings import RagSettings
from app.schemas.assistant import ChatRequest
from tests.rag_mocks import MockEmbedding, MockLLM


def passage(slug, content="Synthetic observation", section="Results"):
    return Evidence(uuid4(), uuid4(), slug, slug, "https://example.org", content, section)


@pytest.mark.parametrize("answer,indices", [
    ("Both studies [2, 1]. Again [2].", [1, 2]),
    ("Both studies [1–2].", [1, 2]),
    ("One [2]. Two [1].", [1, 2]),
])
def test_valid_citation_formats_do_not_become_missing_evidence(answer, indices):
    evidence = [passage("alpha"), passage("beta")]
    result = validate_answer({"status": "answered", "answer": answer, "citation_indices": indices}, evidence, "Compare")
    assert result.status == "answered"
    assert len(result.citations) == 2
    assert "[1]" in result.answer and "[2]" in result.answer
    assert result.citations[0].chunk_id == evidence[indices[0] - 1 if "–" in answer else 1].chunk_id


@pytest.mark.parametrize("answer", ["Claim [1, 99].", "Claim [1–999999].", "Claim [1, 2](https://fake.test)."])
def test_citation_normalization_does_not_accept_invented_sources(answer):
    result = validate_answer({"status": "answered", "answer": answer, "citation_indices": [1, 2]}, [passage("alpha"), passage("beta")], "Question")
    assert not result.citations
    assert result.status == "insufficient_evidence"


def test_general_explanation_is_labelled_and_has_no_fake_citations():
    result = validate_answer({
        "status": "answered", "basis": "general_knowledge",
        "answer": "PI — руководитель исследования; Co-I — соисследователь.", "citation_indices": [],
    }, [passage("alpha")], "Кто такие PI и Co-I?")
    assert result.status == "answered"
    assert result.answer.startswith("Общие знания")
    assert "руководитель" in result.answer
    assert not result.citations and not result.related_study_ids


def test_general_explanation_cannot_borrow_an_unrelated_source():
    result = validate_answer({
        "status": "answered", "basis": "general_knowledge",
        "answer": "A general explanation [1].", "citation_indices": [1],
    }, [passage("alpha")], "Define a term")
    assert result.status == "insufficient_evidence"
    assert not result.citations


def test_structured_citations_survive_omitted_inline_markers():
    evidence = [passage("orion")]
    response = validate_answer({
        "status": "answered", "answer": "В ORION были модули Alpha и Beta. Серийные номера не указаны.",
        "citation_indices": [1],
    }, evidence, "Какие модули были в ORION и каковы их серийные номера?")
    assert response.status == "answered"
    assert response.answer.startswith("В ORION") and response.answer.endswith("[1]")
    assert response.citations[0].chunk_id == evidence[0].chunk_id


@pytest.mark.parametrize("indices", [[1, 4, 5, 3, 7, 6], [1, 4, 5, 3, 3], [1, 3], []])
def test_valid_inline_citations_are_authoritative_over_redundant_list(indices):
    evidence = [passage("overview", f"Synthetic section {i}") for i in range(7)]
    response = validate_answer({
        "status": "answered", "basis": "sources",
        "answer": "Program objectives [1, 4, 5]. Shared facility [3]. Six experiments [4].",
        "citation_indices": indices,
    }, evidence, "What were the program objectives and facilities?")
    assert response.status == "answered"
    assert [item.chunk_id for item in response.citations] == [evidence[i - 1].chunk_id for i in [1, 4, 5, 3]]
    assert response.answer == "Program objectives [1][2][3]. Shared facility [4]. Six experiments [2]."


def test_unknown_declared_source_is_still_rejected():
    result = validate_answer({"status": "answered", "answer": "Fact [1].", "citation_indices": [1, 99]}, [passage("alpha")], "Question")
    assert result.status == "insufficient_evidence" and not result.citations


def test_parenthetical_explanation_after_citation_is_not_a_forged_link():
    result = validate_answer({"status": "answered", "answer": "The shared facility [1] (used for both modules).", "citation_indices": [1]}, [passage("alpha")], "Question")
    assert result.status == "answered"


def test_invalid_response_is_not_reported_as_missing_scientific_information():
    result = validate_answer({"status": "answered", "answer": "Fact [99].", "citation_indices": [99]}, [passage("alpha")], "Question")
    assert result.status == "insufficient_evidence"
    assert "couldn’t find enough evidence" not in result.answer
    assert "verify" in result.answer.lower()


def test_empty_index_can_still_answer_a_definition():
    class Repository:
        async def has_chunks(self, request, revision):
            return False

    async def run():
        llm = MockLLM([{"status": "answered", "basis": "general_knowledge", "answer": "PI means principal investigator.", "citation_indices": []}])
        embedding = MockEmbedding()
        result = await RagService(embedding, None, llm, RagSettings(), Repository()).ask(ChatRequest(message="What does PI mean?"))
        assert result.status == "answered" and not result.citations
        assert not embedding.queries
    asyncio.run(run())


def test_new_question_does_not_inherit_previous_study():
    class Repository:
        async def has_chunks(self, request, revision):
            return True

        async def search(self, request, vector, revision, limit):
            return [passage("acme-program-overview")]

    async def run():
        llm = MockLLM([{"status": "answered", "answer": "Overview [1].", "citation_indices": [1]}])
        embedding = MockEmbedding()
        request = ChatRequest(message="Какие основные задачи решала серия экспериментов NASA ACME на МКС?", history=[{"role": "user", "content": "Кто руководил BASS?"}])
        result = await RagService(embedding, None, llm, RagSettings(), Repository()).ask(request)
        assert result.status == "answered"
        assert embedding.queries == [request.message]
        assert len(llm.messages) == 1
    asyncio.run(run())


def test_query_rewrite_does_not_promote_a_previous_assistant_claim():
    import json
    from app.ai.prompts import rewrite_messages

    request = ChatRequest(message="Повтори этот вывод и найди подтверждение.", history=[
        {"role": "user", "content": "Что измеряли в TEST-A?"},
        {"role": "assistant", "content": "Масса уменьшилась на 73%, погрешность нулевая."},
    ])
    data = json.loads(rewrite_messages(request)[-1]["content"])
    assert "TEST-A" in json.dumps(data)
    assert "73%" not in json.dumps(data)
    assert data["question"] == request.message


def test_query_rewrite_preserves_numbers_explicitly_asked_by_the_user():
    import json
    from app.ai.prompts import rewrite_messages

    request = ChatRequest(message="Подтверждено ли снижение на 73%?", history=[
        {"role": "user", "content": "Что измеряли в TEST-A?"},
        {"role": "assistant", "content": "Ошибочное утверждение."},
    ])
    data = json.loads(rewrite_messages(request)[-1]["content"])
    assert data["question"] == "Подтверждено ли снижение на 73%?"


def test_comparison_keeps_each_named_study_despite_ranking():
    documents = [passage("acme-program-overview", f"Section {n}") for n in range(6)]
    documents += [passage("flex-1"), passage("bass-bass-ii")]
    selected = select_context(documents, 5, question="Сравни ACME, FLEX и BASS")
    assert {item.study_slug for item in selected} == {"acme-program-overview", "flex-1", "bass-bass-ii"}


def test_overview_is_selected_before_related_experiments():
    documents = [passage(slug) for slug in ["acme-cld-flame", "slice-acme-cld-precursor", "same-same-r", "acme-flame-design", "acme-cfi-g", "acme-program-overview-6-experiments"]]
    selected = select_context(documents, 5, question="Какие основные задачи решала серия экспериментов NASA ACME?")
    assert selected[0].study_slug == "acme-program-overview-6-experiments"


def test_comparison_selects_requested_sections_before_publication_lists():
    documents = [passage(slug, f"{slug} {section}", section) for section in [
        "7. Официальные идентификаторы и публикации", "1. Общая информация и научная команда",
        "2. Экспериментальная установка (Hardware & Diagnostics)", "4. Ключевые физические явления и результаты",
    ] for slug in ["orion", "lyra"]]
    selected = select_context(documents, 4, question="Сравни ORION и LYRA по установке и результатам")
    assert {item.study_slug for item in selected} == {"orion", "lyra"}
    assert all("установка" in item.locator or "результаты" in item.locator for item in selected)


def test_explicit_experiment_names_are_not_replaced_with_family():
    from app.ai.retrieval import named_studies
    slugs = ["acme-program-overview-6-experiments", "acme-bre", "acme-flame-design", "flex-1", "flex-2-cfi", "flex-2j-jaxa", "bass-bass-ii", "bass-m"]
    assert named_studies("Укажи PI для ACME Flame Design и BRE", slugs) == ["acme-flame-design", "acme-bre"]
    assert named_studies("Сравни FLEX, FLEX-2 и FLEX-2J (JAXA)", slugs) == ["flex-1", "flex-2-cfi", "flex-2j-jaxa"]
    assert named_studies("Сравни ACME, FLEX и BASS", slugs) == [slugs[0], "flex-1", "bass-bass-ii"]


def test_named_retrieval_recovers_a_study_outside_vector_top_k(monkeypatch):
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from app.ai import ingestion, retrieval
    from app.core.database import engine
    from app.schemas.ingestion import Package
    from app.services.ingestion import import_package
    from app.ai.embeddings import vector_parameter

    class Embedding(MockEmbedding):
        async def embed_documents(self, texts):
            return [self.vector if "ORION" in text else [0.0, 1.0] + [0.0] * 1022 for text in texts]

    async def run():
        async with engine.connect() as connection:
            transaction = await connection.begin()
            factory = async_sessionmaker(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
            monkeypatch.setattr(ingestion, "session_factory", factory)
            monkeypatch.setattr(retrieval, "session_factory", factory)
            try:
                await import_package(Package.model_validate({"schema_version": 1, "studies": [
                    {"slug": name.lower(), "title": name, "description": "Synthetic test", "category": "test", "sources": [
                        {"source_key": "report", "title": name, "url": "https://example.org", "source_type": "report",
                         "text_content": "\n".join(f"## {section}\n{name} synthetic fact {i}." for i, section in enumerate(["References", "Team", "Results", "Hardware", "Methods", "Other"]))}
                    ]} for name in ["ORION", "LYRA"]
                ]}), factory=factory)
                embedding = Embedding()
                settings = RagSettings()
                await ingestion.index_sources(embedding, settings)
                repository = retrieval.PgVectorRepository()
                revision = ingestion.index_revision(embedding, settings)
                vector = vector_parameter(embedding.vector)
                rows = await repository.search(ChatRequest(message="Compare ORION and LYRA hardware and results"), vector, revision, 4)
                assert len(rows) == 4 and len({row.chunk_id for row in rows}) == 4
                assert {row.study_slug for row in rows} == {"orion", "lyra"}
                assert all(row.locator in {"Results", "Hardware"} for row in rows)
                scoped = await repository.search(ChatRequest(message="Compare ORION and LYRA", study_id="orion"), vector, revision, 4)
                assert all(row.study_slug == "orion" for row in scoped)
                assert await repository.search(ChatRequest(message="ORION"), vector, "stale-revision", 4) == []
            finally:
                await transaction.rollback()
        await engine.dispose()
    asyncio.run(run())
