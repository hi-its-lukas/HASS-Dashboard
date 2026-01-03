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
    log_info "Creating $DATA_DIR directory"
    mkdir -p "$DATA_DIR" 2>/dev/null || log_fatal "Cannot create $DATA_DIR"
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
  else
    log_info "Generating new encryption key"
    export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')
    echo "$ENCRYPTION_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    log_info "Saved encryption key to $KEY_FILE"
  fi
}

init_database() {
  if [ -f "$DB_FILE" ]; then
    log_info "Existing database found at $DB_FILE"
    log_info "Running safe schema migrations..."
    ./node_modules/.bin/prisma migrate deploy 2>&1 || log_warn "Migration had warnings (may be up-to-date)"
  else
    log_info "Creating new database at $DB_FILE"
    ./node_modules/.bin/prisma migrate deploy 2>&1 || log_warn "Initial migration had warnings"
  fi
  log_info "Database ready"
}

run_app() {
  log_info "Starting HASS Dashboard on port ${PORT:-80}"
  
  if [ "$(id -u)" = "0" ]; then
    log_info "Dropping privileges to $APP_USER"
    exec gosu "$APP_USER" node server.js
  else
    exec node server.js
  fi
}

ensure_data_dir
setup_encryption_key
init_database
run_app
