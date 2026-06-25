#!/bin/bash
# First-time project setup.
# Run once after cloning: bash scripts/setup.sh
set -e

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

echo "=== 1/4  Copying .env example files ==="
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "  Created backend/.env — fill in MONGO_URI, JWT_SECRET, Twilio, and Gmail values."
else
  echo "  backend/.env already exists, skipping."
fi

if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  echo "  Created frontend/.env — default value is correct for local dev."
else
  echo "  frontend/.env already exists, skipping."
fi

echo ""
echo "=== 2/4  Installing Node dependencies ==="
cd "$ROOT/backend"  && npm install
cd "$ROOT/frontend" && npm install

echo ""
echo "=== 3/4  Installing Python dependencies ==="
cd "$ROOT/ml-model" && pip install -r requirements.txt

echo ""
echo "=== 4/4  Installing git pre-commit hook ==="
cp "$ROOT/scripts/pre-commit" "$ROOT/.git/hooks/pre-commit"
chmod +x "$ROOT/.git/hooks/pre-commit"
echo "  Hook installed at .git/hooks/pre-commit"

echo ""
echo "✅ Setup complete."
echo ""
echo "Start services in this order:"
echo "  1. cd ml-model && python app.py"
echo "  2. cd backend  && node server.js"
echo "  3. cd frontend && npm start"
echo "  4. cd ml-model && python stream_data.py   # sensor simulator"
