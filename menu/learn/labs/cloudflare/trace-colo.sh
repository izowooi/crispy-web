#!/usr/bin/env bash
# 내 요청이 어느 Cloudflare 데이터센터(colo)로 들어가는지 확인한다. 읽기 전용, 공개 주소만 호출한다.
# 사용법: bash trace-colo.sh [호스트]   (기본값: bm.zowoo.uk)
set -euo pipefail

HOST="${1:-bm.zowoo.uk}"

echo "== 1) /cdn-cgi/trace — 내 요청을 받은 colo (airport code) =="
# ip= 줄(내 공인 IP)은 일부러 출력하지 않는다.
curl -fsS "https://${HOST}/cdn-cgi/trace" | grep -E '^(colo|loc|http|tls|visit_scheme)=' || echo "(trace 응답 없음)"

echo
echo "== 2) 응답 헤더 — cf-ray 끝 3글자가 요청을 받은 colo, cf-placement 는 Worker 가 실제로 돈 곳 =="
curl -fsSI "https://${HOST}/" | grep -i -E '^(cf-ray|cf-placement|server):' || true

cat <<'TXT'

읽는 법
  colo=HKG, cf-ray 끝이 -HKG      → 내 요청이 홍콩 데이터센터로 들어왔다
  cf-placement: remote-ICN        → 그런데 Worker 코드는 서울(ICN) 근처에서 실행됐다 (placement 덕분)
  cf-placement 헤더가 없다        → placement 설정이 없거나, 이 호스트는 Workers 가 아니다
TXT
