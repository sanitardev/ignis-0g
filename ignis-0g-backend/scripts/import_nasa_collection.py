"""Import the workspace's NASA program briefs and media manifest into existing studies."""
import argparse
import asyncio
import re
from pathlib import Path

from sqlalchemy import select

from app.core.database import engine, session_factory
from app.models import Study as StudyModel
from app.schemas.ingestion import Package
from app.services.ingestion import import_package


WORKSPACE = Path(__file__).resolve().parents[2]
PROGRAMS = {
    "FLEX": {"page": "flex-program.md", "slug": "flex-1", "folder": "01_FLEX_Flame_Extinguishment"},
    "SAME": {"page": "same-program.md", "slug": "same-same-r", "folder": "02_SAME_Smoke_Aerosols"},
    "BASS": {"page": "bass-program.md", "slug": "bass-bass-ii-bass-m", "folder": "03_BASS_Burning_Suppression_Solids"},
    "ACME": {"page": "acme-program.md", "slug": "acme-program-overview-6-experiments", "folder": "04_ACME_Advanced_Combustion"},
    "SoFIE": {"page": "sofie-program.md", "slug": "sofie-gel", "folder": "05_SoFIE_Solid_Fuel_Ignition"},
    "Saffire": {"page": "saffire-program.md", "slug": "saffire-i-iii", "folder": "06_Saffire_Spacecraft_Fire"},
    "STD-6001": {"page": "nasa-std-6001-baselines.md", "slug": "earth-baseline-nasa-std-6001-test-1", "folder": "07_NASA_STD_6001_Baselines"},
}


def source_key(program: str) -> str:
    return f"workspace-research-page-{program.lower().replace('-', '')}"


def parse_media_manifest(media_root: Path, public_base_url: str) -> dict[str, list[dict]]:
    manifest = (media_root / "INDEX_MANIFEST.md").read_text(encoding="utf-8")
    found: dict[str, list[dict]] = {name: [] for name in PROGRAMS}
    for line in manifest.splitlines():
        if not line.startswith("|"):
            continue
        columns = [column.strip() for column in line.strip().strip("|").split("|")]
        if len(columns) < 6:
            continue
        filename_match = re.search(r"`([^`]+)`", columns[2])
        if not filename_match or columns[1] not in found:
            continue
        filename = filename_match.group(1)
        program = columns[1]
        relative = Path("nasa-research-media") / PROGRAMS[program]["folder"] / filename
        if not (media_root / PROGRAMS[program]["folder"] / filename).is_file():
            raise ValueError(f"Media listed in manifest is missing: {relative}")
        description = re.sub(r"`", "", columns[5]).strip()
        description = re.sub(r"^#+\s*", "", description)
        asset_id = columns[4].strip("`")
        found[program].append({
            "media_key": f"nasa-asset-{Path(filename).stem}",
            "source_key": source_key(program),
            "media_type": "image",
            "url": f"{public_base_url.rstrip('/')}/nasa-content/{relative.as_posix()}",
            "caption": f"{description} · NASA asset {asset_id}",
        })
    return found


async def make_package(collection: Path, public_base_url: str) -> Package:
    pages_dir = collection / "research-pages"
    media_dir = collection / "nasa-research-media"
    manifest_media = parse_media_manifest(collection / "nasa-research-media", public_base_url)
    slugs = [entry["slug"] for entry in PROGRAMS.values()]

    async with session_factory() as session:
        rows = (await session.scalars(select(StudyModel).where(StudyModel.slug.in_(slugs)))).all()
        existing = {row.slug: row for row in rows}

    studies = []
    for program, config in PROGRAMS.items():
        row = existing.get(config["slug"])
        if row is None:
            raise ValueError(f"Expected existing catalog study is missing: {config['slug']}")
        page_path = pages_dir / config["page"]
        text_content = page_path.read_text(encoding="utf-8")
        title = text_content.splitlines()[0].lstrip("# ").strip()
        if not title:
            raise ValueError(f"Research page has no title: {page_path}")
        relative_page = Path("research-pages") / config["page"]
        studies.append({
            "slug": row.slug,
            "title": row.title,
            "description": row.description,
            "category": row.category,
            "methodology": row.methodology,
            "tags": row.tags or [],
            "conditions": row.conditions or {},
            "thumbnail_url": str(row.thumbnail_url) if row.thumbnail_url else None,
            "sources": [{
                "source_key": source_key(program),
                "title": f"NASA program research brief — {program}",
                "url": f"{public_base_url.rstrip('/')}/nasa-content/{relative_page.as_posix()}",
                "source_type": "webpage",
                "text_content": text_content,
            }],
            "media": manifest_media[program],
        })

    package = Package.model_validate({"schema_version": 1, "studies": studies})
    media_count = sum(len(study.media) for study in package.studies)
    if len(package.studies) != len(PROGRAMS) or media_count != 24:
        raise ValueError(f"Expected 7 program pages and 24 media files, found {len(package.studies)} and {media_count}")
    return package


async def run(args) -> None:
    try:
        package = await make_package(args.collection, args.public_base_url)
        await import_package(package, dry_run=args.dry_run)
        print(f"{'Validated' if args.dry_run else 'Imported'} {len(package.studies)} program pages and "
              f"{sum(len(study.media) for study in package.studies)} media files")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--collection", type=Path,
        default=WORKSPACE / "nasa-combustion-media-collection",
    )
    parser.add_argument("--public-base-url", default="http://127.0.0.1:8080")
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(run(parser.parse_args()))
