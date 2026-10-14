-- 실습 5. 쓰기 연습 (로컬 전용! --remote로 실행하면 lab 도구가 막아 줍니다)
-- npm run lab:d1 -- --file learn/d1/queries/05-practice-writes.sql

-- RETURNING: 삽입된 행을 바로 돌려받기. 앱은 이 결과 유무로 "최초 발견"을 판단한다.
INSERT OR IGNORE INTO im_elements (name, emoji, desc, created_at) VALUES ('실습원소', '🧪', '연습용', 1) RETURNING name;
-- 같은 문장을 한 번 더: 이미 있으므로 무시되고 RETURNING도 빈 결과
INSERT OR IGNORE INTO im_elements (name, emoji, desc, created_at) VALUES ('실습원소', '🧪', '연습용', 1) RETURNING name;

-- trigger 확인: 카운터가 1 늘었나? (meta.changes가 2로 찍힌 이유도 trigger 때문)
SELECT value FROM im_counters WHERE key = 'elements';

-- 운영 실습: 부적절한 결과를 고치는 법 (레시피 결과 교체)
INSERT OR IGNORE INTO im_recipes (pair_key, a, b, result_name, created_at) VALUES ('실습+실습', '실습', '실습', '실습원소', 1);
UPDATE im_recipes SET result_name = '물' WHERE pair_key = '실습+실습' RETURNING pair_key, result_name;

-- 외래 키: 레시피가 가리키는 원소는 지울 수 없다 → 먼저 레시피를 지운다
DELETE FROM im_recipes WHERE pair_key = '실습+실습';
DELETE FROM im_elements WHERE name = '실습원소';
SELECT value FROM im_counters WHERE key = 'elements';
