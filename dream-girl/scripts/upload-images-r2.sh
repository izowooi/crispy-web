#!/usr/bin/env bash
# Upload all 64 character portraits from public/images to the R2 bucket using the cf CLI.
# Usage: bash scripts/upload-images-r2.sh [bucket-name]
set -euo pipefail
BUCKET="${1:-dream-girl}"
cd "$(dirname "$0")/.."
count=0
for f in public/images/*/*.jpg; do
  key="${f#public/}"
  cf r2 objects put "$key" --bucket-name "$BUCKET" --file "$f" --content-type image/jpeg -q >/dev/null
  count=$((count + 1))
  echo "[$count] uploaded $key"
done
echo "Done: $count objects -> r2://$BUCKET"
