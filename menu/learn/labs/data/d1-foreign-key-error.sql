-- "일부러 실패하는" 연습장 (로컬 DB 전용)
-- 실행: npx wrangler d1 execute baby-menu --local --file learn/labs/data/d1-foreign-key-error.sql
-- 기대 결과: FOREIGN KEY constraint failed 에러.
-- 그리고 --file 은 한 덩어리로 실행되어, 에러가 나면 앞의 CREATE TABLE 까지 전부 되돌려집니다.
-- (확인: npx wrangler d1 execute baby-menu --local --command "SELECT name FROM sqlite_master WHERE name LIKE 'lab_%'" 결과가 비어 있음)

CREATE TABLE lab_parent (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE lab_child (
  parent_id TEXT NOT NULL REFERENCES lab_parent(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,
  PRIMARY KEY (parent_id, ym)
);

-- 부모('ghost')가 없는데 자식을 넣으려 한다 -> 막힌다
INSERT INTO lab_child VALUES ('ghost', '2026-10');
