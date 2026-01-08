#!/bin/sh
set -e

APP_USER="nextjs"
APP_UID="1001"
DATA_DIR="/data"
KEY_FILE="$DATA_DIR/.encryption_key"
DB_FILE="$DATA_DIR/hass-dashboard.db"
APP_GROUP="nodejs"

log_info() {
  echo "[INIT] $1"
}

log_warn() {
  echo "[WARN] $1"
}

log_fatal() {
  echo "[FATAL] $1"
  exit 1
}

ensure_data_dir() {
  if [ ! -d "$DATA_DIR" ]; then
    log_fatal "$DATA_DIR does not exist. You must mount a persistent volume at $DATA_DIR to preserve encryption keys and user data across container restarts. Example: docker run -v /path/to/data:/data ..."
  fi

  if ! mountpoint -q "$DATA_DIR" 2>/dev/null; then
    if [ "${ALLOW_EPHEMERAL_DATA:-}" = "true" ]; then
      log_warn "$DATA_DIR is not a mounted volume. Data WILL BE LOST on container restart!"
      log_warn "This is only acceptable for testing. Set ALLOW_EPHEMERAL_DATA=true to suppress this warning."
    else
      log_fatal "$DATA_DIR is not a mounted volume. Refusing to start to prevent encryption key loss. Mount a persistent volume: docker run -v /path/to/data:/data ... or set ALLOW_EPHEMERAL_DATA=true for testing only."
    fi
  fi

  if [ "$(id -u)" = "0" ]; then
    log_info "Fixing ownership of $DATA_DIR"
    chown -R "$APP_UID:$APP_UID" "$DATA_DIR" 2>/dev/null || log_warn "Could not chown $DATA_DIR"
    chmod 755 "$DATA_DIR" 2>/dev/null || true
  fi

  if [ ! -w "$DATA_DIR" ]; then
    log_fatal "$DATA_DIR is not writable. Please check volume permissions on host."
  fi
}

setup_encryption_key() {
  if [ -n "$ENCRYPTION_KEY" ]; then
    log_info "Using ENCRYPTION_KEY from environment"
    return
  fi

  if [ -f "$KEY_FILE" ]; then
    export ENCRYPTION_KEY=$(cat "$KEY_FILE")
    log_info "Loaded existing encryption key from $KEY_FILE"
    
    KEY_LEN=$(echo -n "$ENCRYPTION_KEY" | wc -c)
    if [ "$KEY_LEN" -ne 64 ]; then
      log_fatal "Existing encryption key at $KEY_FILE is invalid (expected 64 hex chars, got $KEY_LEN). Refusing to start to prevent data corruption."
    fi
  else
    log_info "Generating new encryption key"
    export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
    echo "$ENCRYPTION_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    log_info "Saved encryption key to $KEY_FILE"
    log_info "IMPORTANT: Back up $KEY_FILE - losing it means losing access to all encrypted tokens!"
  fi
}

init_database() {
  # Run Prisma as nextjs user so database is created with correct ownership
  if [ "$(id -u)" = "0" ]; then
    if [ -f "$DB_FILE" ]; then
      log_info "Existing database found at $DB_FILE"
      log_info "Syncing database schema..."
      gosu "$APP_USER" ./node_modules/.bin/prisma db push --accept-data-loss 2>&1 || log_warn "Schema sync had warnings"
    else
      log_info "Creating new database at $DB_FILE"
      gosu "$APP_USER" ./node_modules/.bin/prisma db push 2>&1 || log_warn "Initial schema push had warnings"
    fi
  else
    if [ -f "$DB_FILE" ]; then
      log_info "Existing database found at $DB_FILE"
      log_info "Syncing database schema..."
      ./node_modules/.bin/prisma db push --accept-data-loss 2>&1 || log_warn "Schema sync had warnings"
    else
      log_info "Creating new database at $DB_FILE"
      ./node_modules/.bin/prisma db push 2>&1 || log_warn "Initial schema push had warnings"
    fi
  fi
  
  log_info "Database ready"
}

run_app() {
  log_info "Starting HASS Dashboard on port ${PORT:-80}"
  
  # Ensure Next.js binds to all interfaces (required for Docker)
  export HOSTNAME="0.0.0.0"
  
  # Run combined server (Next.js + WebSocket proxy on same port)
  if [ "$(id -u)" = "0" ]; then
    log_info "Dropping privileges to $APP_USER"
    exec gosu "$APP_USER" node server/combined-server.js
  else
    exec node server/combined-server.js
  fi
}

ensure_data_dir
setup_encryption_key
init_database
run_app
