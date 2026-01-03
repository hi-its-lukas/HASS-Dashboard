#!/bin/sh
set -e

# Auto-generate ENCRYPTION_KEY if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  KEY_FILE="/data/.encryption_key"
  
  if [ -f "$KEY_FILE" ]; then
    # Load existing key
    export ENCRYPTION_KEY=$(cat "$KEY_FILE")
    echo "[Setup] Loaded existing encryption key"
  else
    # Generate new key
    export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
    echo "$ENCRYPTION_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "[Setup] Generated new encryption key"
  fi
fi

# Initialize database if needed
if [ ! -f "/data/ha-dashboard.db" ]; then
  echo "[Setup] Initializing database..."
  npx prisma db push --skip-generate 2>/dev/null || true
fi

echo "[Setup] Starting HA Dashboard..."
exec node server.js
