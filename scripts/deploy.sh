#!/usr/bin/env bash
# ThermalAI Docker deployment — build, start, verify, report status.
# Requires Docker + Docker Compose and a configured backend/.env.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f backend/.env ]]; then
  echo "ERROR: backend/.env missing — copy backend/.env.example and fill MONGO_URI/JWT_SECRET first." >&2
  exit 1
fi

echo "==> Building images (no cache)"
docker-compose build --no-cache

echo "==> Starting stack"
docker-compose up -d

echo "==> Waiting for backend health (10s)"
sleep 10

if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
  echo "==> Health check PASSED"
else
  echo "==> Health check FAILED — inspect with: docker-compose ps / logs" >&2
fi

echo "==> Stack status"
docker-compose ps
