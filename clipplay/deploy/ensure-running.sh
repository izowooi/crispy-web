#!/bin/sh
# Run by launchd (dev.clipplay.pm2) at login and every 5 minutes.
# Waits for the external data volume, then makes sure the pm2 app is up.
set -eu
PATH=/opt/homebrew/bin:/usr/bin:/bin
export PATH
APP_DIR=$(cd "$(dirname "$0")/.." && pwd)
DATA_DIR=$(sed -n 's/^CLIPPLAY_DATA_DIR=//p' "$APP_DIR/.env.local" | tail -1)

[ -n "$DATA_DIR" ] && [ -d "$DATA_DIR" ] || exit 0

pid=$(pm2 pid clipplay 2>/dev/null | tail -1)
case "$pid" in ''|0|*[!0-9]*) ;; *) kill -0 "$pid" 2>/dev/null && exit 0 ;; esac
pm2 startOrRestart "$APP_DIR/ecosystem.config.cjs"
pm2 save
