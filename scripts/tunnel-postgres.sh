#!/usr/bin/env bash
# ==============================================================================
# FailureOps X — PostgreSQL VPS SSH Tunnel Manager
# ==============================================================================
# Maps localhost:5432 -> VPS 3.110.185.102:5432
# Allows accessing the remote PostgreSQL database transparently via localhost.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$ROOT_DIR/.postgres_tunnel.pid"

VPS_HOST="3.110.185.102"
VPS_USER="ubuntu"
LOCAL_PORT="5432"
REMOTE_PORT="5432"

# Locate SSH Key
if [ -f "$ROOT_DIR/missing.pem" ]; then
    SSH_KEY="$ROOT_DIR/missing.pem"
elif [ -f "$ROOT_DIR/missingme.pem" ]; then
    SSH_KEY="$ROOT_DIR/missingme.pem"
else
    echo "❌ Error: Could not find missing.pem or missingme.pem in $ROOT_DIR"
    exit 1
fi

chmod 600 "$SSH_KEY" 2>/dev/null || true

is_tunnel_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    # Also check if any SSH tunnel is already listening on 5432
    if lsof -i :"$LOCAL_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

start_tunnel() {
    if is_tunnel_running; then
        echo "✅ PostgreSQL SSH Tunnel is already running on localhost:$LOCAL_PORT"
        show_info
        return 0
    fi

    echo "🔌 Starting PostgreSQL SSH Tunnel (localhost:$LOCAL_PORT -> $VPS_HOST:$REMOTE_PORT)..."
    ssh -i "$SSH_KEY" \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -f -N \
        -L "$LOCAL_PORT:127.0.0.1:$REMOTE_PORT" \
        "$VPS_USER@$VPS_HOST"

    sleep 1

    PID=$(lsof -i :"$LOCAL_PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)
    if [ -n "$PID" ]; then
        echo "$PID" > "$PID_FILE"
        echo "🚀 PostgreSQL Tunnel established successfully! (PID: $PID)"
        show_info
    else
        echo "❌ Failed to start tunnel or bind port $LOCAL_PORT."
        exit 1
    fi
}

stop_tunnel() {
    echo "🛑 Stopping PostgreSQL SSH Tunnel..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi

    # Kill any lingering process listening on local port 5432 if it's ssh
    PIDS=$(lsof -i :"$LOCAL_PORT" -sTCP:LISTEN -t 2>/dev/null || true)
    for p in $PIDS; do
        if ps -p "$p" -o comm= 2>/dev/null | grep -qi "ssh"; then
            kill "$p" 2>/dev/null || true
        fi
    done

    echo "✅ Tunnel stopped."
}

status_tunnel() {
    if is_tunnel_running; then
        PID=$(lsof -i :"$LOCAL_PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)
        echo "🟢 Status: ACTIVE (PID: ${PID:-unknown}) on localhost:$LOCAL_PORT -> $VPS_HOST:$REMOTE_PORT"
        show_info
    else
        echo "🔴 Status: INACTIVE (No tunnel listening on localhost:$LOCAL_PORT)"
    fi
}

test_connection() {
    echo "🔍 Testing database connection via localhost:$LOCAL_PORT..."
    if ! is_tunnel_running; then
        echo "⚠️ Tunnel is not running. Starting it now..."
        start_tunnel
    fi

    python3 - << 'EOF'
import sys
try:
    import psycopg2
    conn = psycopg2.connect(
        "postgresql://failureops_user:failureops_secure_pass_2026@127.0.0.1:5432/failureops",
        connect_timeout=5
    )
    cur = conn.cursor()
    cur.execute("SELECT current_database(), current_user, version();")
    db, user, ver = cur.fetchone()
    print(f"\n🎉 Successfully connected to VPS Database via localhost:5432!")
    print(f"  • Database : {db}")
    print(f"  • User     : {user}")
    print(f"  • Version  : {ver.split(',')[0]}")
    
    cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    count = cur.fetchone()[0]
    print(f"  • Tables   : {count} public tables ready\n")
    conn.close()
except Exception as e:
    print(f"\n❌ Connection test failed: {e}\n")
    sys.exit(1)
EOF
}

show_info() {
    echo ""
    echo "📋 Connection Details (for .env, DBeaver, TablePlus, psql, pgAdmin):"
    echo "  ───────────────────────────────────────────────────────────────────"
    echo "  Host:         127.0.0.1 (or localhost)"
    echo "  Port:         5432"
    echo "  Database:     failureops"
    echo "  User:         failureops_user  (or: postgres)"
    echo "  Password:     failureops_secure_pass_2026  (or: postgres)"
    echo "  URL:          postgresql://failureops_user:failureops_secure_pass_2026@127.0.0.1:5432/failureops"
    echo "  ───────────────────────────────────────────────────────────────────"
    echo ""
}

case "${1:-start}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        stop_tunnel
        sleep 1
        start_tunnel
        ;;
    status)
        status_tunnel
        ;;
    test)
        test_connection
        ;;
    info)
        show_info
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test|info}"
        exit 1
        ;;
esac
