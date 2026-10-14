-- 실습 3. 인덱스와 rows_read: D1 Free는 "읽은 행 수"로 한도를 센다 (하루 500만 행)
-- 각 문장의 meta.rows_read를 비교해 보세요.

-- (a) PRIMARY KEY 조회: 인덱스로 한 행만 읽는다 → rows_read ≈ 1
SELECT * FROM im_recipes WHERE pair_key = '물+불';
EXPLAIN QUERY PLAN SELECT * FROM im_recipes WHERE pair_key = '물+불';

-- (b) 인덱스 없는 열로 조회: 테이블 전체를 훑는다 → rows_read = 레시피 수
SELECT * FROM im_recipes WHERE result_name = '증기';
EXPLAIN QUERY PLAN SELECT * FROM im_recipes WHERE result_name = '증기';

-- (c) 세션 만료 정리에 쓰는 인덱스(im_sessions_expires_at)
EXPLAIN QUERY PLAN DELETE FROM im_sessions WHERE expires_at < 0;
