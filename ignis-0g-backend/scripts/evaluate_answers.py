"""Opt-in real-provider smoke test. Sends synthetic fixtures only; never reads the DB.

Run after loading provider credentials: python -m scripts.evaluate_answers
"""
import asyncio
import json
import re
import time
from uuid import uuid4

from app.ai.retrieval import Evidence
from app.ai.service import RagService
from app.ai.settings import settings_from_env
from app.ai.wiring import configured_providers
from app.schemas.assistant import ChatRequest


def fixtures() -> list[Evidence]:
    return [
        Evidence(uuid4(), uuid4(), slug, "Synthetic fixture: " + slug, "https://example.org/" + slug, excerpt, section)
        for slug, section, excerpt in [
            ("orion-program-overview", "Overview", "Вымышленная программа ORION сравнивала видимость цветных карточек. В ней использовали два модуля: стол Alpha с белым фоном и стол Beta с серым фоном."),
            ("orion-program-overview", "Results", "В ORION бирюзовую карточку было легче различить на белом фоне. Измерений яркости не проводили."),
            ("lyra", "Overview", "Вымышленная программа LYRA изучала различимость геометрических фигур на столе Gamma. Фигуры были плоскими бумажными кругами и треугольниками."),
            ("lyra", "Results", "В LYRA круги легче различались на полосатом фоне. Скорость распознавания не измеряли."),
        ]
    ]


class SyntheticRepository:
    def __init__(self):
        self.documents = fixtures()

    async def has_chunks(self, request, revision):
        return True

    async def search(self, request, vector, revision, limit):
        return self.documents


async def main():
    cases = [
        ("overview", "Какие задачи решала ORION и какие модули в неё входили?", "answered", {"orion-program-overview"}),
        ("comparison", "Сравни ORION и LYRA по цели, установке и результатам.", "answered", {"orion-program-overview", "lyra"}),
        ("analysis", "Проанализируй ORION и LYRA вместе: что их результаты позволяют предположить о роли фона в различимости объектов и почему это нельзя считать универсальным законом? Дай развёрнутый анализ, свяжи наблюдения из разных источников, отдели выводы от фактов и объясни ограничения.", "answered", {"orion-program-overview", "lyra"}),
        ("definition", "Кто такие PI и Co-I?", "answered", set()),
        ("physics", "Объясни простыми словами, почему нагретый воздух поднимается.", "answered", set()),
        ("partial", "Какие модули были в ORION и каковы их серийные номера?", "answered", {"orion-program-overview"}),
        ("missing_fact", "Какой серийный номер у стола Alpha в ORION?", "insufficient_evidence", set()),
        ("missing_pi", "Кто был главным исследователем ORION? Назови имя.", "insufficient_evidence", set()),
    ]
    settings = settings_from_env()
    failures = []
    async with configured_providers(settings) as (embedding, reranker, llm):
        service = RagService(embedding, reranker, llm, settings, SyntheticRepository())
        for label, question, status, studies in cases:
            request = ChatRequest(message=question, history=[{"role": "user", "content": "Как устроена LYRA?"}])
            start = time.monotonic()
            result = await service.ask(request)
            passed = result.status == status and set(result.related_study_ids) == studies
            if label in {"definition", "physics"}:
                passed = passed and result.answer.startswith("Общие знания") and not result.citations
            if label == "analysis":
                passed = passed and len(result.answer) >= 1200 and len(result.citations) >= 2
                # These fixtures use different objects and backgrounds. The
                # observations do not establish a contradiction between studies.
                passed = passed and not re.search(
                    r"результаты (?:двух программ )?противоречат|результаты противоречивы|"
                    r"наблюдение противоречит|противоречивые результаты",
                    result.answer, re.I,
                )
            print(json.dumps({"case": label, "passed": passed, "seconds": round(time.monotonic() - start, 2),
                              "status": result.status, "studies": result.related_study_ids, "answer": result.answer}, ensure_ascii=False), flush=True)
            if not passed:
                failures.append(label)
    if failures:
        raise SystemExit("Failed: " + ", ".join(failures))


if __name__ == "__main__":
    asyncio.run(main())
