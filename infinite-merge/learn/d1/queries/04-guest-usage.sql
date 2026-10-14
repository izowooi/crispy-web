-- 실습 4. 방어 장치가 남기는 흔적: 오늘(KST) 게스트 사용량
-- scope: '*' 전체, 'guest:…' 게스트 1명, 'ip:<hash>' IP별 모델 호출, 'join:<hash>' IP별 새 게스트 수
SELECT day,
       CASE WHEN scope = '*' THEN '전체'
            WHEN scope LIKE 'guest:%' THEN '게스트'
            WHEN scope LIKE 'ip:%' THEN 'IP 모델호출'
            WHEN scope LIKE 'join:%' THEN 'IP 새게스트' END AS kind,
       substr(scope, 1, 18) AS scope, count
  FROM im_guest_usage
 WHERE day = date('now', '+9 hours')
 ORDER BY count DESC;
