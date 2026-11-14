# IGNIS 0G frontend

React, TypeScript, and Vite frontend for the IGNIS 0G research explorer. Requires Node.js 20.19+ or 22.12+.

## Run with the complete workspace

From the parent workspace directory, start PostgreSQL, the API, and the frontend together:

```sh
cp .env.example .env
docker compose up --build -d --wait
```

Open <http://localhost:8080>. The frontend uses the live API at `/api/v1` through the Nginx proxy. See the parent [workspace README](../README.md) for data import and local development.

## Run the frontend locally

Start the backend API first, then run:

```sh
cp .env.example .env.local
npm ci
npm run dev
```

Vite serves <http://localhost:5173> and proxies `/api` and `/health` to `127.0.0.1:8000`. Set `VITE_USE_MOCKS=true` in `.env.local` to use the bundled demo data instead. Restart Vite after changing environment variables.

## Project map

- `src/app/` — explorer, study views, comparisons, and assistant UI.
- `src/api/client.ts` — HTTP client for the backend.
- `src/api/validation.ts` and `src/domain/types.ts` — response validation and API types.
- `src/mocks/` — local demo data and transport.
- `Dockerfile` and `nginx.conf` — production build and same-origin API proxy.

The API base URL is `/api/v1`. The client uses the backend contract documented in `../ignis-0g-backend/docs/API_SPEC.md`: studies, filters, datasets, relations, Nexus graph, assistant chat, and comparison.

`npm run typecheck` checks TypeScript types. `npm run build` creates the static site in `dist/`; `npm run preview` serves it locally.
