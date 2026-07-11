# ── Stage 1: build the Next.js frontend into a static site ───────────
FROM node:20-slim AS frontend

WORKDIR /app/frontend

# Install deps from the lockfile for a reproducible build.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Build the static export (emits ./out).
COPY frontend/ ./
ENV NEXT_OUTPUT_EXPORT=1
RUN npm run build


# ── Stage 2: Python backend that serves the API + the static site ────
FROM python:3.12-slim AS runtime

WORKDIR /app/backend

# Python deps.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source (excludes the local venv/db via .dockerignore).
COPY backend/ ./

# Compiled frontend from stage 1.
COPY --from=frontend /app/frontend/out /app/frontend/out

# Persistent data (SQLite DB + uploads) lives here — mount a volume at /data.
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/frontend/out
RUN mkdir -p /data

EXPOSE 8000

# Railway/hosts inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
