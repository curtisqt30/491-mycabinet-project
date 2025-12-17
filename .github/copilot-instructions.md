<!-- Copilot instructions for contributors and AI coding agents -->
# Copilot / AI Agent Instructions

This file highlights the minimal, high-value knowledge an AI agent needs to be productive in this repository.

- **Project overview:** Mobile app (Expo/React Native frontend) + FastAPI backend. Frontend lives in `frontend/` (TypeScript + `expo-router`). Backend lives in `backend/` (FastAPI, SQLAlchemy, Alembic, PostgreSQL/SQLite).

- **Where to look first:**
  - Backend entry: `backend/app/main.py` (registers routers, CORS, and calls `Base.metadata.create_all`).
  - Backend config: `backend/app/core/config.py` (env-driven settings like `DATABASE_URL`, CORS, tokens).
  - Models: `backend/app/models/` (SQLAlchemy declarative models — imported at startup to register tables).
  - Services: `backend/app/services/` (business logic lives here — e.g., `token_service.py`, `otp_service.py`, `recommender.py`).
  - Migrations: `backend/migrations/` and `alembic.ini` (use Alembic for schema changes).
  - Frontend entry: `frontend/app/index.tsx` and `frontend/package.json` (scripts for `start`, `android`, `test`).

- **Important project conventions (discoverable patterns):**
  - SQLAlchemy 2.x API + declarative Base; models must be imported before `Base.metadata.create_all()` (see `main.py`).
  - Environment variables are authoritative — check `backend/.env.example` and `backend/app/core/config.py` for keys used at runtime.
  - Alembic is the canonical migration tool; create revisions with `python -m alembic revision --autogenerate -m "msg"` and apply with `python -m alembic upgrade head`.
  - Tests use `pytest` and `pytest-asyncio` (backend tests under `backend/tests` — run from `backend/`).
  - Pydantic v2 is used for schemas (see `backend/app/schemas/*`) — validate against v2 idioms.

- **How to run locally (explicit commands to use):**
  - Backend (PowerShell):
    - `cd backend`
    - `python -m venv venv`
    - `.\venv\Scripts\activate`
    - `pip install -r requirements.txt`
    - copy `backend/.env.example` → `backend/.env` and fill DB/email creds
    - `python -m alembic upgrade head`
    - `uvicorn app.main:app --reload --port 8000`
  - Frontend (PowerShell / project root):
    - `cd frontend`
    - `npm install`
    - `npm start` (press `a` to open Android emulator or `w` for web)

- **Testing & linting:**
  - Backend unit tests: `cd backend && pytest -q`
  - Frontend tests: `cd frontend && npm test`
  - Frontend formatting/lint: `npm run format` and `npm run lint` (see `frontend/package.json`)

- **Key integration points to be careful with:**
  - Token / auth flows: `backend/app/services/token_service.py` + `backend/app/models/auth_token.py` — changing token structure affects API clients.
  - Recommender: `backend/app/services/recommender.py` uses TheCocktailDB + local data — network calls and caching patterns live here.
  - Database migrations vs. `Base.metadata.create_all`: codebase uses `create_all` in dev but relies on Alembic for persistent schema changes. Prefer Alembic for structural migrations.

- **Files that demonstrate common patterns / good examples:**
  - `backend/app/main.py` — how routers and models are wired.
  - `backend/app/core/config.py` — env-driven config pattern.
  - `backend/app/services/*.py` — service-layer separation from routes/schemas.
  - `frontend/package.json` — canonical script names and test/lint workflow for UI work.

- **When editing code, follow these detectable rules:**
  - Keep business logic inside `services/` and keep `api/` routes thin.
  - Import models at top-level before any `create_all` calls to ensure table registration.
  - Use env keys present in `.env.example` rather than inventing new ones without updating the template.

If anything above is unclear or you'd like more examples (route locations, typical test patterns, or common migration commands), tell me which area to expand and I will iterate.
