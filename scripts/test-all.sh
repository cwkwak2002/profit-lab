#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================"
echo " Backend Tests (pytest)"
echo "========================================"
cd "$ROOT/backend"
python3 -m pytest tests/ -v

echo ""
echo "========================================"
echo " Frontend Build Test (next build)"
echo "========================================"
cd "$ROOT/frontend"
npm run build

echo ""
echo "========================================"
echo " All tests passed!"
echo "========================================"
