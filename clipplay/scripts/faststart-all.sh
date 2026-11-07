#!/bin/bash
# Remux existing videos so the moov atom sits before mdat (+faststart).
# Lossless (-c copy). Lets playback start without fetching the file tail first.
# usage: scripts/faststart-all.sh <CLIPPLAY_DATA_DIR> [parallel=4]
set -uo pipefail
DIR=${1:?data dir}; PAR=${2:-4}
FFMPEG=${FFMPEG_PATH:-ffmpeg}; FFPROBE=${FFPROBE_PATH:-ffprobe}
export FFMPEG FFPROBE

one() {
  f=$1
  first=$("$FFPROBE" -v trace -i "$f" 2>&1 | grep -o -m1 "type:'\(moov\|mdat\)'")
  [ "$first" = "type:'mdat'" ] || exit 0
  tmp="${f%.*}.faststart.${f##*.}"
  if "$FFMPEG" -hide_banner -loglevel error -y -i "$f" -map 0 -c copy -movflags +faststart "$tmp"; then
    touch -r "$f" "$tmp" && mv "$tmp" "$f" && echo "ok $f"
  else
    rm -f "$tmp"; echo "FAIL $f"
  fi
}
export -f one
find "$DIR/videos" -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' \) ! -name '*.faststart.*' -print0 |
  xargs -0 -P "$PAR" -I{} bash -c 'one "$1"' _ {}
