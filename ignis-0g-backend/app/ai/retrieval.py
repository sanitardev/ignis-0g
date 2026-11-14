from dataclasses import dataclass
import re
from uuid import UUID

from sqlalchemy import text

from app.core.database import session_factory
from app.schemas.assistant import ChatRequest


@dataclass(frozen=True)
class Evidence:
    chunk_id: UUID
    source_id: UUID
    study_slug: str
    title: str
    url: str
    excerpt: str
    locator: str | None


_CURRENT_CHUNKS = """
    FROM chunks AS c
    JOIN sources AS s ON s.id = c.source_id
    JOIN studies AS st ON st.id = s.study_id
    WHERE s.indexed_hash = s.content_hash
      AND (c.metadata ->> 'index_revision') = :revision
      AND (CAST(:scope_slug AS text) IS NULL OR st.slug = :scope_slug)
"""

_HAS_CHUNKS = text("SELECT EXISTS (SELECT 1 " + _CURRENT_CHUNKS + ")")
_SEARCH = text("""
    SELECT c.id AS chunk_id, s.id AS source_id, st.slug AS study_slug,
           s.title, s.url, c.content AS excerpt, c.metadata ->> 'locator' AS locator
""" + _CURRENT_CHUNKS + """
    ORDER BY c.embedding <=> CAST(:embedding AS vector),
             (st.slug = CAST(:preferred_slug AS text)) DESC NULLS LAST, c.id
    LIMIT :limit
""")

_STUDIES = text("SELECT DISTINCT st.slug " + _CURRENT_CHUNKS)
_INDEXED_COMPARISON_STUDIES = text(
    "SELECT DISTINCT st.slug " + _CURRENT_CHUNKS + " AND st.slug = ANY(CAST(:target_slugs AS text[]))"
)
_TARGETED_SEARCH = text("""
    SELECT chunk_id, source_id, study_slug, title, url, excerpt, locator
    FROM (
        SELECT c.id AS chunk_id, s.id AS source_id, st.slug AS study_slug,
               s.title, s.url, c.content AS excerpt, c.metadata ->> 'locator' AS locator,
               c.embedding <=> CAST(:embedding AS vector) AS distance,
               coalesce(c.metadata ->> 'locator', '') ~* :section_pattern AS section_match,
               row_number() OVER (
                   PARTITION BY st.slug ORDER BY
                       (coalesce(c.metadata ->> 'locator', '') ~* :section_pattern) DESC,
                       c.embedding <=> CAST(:embedding AS vector), c.id
               ) AS position
""" + _CURRENT_CHUNKS + """
          AND st.slug = ANY(CAST(:target_slugs AS text[]))
    ) AS ranked
    ORDER BY position, section_match DESC, distance, chunk_id
    LIMIT :limit
""")


def section_pattern(question: str) -> str:
    """Lightweight section hints for structured scientific cards, not fact matching."""
    hints = [
        (r"установ|оборудован|стойк|модул|hardware|apparatus|setup|rack", r"установ|оборудован|hardware|apparatus|setup"),
        (r"открыт|явлен|результат|observ|finding|result|discover", r"явлен|результат|observ|finding|result"),
        (r"топлив|услов|давлен|температур|fuel|condition", r"услов|параметр|condition|parameter"),
        (r"связ|преем|relation|connect|heritage", r"преем|применен|relation|connect|application"),
        (r"задач|цел[ьи]|исследовател|руковод|\bpi\b|principal|objective|purpose", r"общая информация|команда|team|overview|objective"),
        (r"идентифик|публикац|отч[её]т|\bdoi\b|\bntrs\b|identifier|publication|report", r"идентифик|публикац|identifier|publication|reference"),
    ]
    return "|".join(section for query, section in hints if re.search(query, question, re.I)) or r"a^"


def named_studies(question: str, slugs: list[str]) -> list[str]:
    """Resolve names against the actual catalog, preferring the longest mention.

    Prefixes identify a program/version; suffixes let a shared program name be
    omitted (e.g. 'ACME Flame Design and BRE'). No invented study IDs are used.
    """
    def normalize(value: str) -> str:
        return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))
    query = normalize(question)
    aliases: dict[str, list[str]] = {}
    generic = {"program", "overview", "experiments", "precursor", "reference"}
    for slug in dict.fromkeys(slugs):
        words = normalize(slug).split()
        for end in range(1, len(words) + 1):
            for parts in (words[:end], words[-end:]):
                if len(parts) == 1 and (len(parts[0]) < 3 or parts[0] in generic):
                    continue
                aliases.setdefault(" ".join(parts), []).append(slug)

    mentions = []
    for alias, candidates in aliases.items():
        for match in re.finditer(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", query):
            # A family mention selects its overview, then its base/combined card.
            slug = min(candidates, key=lambda s: (
                "overview" not in s,
                s.split("-").count(s.split("-")[0]) < 2,
                len(s), s,
            ))
            mentions.append((match.start(), match.end(), slug))
    selected = []
    for start, end, slug in sorted(mentions, key=lambda m: (m[0] - m[1], m[0])):
        if not any(start < old_end and end > old_start for old_start, old_end, _ in selected):
            selected.append((start, end, slug))
    return list(dict.fromkeys(slug for _, _, slug in sorted(selected)))


def _filters(request: ChatRequest, revision: str) -> dict:
    return {
        "scope_slug": request.study_id if request.scope == "study" else None,
        "revision": revision,
    }


class PgVectorRepository:
    async def indexed_studies(self, slugs: list[str], revision: str) -> set[str]:
        async with session_factory() as session:
            rows = await session.scalars(_INDEXED_COMPARISON_STUDIES, {
                "scope_slug": None, "target_slugs": slugs, "revision": revision,
            })
            return set(rows)

    async def search_comparison(
        self, slugs: list[str], query: str, vector: str, revision: str, limit: int,
    ) -> list[Evidence]:
        async with session_factory() as session:
            rows = await session.execute(_TARGETED_SEARCH, {
                "scope_slug": None, "target_slugs": slugs, "revision": revision,
                "embedding": vector, "section_pattern": section_pattern(query), "limit": limit,
            })
            return [Evidence(**row) for row in rows.mappings()]

    async def has_chunks(self, request: ChatRequest, revision: str) -> bool:
        async with session_factory() as session:
            return bool(await session.scalar(_HAS_CHUNKS, _filters(request, revision)))

    async def search(self, request: ChatRequest, vector: str, revision: str, limit: int) -> list[Evidence]:
        async with session_factory() as session:
            params = {
                **_filters(request, revision), "preferred_slug": request.study_id,
                "embedding": vector, "limit": limit,
            }
            rows = await session.execute(_SEARCH, params)
            nearest = [Evidence(**row) for row in rows.mappings()]
            slugs = list((await session.scalars(_STUDIES, params)).all())
            targets = named_studies(request.message, slugs)
            if not targets:
                return nearest
            rows = await session.execute(_TARGETED_SEARCH, {
                **params, "target_slugs": targets,
                "section_pattern": section_pattern(request.message),
                "limit": min(limit, max(limit // 2, len(targets) * 4)),
            })
            targeted = [Evidence(**row) for row in rows.mappings()]
            seen = {item.chunk_id for item in targeted}
            return (targeted + [item for item in nearest if item.chunk_id not in seen])[:limit]
