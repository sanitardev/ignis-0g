import asyncio
import logging
import re
from time import monotonic
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pydantic_core import from_json

from app.ai.embeddings import vector_parameter
from app.ai.ingestion import index_revision
from app.ai.language import notice_language
from app.ai.prompts import build_messages, rewrite_messages
from app.ai.providers import (
    EmbeddingProvider, LLMProvider, ProviderUnavailable, RerankerProvider, StreamingLLMProvider, TextDelta,
)
from app.ai.retrieval import Evidence, PgVectorRepository, named_studies, section_pattern
from app.ai.settings import RagSettings, settings_from_env
from app.ai.wiring import configured_providers
from app.schemas.assistant import ChatRequest, ChatResponse, Citation


logger = logging.getLogger("uvicorn.error.rag")


class GroundedAnswer(BaseModel):
    model_config = ConfigDict(strict=True)
    status: Literal["answered", "insufficient_evidence"]
    basis: Literal["sources", "general_knowledge"] = "sources"
    answer: str
    citation_indices: list[int] = Field(default_factory=list)
    suggested_questions: object = None


def insufficient_evidence(
    question: str = "", *, suggestions: list[str] | None = None,
) -> ChatResponse:
    message = {
        "ru": "В доступных источниках пока нет сведений, на которые можно опереться для ответа.",
        "kk": "Қолжетімді дереккөздерде бұл сұраққа жауап беруге жеткілікті мәлімет жоқ.",
        "en": "I couldn’t find enough evidence in the available sources to answer this question.",
    }[notice_language(question)]
    return ChatResponse(
        status="insufficient_evidence",
        answer=message,
        citations=[],
        related_study_ids=[],
        suggested_questions=suggestions or [],
    )


def invalid_answer(question: str, reason: str) -> ChatResponse:
    # Keep the public status contract, but never describe a formatting failure
    # as a lack of scientific evidence. Log the cause without source content.
    logging.getLogger(__name__).warning("Answer validation failed: %s", reason)
    response = insufficient_evidence(question)
    response.answer = {
        "ru": "Не удалось проверить формат ответа и ссылки на источники. Повторите запрос.",
        "kk": "Жауаптың пішімін және дереккөздерге сілтемелерді тексеру мүмкін болмады. Қайта сұрап көріңіз.",
        "en": "Could not verify the answer format and source references. Please try again.",
    }[notice_language(question)]
    return response


class RagService:
    def __init__(
        self, embedding: EmbeddingProvider, reranker: RerankerProvider | None,
        llm: LLMProvider, settings: RagSettings, repository: PgVectorRepository,
    ):
        self.embedding = embedding
        self.reranker = reranker
        self.llm = llm
        self.settings = settings
        self.repository = repository

    async def ask(self, request: ChatRequest, *, on_delta: TextDelta | None = None) -> ChatResponse:
        started = monotonic()
        revision = index_revision(self.embedding, self.settings)
        if not await self.repository.has_chunks(request, revision):
            logger.info("rag outcome=no_index")
            return await self._answer(request, [], on_delta)

        query = request.message
        if request.history and needs_rewrite(request.message):
            try:
                async with asyncio.timeout(2.5):
                    rewritten = await self.llm.generate(rewrite_messages(request))
            except (ProviderUnavailable, TimeoutError):
                logger.info("rag stage=rewrite outcome=fallback")
                rewritten = None
            # Only a reference-dependent question may borrow the previous topic.
            previous = next((item.content for item in reversed(request.history) if item.role == "user"), "")
            query = (request.message + "\n" + previous[:500]).strip()
            if isinstance(rewritten, dict) and isinstance(rewritten.get("query"), str):
                candidate = rewritten["query"].strip()
                if 0 < len(candidate) <= 2000:
                    query = candidate

        logger.info("rag stage=embedding")
        vector = vector_parameter(await self.embedding.embed_query(query))
        search_request = request.model_copy(update={"message": query})
        evidence = await self.repository.search(search_request, vector, revision, self.settings.candidate_limit)
        logger.info("rag stage=retrieval candidates=%d", len(evidence))
        if not evidence:
            return await self._answer(request, [], on_delta)
        if self.reranker:
            try:
                async with asyncio.timeout(2.5):
                    ranking = await self.reranker.rerank(query, evidence)
                if all(type(index) is int and 0 <= index < len(evidence) for index in ranking):
                    ranking = list(dict.fromkeys(ranking))
                    ranked = set(ranking)
                    evidence = [evidence[index] for index in ranking] + [
                        item for index, item in enumerate(evidence) if index not in ranked
                    ]
            except (ProviderUnavailable, TimeoutError):
                logger.info("rag stage=rerank outcome=fallback")

        context = select_context(evidence, self.settings.context_limit, question=query, diversify=request.scope == "global")
        logger.info("rag stage=generation context_count=%d", len(context))
        result = await self._answer(request, context, on_delta)
        logger.info("rag outcome=%s citations=%d elapsed_ms=%d", result.status, len(result.citations), (monotonic() - started) * 1000)
        return result

    async def _answer(
        self, request: ChatRequest, context: list[Evidence], on_delta: TextDelta | None,
    ) -> ChatResponse:
        if on_delta is not None and isinstance(self.llm, StreamingLLMProvider):
            raw = await self.llm.generate_stream(build_messages(request, context, streaming=True), answer_deltas(on_delta))
        else:
            raw = await self.llm.generate(build_messages(request, context))
        return validate_answer(raw, context, request.message)


def answer_deltas(emit: TextDelta) -> TextDelta:
    """Extract only the user-facing text from incomplete JSON."""
    buffer = ""
    previous = ""

    async def feed(fragment: str) -> None:
        nonlocal buffer, previous
        buffer += fragment
        value = buffer.lstrip()
        if value.startswith("```json"):
            value = value[7:].lstrip()
        try:
            partial = from_json(value, allow_partial="trailing-strings")
        except ValueError:
            return
        if not isinstance(partial, dict) or partial.get("status") != "answered":
            return
        answer = partial.get("answer")
        if isinstance(answer, str) and answer.startswith(previous) and answer != previous:
            await emit(answer[len(previous):])
            previous = answer

    return feed


async def ask(request: ChatRequest, *, on_delta: TextDelta | None = None) -> ChatResponse:
    message = request.message.casefold().rstrip(".!?…").rstrip()
    if message in {"привет", "здравствуй", "здравствуйте", "доброе утро", "добрый день", "добрый вечер"}:
        greeting = "Привет! Чем помочь? Можно спросить об экспериментах NASA или горении в микрогравитации."
    elif message in {"hi", "hello", "hey", "good morning", "good afternoon", "good evening"}:
        greeting = "Hello! How can I help? Ask me about NASA experiments or combustion in microgravity."
    elif message in {"сәлем", "сәлеметсіз бе", "қайырлы таң", "қайырлы күн", "қайырлы кеш"}:
        greeting = "Сәлем! Қалай көмектесе аламын? NASA тәжірибелері немесе микрогравитациядағы жану туралы сұрай аласыз."
    else:
        greeting = None

    if greeting is not None:
        return ChatResponse(
            status="answered",
            answer=greeting,
            citations=[],
            related_study_ids=[],
            suggested_questions=[],
        )

    settings = settings_from_env()
    async with configured_providers(settings) as (embedding, reranker, llm):
        return await RagService(embedding, reranker, llm, settings, PgVectorRepository()).ask(request, on_delta=on_delta)


def needs_rewrite(question: str) -> bool:
    return bool(re.search(
        r"\b(это|этот|этом|этого|эти|этим|они|оно|их|его|такой|такие|там|выше|"
        r"it|its|they|them|those|that|this|these)\b|"
        r"^(?:а |и )?(?:почему[?!.]*|подробнее[?!.]*|объясни проще[?!.]*|продолжи[?!.]*)$|"
        r"^(?:simplify|elaborate|continue)\b",
        question.casefold().strip(),
    ))


def select_context(evidence: list[Evidence], limit: int, *, question: str = "", diversify: bool = False) -> list[Evidence]:
    pattern = section_pattern(question)
    evidence = sorted(evidence, key=lambda item: not re.search(pattern, item.locator or "", re.I))
    targets = named_studies(question, [item.study_slug for item in evidence])
    groups = [[item for item in evidence if item.study_slug == slug] for slug in targets]
    # Reserve context for every requested study, even after reranking. Cycle
    # through their sections so one study cannot crowd out the comparison.
    priority = [group[i] for i in range(max(map(len, groups), default=0)) for group in groups if i < len(group)]
    selected = []
    deferred = []
    seen = set()
    seen_studies = set()
    for item in priority + evidence:
        key = (item.study_slug, " ".join(item.excerpt.casefold().split()))
        if key in seen:
            continue
        seen.add(key)
        if diversify and not targets and item.study_slug in seen_studies:
            deferred.append(item)
        else:
            selected.append(item)
            seen_studies.add(item.study_slug)
        if len(selected) == limit:
            break
    return (selected + deferred)[:limit]


def suggested_questions(raw: object, current_question: str) -> list[str]:
    if not isinstance(raw, list):
        return []
    questions = []
    seen = {" ".join(current_question.casefold().split())}
    for item in raw:
        if not isinstance(item, str):
            continue
        question = " ".join(item.split())
        if (
            not 5 <= len(question) <= 160
            or not question.endswith(("?", "？", "؟"))
            or re.search(r"[<>\[\]`]|://", question)
        ):
            continue
        key = question.casefold()
        if key in seen:
            continue
        seen.add(key)
        questions.append(question)
        if len(questions) == 2:
            break
    return questions


def validate_answer(raw: object, evidence: list[Evidence], question: str) -> ChatResponse:
    try:
        result = GroundedAnswer.model_validate(raw)
    except ValidationError:
        return invalid_answer(question, "schema")

    suggestions = suggested_questions(result.suggested_questions, question)
    if result.status == "insufficient_evidence":
        return insufficient_evidence(question, suggestions=suggestions)

    answer = result.answer.strip()
    try:
        answer = normalize_citations(answer, len(evidence))
    except ValueError:
        return invalid_answer(question, "citation_out_of_range")
    markers = list(dict.fromkeys(re.findall(r"\[([0-9]+)\]", answer)))
    indices = list(dict.fromkeys(result.citation_indices))
    if result.basis == "general_knowledge":
        if not answer or indices or markers or re.search(r"<(?:/?[A-Za-z]|!--)", answer):
            return invalid_answer(question, "ungrounded_general_answer")
        label = {
            "ru": "Общие знания — пояснение вне загруженных исследований.",
            "kk": "Жалпы мәлімет — бұл түсіндірме жүктелген зерттеулерге негізделмеген.",
            "en": "General knowledge — explanation outside the uploaded studies.",
        }[notice_language(question)]
        return ChatResponse(status="answered", answer=f"{label}\n\n{answer}", citations=[],
                            related_study_ids=[], suggested_questions=suggestions)
    if answer and not markers and indices and all(1 <= index <= len(evidence) for index in indices):
        # Some models populate the structured references but omit inline ones.
        # Preserve those references as answer-level sources; do not guess which
        # source supports each sentence, or silently discard mismatched markers.
        label = {"ru": "Источники ответа", "kk": "Жауаптың дереккөздері", "en": "Answer sources"}[
            notice_language(question)
        ]
        markers = [str(index) for index in indices]
        answer += f"\n\n{label}: " + " ".join(f"[{marker}]" for marker in markers)
    if (
        not answer
        or re.search(r"<(?:/?[A-Za-z]|!--)", answer)
        or not markers
        or any(not 1 <= index <= len(evidence) for index in indices)
        or re.search(r"\[[0-9]+\]\([^\n)]*\)|(?m:^\s{0,3}\[[0-9]+\]:)", answer)
    ):
        return invalid_answer(question, "invalid_answer_or_references")

    # Inline markers identify which evidence the text actually cites. The
    # redundant JSON list may omit or repeat valid IDs, or include unused ones.
    # Both representations have already been checked against retrieved chunks.
    indices = [int(marker) for marker in markers]
    cited = [evidence[index - 1] for index in indices]
    renumber = {str(index): str(number) for number, index in enumerate(indices, start=1)}
    answer = re.sub(r"\[([0-9]+)\]", lambda match: f"[{renumber[match[1]]}]", answer)
    citations = [
        Citation(
            chunk_id=item.chunk_id, source_id=item.source_id, title=item.title,
            url=item.url, excerpt=item.excerpt, locator=item.locator,
        )
        for item in cited
    ]
    return ChatResponse(
        status="answered",
        answer=answer,
        citations=citations,
        related_study_ids=list(dict.fromkeys(item.study_slug for item in cited)),
        suggested_questions=suggestions,
    )


def normalize_citations(answer: str, count: int) -> str:
    def replace(match: re.Match) -> str:
        indices = []
        for group in match[1].split(","):
            parts = re.split(r"\s*[-–]\s*", group.strip())
            if len(parts) > 2 or not all(part.isdecimal() for part in parts):
                raise ValueError("Invalid citation")
            start, end = int(parts[0]), int(parts[-1])
            if not 1 <= start <= end <= count:
                raise ValueError("Citation outside retrieved evidence")
            indices.extend(range(start, end + 1))
        return "".join(f"[{index}]" for index in dict.fromkeys(indices))

    # Normalize grouped and ranged references before checking their IDs; never
    # remove invalid IDs to make an unsupported response appear grounded.
    return re.sub(r"\[([0-9][0-9,\s–-]*)\]", replace, answer)
