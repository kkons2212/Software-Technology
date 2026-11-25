# ==============================================================================
# SMART MUSEUM - UNIFIED FULL-STACK PRODUCTION CONTAINER
# Multi-stage build: React 18 / Vite SPA (Frontend) + FastAPI (Backend)
# ==============================================================================

# --- Stage 1: Build Frontend SPA ---
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy frontend dependency manifests
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and compile optimized production bundle
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime Backend & Static Serving ---
FROM python:3.10-slim

WORKDIR /app

# Install curl for container healthcheck and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./

# Copy compiled frontend production assets from Stage 1 into /app/frontend_dist
COPY --from=frontend-builder /build/dist /app/frontend_dist

# Ensure required runtime media and cache directories exist
RUN mkdir -p /app/static/images /app/static/audio /app/audio_cache

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
