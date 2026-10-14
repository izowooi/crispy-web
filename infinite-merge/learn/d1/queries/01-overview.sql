-- 실습 1. 이 DB에 무엇이 있나: 테이블 목록과 행 수
-- npm run lab:d1 -- --file learn/d1/queries/01-overview.sql            (로컬)
-- npm run lab:d1 -- --remote --file learn/d1/queries/01-overview.sql   (운영, 읽기 전용)

SELECT type, name FROM sqlite_master WHERE name LIKE 'im_%' ORDER BY type, name;

-- 참고: D1은 UNION ALL로 이어 붙일 수 있는 SELECT가 5개까지다(일반 SQLite는 500).
-- 6개를 UNION ALL로 이으면 "too many terms in compound SELECT" 오류가 난다. 그래서 스칼라 서브쿼리로 센다.
SELECT (SELECT COUNT(*) FROM im_elements) AS elements,
       (SELECT COUNT(*) FROM im_recipes) AS recipes,
       (SELECT COUNT(*) FROM im_discoveries) AS discoveries,
       (SELECT COUNT(*) FROM im_accounts) AS accounts,
       (SELECT COUNT(*) FROM im_sessions) AS sessions,
       (SELECT COUNT(*) FROM im_guest_usage) AS usage_rows;

-- 앱이 실제로 쓰는 방법: trigger가 관리하는 카운터 한 행만 읽는다 (위 COUNT(*)와 rows_read를 비교해 보세요)
SELECT value AS world_count FROM im_counters WHERE key = 'elements';
