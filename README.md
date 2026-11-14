# IGNIS 0G workspace

The frontend uses the existing FastAPI service and PostgreSQL database from `ignis-0g-backend/compose.yaml`. The database already contains the imported research catalog; this workspace Compose file starts only the frontend.

## Start the full app

Start the backend database. The committed database snapshot can restore the current catalog on a fresh workspace before starting the API:

```sh
cd ignis-0g-backend
docker compose up -d --wait db
docker compose exec -T db pg_restore --no-owner --no-privileges -U ignis -d ignis < ../database-snapshots/ignis-20261114-185736.dump
docker compose up -d --wait api
```

Skip the restore command when the database already contains the catalog. Restore only into an empty database.

Then, from the workspace root, build and start the frontend:

```sh
docker compose up --build -d --wait
```

Open the app at <http://localhost:8080>. It requests live data from the existing API at `127.0.0.1:8000` through Nginx; the API docs are at <http://localhost:8000/docs>. The frontend container uses host networking to reach the already-running API. To stop just the frontend, run `docker compose stop` from this directory. Manage the backend and database from `ignis-0g-backend/` as usual.

## Local frontend development

With the backend already running, from the frontend directory:

```sh
cd ignis-0g-frontend
cp .env.example .env.local
npm ci
npm run dev
```

Vite serves the frontend at <http://localhost:5173> and proxies `/api` and `/health` to the backend. The local frontend environment file opts into the live API; mock mode remains available by setting `VITE_USE_MOCKS=true`.

The active database now contains 22 studies, 29 sources, 24 media records, and 237 indexed chunks. The 22 knowledge-base cards were already present; the 7 program overview pages and all 24 assets from `nasa-combustion-media-collection/` have now been added and indexed. Markdown is the canonical text copy; matching TXT and DOCX exports were not duplicated. The frontend serves local source files under `/nasa-content/` and renders attached NASA images in study details.

To repeat or refresh this supplemental import after changing the source material:

```sh
cd ignis-0g-backend
.venv/bin/python -m scripts.import_nasa_collection --dry-run
.venv/bin/python -m scripts.import_nasa_collection
docker compose exec -T api python -m scripts.index_sources
cd ..
docker compose up --build -d --wait
```

The importer adds pages and media to existing study IDs, so it can be rerun without duplicating them. LLM settings are managed by the existing backend Compose project, not this frontend-only Compose file.

## Workspace layout

- `ignis-0g-frontend/` — React, TypeScript, and Vite app.
- `ignis-0g-backend/` — FastAPI API, PostgreSQL migrations, and data import/indexing tools.
- `nasa-combustion-media-collection/` — research pages and associated NASA media.
- `compose.yaml` — starts the frontend and connects it to the existing API.
