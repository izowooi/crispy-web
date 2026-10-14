-- D1 연습장 (로컬 DB 전용)
-- 실행: npx wrangler d1 execute baby-menu --local --file learn/labs/data/d1-playground.sql
-- 이 파일은 lab_scratch 라는 연습용 테이블만 만들고, 마지막에 지웁니다.
-- daycares / menus / usage_events 같은 앱 테이블은 건드리지 않습니다.

-- 0) 혹시 지난 연습이 남아 있으면 정리
DROP TABLE IF EXISTS lab_scratch;

-- 1) menus 테이블과 같은 모양: (daycare_id, ym)이 복합 기본키
CREATE TABLE lab_scratch (
  daycare_id TEXT NOT NULL,
  ym TEXT NOT NULL,
  data TEXT NOT NULL,
  image_key TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (daycare_id, ym)
);

-- 2) 처음 저장: 새 행이 생긴다 (사진 키 있음)
INSERT INTO lab_scratch (daycare_id, ym, data, image_key, updated_at)
VALUES ('demo1234', '2026-10', '{"days":[{"date":"2026-10-13"}]}', 'daycares/demo1234/2026-10-13-aaaa1111.jpg', 1000)
ON CONFLICT (daycare_id, ym) DO UPDATE SET
  data = excluded.data,
  image_key = COALESCE(excluded.image_key, lab_scratch.image_key),
  updated_at = excluded.updated_at;

-- 3) 같은 달을 "사진 없이" 다시 저장(수정 화면에서 텍스트만 고친 경우)
--    -> data는 새 값으로 바뀌지만, image_key는 NULL로 지워지지 않고 이전 값이 유지된다 (COALESCE의 역할)
INSERT INTO lab_scratch (daycare_id, ym, data, image_key, updated_at)
VALUES ('demo1234', '2026-10', '{"days":[{"date":"2026-10-14"}]}', NULL, 2000)
ON CONFLICT (daycare_id, ym) DO UPDATE SET
  data = excluded.data,
  image_key = COALESCE(excluded.image_key, lab_scratch.image_key),
  updated_at = excluded.updated_at;

-- 결과 확인: 행은 1개, data는 10-14 내용으로 바뀌고, image_key는 그대로, updated_at은 2000
SELECT daycare_id, ym, data, image_key, updated_at FROM lab_scratch;

-- 4) JSON을 TEXT로 저장했어도 SQLite의 json_extract로 안쪽 값을 꺼낼 수 있다
SELECT json_extract(data, '$.days[0].date') AS first_date FROM lab_scratch;

-- 5) 다른 어린이집의 같은 달은 별개의 행이다 (복합 기본키)
INSERT INTO lab_scratch (daycare_id, ym, data, image_key, updated_at)
VALUES ('other999', '2026-10', '{"days":[]}', NULL, 3000);
SELECT daycare_id, ym FROM lab_scratch ORDER BY daycare_id;

-- 6) 실행 계획: 기본키 조건이면 인덱스로 찾는다 (detail에 SEARCH ... USING INDEX 가 보이면 성공, SCAN 이면 전체 훑기)
EXPLAIN QUERY PLAN
SELECT ym, data FROM lab_scratch WHERE daycare_id = 'demo1234' AND ym = '2026-10';

-- 7) 정리
DROP TABLE lab_scratch;
SELECT name FROM sqlite_master WHERE name = 'lab_scratch';
