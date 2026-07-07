#!/bin/bash
# Run all three ThermalAI test suites and exit non-zero if any fail.
set -e

ROOT=$(git rev-parse --show-toplevel)

echo "========================================="
echo " Backend tests  (Jest + supertest)"
echo "========================================="
cd "$ROOT/backend" && npm test

echo ""
echo "========================================="
echo " Frontend tests (React Testing Library)"
echo "========================================="
cd "$ROOT/frontend" && CI=true npm test

echo ""
echo "========================================="
echo " ML model tests (pytest)"
echo "========================================="
cd "$ROOT/ml-model" && python -m pytest tests/ -v

echo ""
echo "✅ All test suites passed."
