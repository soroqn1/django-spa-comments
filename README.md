# django-spa-comments

Full-stack demo of a threaded comments SPA backed by Django REST Framework. Users can post messages with attachments, vote, bookmark, and observe updates in real time via WebSockets.

## Stack and Features

- Django 4.2, DRF, Simple JWT auth
- PostgreSQL storage, Redis cache/broker
- Celery worker broadcasting comment updates
- Channels + Channels-Redis for WebSockets (`/ws/comments/`)
- Vue 3 + Vite frontend, Tailwind-ish styling
- Attachment validation (PNG/JPEG/GIF/TXT) + metadata extraction
- Strict HTML sanitization (allowed tags: `a`, `strong`, `i`, `code`)

## Prerequisites

- Docker and Docker Compose v2
- Optional: Node.js 20+ if you want to run the frontend locally without Docker

## Quick Start (Docker)

```fish
# Clone the repo and move into it first
docker compose build
docker compose run --rm backend python manage.py migrate
docker compose up
```

Exposed endpoints:

- Frontend SPA: `http://localhost:5173`
- API root: `http://localhost:8000/api/`
- WebSocket: `ws://localhost:8000/ws/comments/`

### Useful one-off commands

```fish
# Run Django tests
docker compose run --rm backend python manage.py test

# Create an admin user
docker compose run --rm backend python manage.py createsuperuser

# Open a Django shell
docker compose run --rm backend python manage.py shell
```

All compose services:

- `db` – PostgreSQL 15 with persisted volume `postgres_data`
- `redis` – Redis 7 used for cache, Celery broker, channel layer
- `backend` – Django API served on port 8000
- `celery` – Celery worker processing broadcast tasks
- `frontend` – Built Vue SPA served by nginx on port 5173

## Environment Configuration

The default settings expect the compose network hostnames. Override via environment variables if needed:

- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` – configured in `docker-compose.yml`
- `VITE_API_BASE_URL` – frontend API URL (defaults to `http://localhost:8000/api`)
- `VITE_WS_BASE_URL` – optional override for WebSocket origin

When running the frontend outside Docker set these in a `.env` file at `frontend/.env`.

## Local Development Without Docker

Backend:

```fish
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
export REDIS_URL=redis://127.0.0.1:6379/0
python backend/manage.py migrate
python backend/manage.py runserver
```

Ensure PostgreSQL and Redis are available locally (or point Django settings to SQLite for quick tests).

Frontend:

```fish
cd frontend
npm install
npm run dev
```

## Testing and Quality Checks

- Backend unit tests: `python backend/manage.py test`
- Frontend type check: `cd frontend && npm run build`

## Production Notes

- Collect static files if you enable Django templates (`python manage.py collectstatic`)
- Update `ALLOWED_HOSTS` in `backend/core/settings.py`
- Configure HTTPS and secure cookie settings when deploying behind a proxy

## Troubleshooting

- **`Could not connect to Redis`** – ensure `redis` service is up or adjust `REDIS_URL`
- **WebSocket not updating** – verify `backend` is running via `asgi` (Daphne/Uvicorn) in production; `runserver` in compose is for development only
- **Attachment errors** – only PNG/JPEG/GIF up to 5 MB and TXT up to 100 KB are accepted