#!/bin/bash
set -e

echo "Running FailureOps Smoke Tests..."

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "Checking Frontend Health..."
curl -f -s "$FRONTEND_URL/api/health" > /dev/null || {
  echo "❌ Frontend health check failed!"
  exit 1
}
echo "✅ Frontend is Healthy"

echo "Checking Backend Health..."
curl -f -s "$BACKEND_URL/api/v1/health" > /dev/null || {
  echo "❌ Backend health check failed!"
  exit 1
}
echo "✅ Backend is Healthy"

echo "🎉 All Smoke Tests Passed Successfully!"
