#!/bin/sh
# Uploads build/pack.bin to private R2 under its content-addressed key (idempotent).
# SAM5_BUCKET overrides the bucket (must match r2_buckets in wrangler.jsonc).
set -eu
cd "$(dirname "$0")/.."
BUCKET=${SAM5_BUCKET:-sam5-personal-gamepacks}
KEY=$(node -p 'require("./build/pack-manifest.json").key')
npx wrangler r2 object put "$BUCKET/$KEY" --file build/pack.bin \
  --content-type application/octet-stream --remote >/dev/null
echo "uploaded $KEY"
