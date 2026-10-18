#!/bin/bash
set -eu
cd "$(dirname "$0")"
if ! python3 -c '' >/dev/null 2>&1; then
  echo 'Python 3가 필요합니다. Python 3를 설치한 뒤 다시 실행하세요.'
  echo '개발자 도구 설치 창이 떴다면 설치 후 다시 실행하세요.'
  echo 'Node.js가 있으면 이 폴더의 터미널에서 다음 명령도 사용할 수 있습니다:'
  echo 'npx http-server web -a 127.0.0.1 -p 8000'
  echo '그런 다음 Safari/Chrome에서 http://localhost:8000/ 을 여세요.'
  read -r -p 'Enter를 누르면 닫습니다. ' ignored
  exit 1
fi
echo '게임 서버 실행 중: 종료하려면 이 터미널에서 Ctrl+C를 누르세요.'
# Python's http.server with fixed JS/WASM/BIN MIME types; no pip/npm needed.
# SAM5_MAC_PORT=8001 ./start.command selects another stable browser storage origin.
if ! python3 server.py --directory "$PWD/web" --port "${SAM5_MAC_PORT:-8000}" --open; then
  read -r -p '서버를 시작하지 못했습니다. 위 오류를 확인하고 Enter를 누르세요. ' ignored
  exit 1
fi
