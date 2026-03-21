#!/bin/bash
# Frontend build test - verifies that Next.js builds without errors
set -e

cd "$(dirname "$0")/.."

echo "=== Frontend Build Test ==="
echo "Running: npm run build"

npm run build

echo ""
echo "✓ Frontend build succeeded"
