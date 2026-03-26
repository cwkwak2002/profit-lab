"""Playwright E2E test configuration.

Requires both backend and frontend servers to be running:
  Backend:  cd backend && uvicorn main:app --port 8000
  Frontend: cd frontend && npm run dev  (default port 3000)

Run with:
  pytest tests/e2e/ --headed          # visible browser
  pytest tests/e2e/                   # headless (default)
  pytest tests/e2e/ --slowmo=500      # slow motion (ms)
"""
import pytest

BASE_URL = "http://localhost:3001"
API_URL  = "http://localhost:8000"
