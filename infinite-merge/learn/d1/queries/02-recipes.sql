-- 실습 2. 공유 레시피 책 읽기

-- 최근 발견된 레시피 10개 (created_at은 Unix ms → datetime으로 변환, 한국 시간 +9h)
SELECT a || ' + ' || b AS recipe, result_name, model,
       datetime(created_at / 1000, 'unixepoch', '+9 hours') AS created_kst
  FROM im_recipes ORDER BY created_at DESC LIMIT 10;

-- 여러 조합에서 나오는 "인기 결과물"
SELECT result_name, COUNT(*) AS ways FROM im_recipes GROUP BY result_name HAVING ways > 1 ORDER BY ways DESC;

-- 원소별 최초 발견자 (게스트 ID는 앞 14자만)
SELECT e.emoji || ' ' || e.name AS element, substr(e.first_by_sub, 1, 14) AS first_by
  FROM im_elements e WHERE e.created_at > 0 ORDER BY e.created_at LIMIT 20;
