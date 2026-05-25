#!/bin/bash
set -e

echo "==> Setting up InsureFlow AI..."

# Backend setup
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# Seed DB if empty
if [ ! -f "insurance_crm.db" ]; then
  echo "==> Seeding database with sample data..."
  python seed_data.py
fi

echo "==> Starting backend on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

cd ../frontend
if [ ! -d "node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  npm install -q
fi

echo "==> Starting frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "InsureFlow AI is running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT INT TERM
wait
