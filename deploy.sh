#!/bin/bash
set -e

echo "============================================="
echo "🚀 Starting FailureOps Production Deployment"
echo "============================================="

APP_DIR="/home/ubuntu/failureops"
LOCKFILE="/tmp/failureops_deploy.lock"

# Mutex locking to prevent concurrent build collisions
exec 200>$LOCKFILE
flock -n 200 || {
  echo "⚠️ Another deployment is currently in progress. Waiting for lock..."
  flock 200
}

cd $APP_DIR

# Check if .git directory exists for git-based pull
if [ -d ".git" ]; then
  echo "📦 Pulling latest changes from git repository..."
  git fetch origin main || true
  git reset --hard origin/main || true
fi

echo "🐍 Updating Python virtualenv dependencies..."
if [ -d "$APP_DIR/agentic-rag-main/venv" ] && [ ! -d "$APP_DIR/rag/venv" ]; then
  mv "$APP_DIR/agentic-rag-main/venv" "$APP_DIR/rag/venv" || true
fi
if [ -d "$APP_DIR/agentic-rag-main/storage" ] && [ ! -d "$APP_DIR/rag/storage" ]; then
  mv "$APP_DIR/agentic-rag-main/storage" "$APP_DIR/rag/storage" || true
fi
if [ -f "$APP_DIR/agentic-rag-main/.env" ] && [ ! -f "$APP_DIR/rag/.env" ]; then
  cp "$APP_DIR/agentic-rag-main/.env" "$APP_DIR/rag/.env" || true
fi
cd $APP_DIR/rag
./venv/bin/pip install -r requirements.txt --quiet

echo "🗄️ Verifying Database Tables..."
./venv/bin/python3 -c "from app.db.database import Base, engine; from app.models.document import Document; from app.models.chunk import Chunk; from app.models.analysis import ProjectAnalysis; from app.models.evidence import EvidenceItem; from app.models.signal import SignalItem; Base.metadata.create_all(bind=engine);"

echo "⚛️ Installing Node dependencies & Building Next.js Frontend..."
cd $APP_DIR
npm install --no-audit --prefer-offline --quiet

# Kill any orphaned next build processes before starting fresh build
pkill -f "next build" || true
sleep 1

npm run build

echo "🔄 Zero-downtime PM2 reload..."
pm2 reload $APP_DIR/ecosystem.config.js --update-env || pm2 start $APP_DIR/ecosystem.config.js
pm2 save

echo "🌐 Checking Nginx service status..."
sudo systemctl is-active --quiet nginx || sudo systemctl restart nginx

echo "============================================="
echo "✅ FailureOps Deployment Complete & Live!"
echo "============================================="
