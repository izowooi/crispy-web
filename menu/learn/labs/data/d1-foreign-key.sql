-- 외래키 CASCADE 연습장 (로컬 DB 전용)
-- 실행: npx wrangler d1 execute baby-menu --local --file learn/labs/data/d1-foreign-key.sql
-- lab_parent / lab_child 연습 테이블만 만들고 마지막에 지웁니다.
-- 앱의 daycares -> menus 관계(ON DELETE CASCADE)와 같은 모양입니다.

DROP TABLE IF EXISTS lab_child;
DROP TABLE IF EXISTS lab_parent;

CREATE TABLE lab_parent (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE lab_child (
  parent_id TEXT NOT NULL REFERENCES lab_parent(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,
  PRIMARY KEY (parent_id, ym)
);

INSERT INTO lab_parent VALUES ('p1', '연습 어린이집');
INSERT INTO lab_child VALUES ('p1', '2026-10');
INSERT INTO lab_child VALUES ('p1', '2026-11');
SELECT COUNT(*) AS child_rows_before FROM lab_child;  -- 2

-- 어린이집을 지우면 그 어린이집의 식단 행도 같이 사라진다 (CASCADE)
DELETE FROM lab_parent WHERE id = 'p1';
SELECT COUNT(*) AS child_rows_after FROM lab_child;   -- 0

DROP TABLE lab_child;
DROP TABLE lab_parent;
