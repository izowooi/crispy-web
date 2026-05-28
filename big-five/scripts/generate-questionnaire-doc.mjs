import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const questionnaire = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src", "data", "questionnaire.json"), "utf8"),
);

const keyLabel = {
  positive: "정방향",
  reverse: "역방향",
};

const lines = [
  "# Big Five 심리 성향 검사 문항집",
  "",
  `- 버전: \`${questionnaire.version}\``,
  `- 언어: ${questionnaire.language}`,
  `- 예상 소요 시간: 약 ${questionnaire.estimatedMinutes}분`,
  `- 총 문항: ${countItems(questionnaire)}문항`,
  `- 구성: ${questionnaire.domains.length}개 요인 x 요인별 6개 세부척도 x 세부척도별 6문항`,
  "",
  "## 응답 척도",
  "",
  "| 값 | 라벨 |",
  "| --- | --- |",
  ...questionnaire.responseScale.map((option) => `| ${option.value} | ${escapeTable(option.label)} |`),
  "",
  "## 채점 규칙",
  "",
  "- 정방향 문항은 응답값을 그대로 사용합니다.",
  "- 역방향 문항은 `6 - 응답값`으로 변환합니다.",
  "- 문항 점수는 `((변환값 - 1) / 4) * 100`으로 0-100 점수화합니다.",
  "- 세부척도 점수는 해당 세부척도 6문항 평균입니다.",
  "- 요인 점수는 해당 요인 36문항 평균입니다. 문항 수가 동일하므로 세부척도 평균의 평균과 같습니다.",
  "- 밴드 기준은 낮음 `< 40`, 중간 `40 이상 66 미만`, 높음 `66 이상`입니다.",
  "",
  "## 재구현용 데이터 구조",
  "",
  "웹앱에서는 `src/data/questionnaire.json`을 단일 원천 데이터로 사용합니다. 각 문항에는 다음 필드가 필요합니다.",
  "",
  "| 필드 | 설명 |",
  "| --- | --- |",
  "| `id` | 문항 고유 ID. 예: `O1-01` |",
  "| `keyed` | `positive` 또는 `reverse` |",
  "| `text` | 사용자에게 표시할 한국어 문항 |",
  "| 상위 `domain.id` | `O`, `C`, `E`, `A`, `N` 중 하나 |",
  "| 상위 `facet.id` | 세부척도 ID. 예: `O1` |",
  "",
  "## 문항 전체 목록",
  "",
];

for (const domain of questionnaire.domains) {
  lines.push(`## ${domain.id}. ${domain.name} (${domain.englishName})`, "", domain.description, "");

  for (const facet of domain.facets) {
    lines.push(`### ${facet.id}. ${facet.name} (${facet.englishName})`, "", facet.description, "");
    lines.push("| ID | 방향 | 문항 |", "| --- | --- | --- |");

    for (const item of facet.items) {
      lines.push(`| ${item.id} | ${keyLabel[item.keyed]} | ${escapeTable(item.text)} |`);
    }

    lines.push("");
  }
}

lines.push(
  "## 출처와 작성 원칙",
  "",
  "- IPIP 공식 사이트는 문항과 척도가 퍼블릭 도메인이라고 명시합니다: https://ipip.ori.org/",
  "- IPIP 안내 문서는 Big Five/FFM과 IPIP-NEO 300문항 및 120문항 계열을 설명합니다: https://ipip.ori.org/Finding_Scales_to_Measure_Particular_Constructs.htm",
  "- NIH CDE 페이지는 IPIP NEO를 120문항 자기보고 Big Five 도구로 소개하고 저작권 항목을 `No`로 표기합니다: https://www.nih.gov/node/21486",
  "- 이 문항집의 한국어 문항은 위 구조와 세부척도 개념을 참고해 새로 작성한 원문이며, IPIP 영문 원문을 복사하거나 번역한 목록이 아닙니다.",
  "",
);

fs.writeFileSync(path.join(rootDir, "docs", "QUESTIONNAIRE.md"), `${lines.join("\n")}\n`);

function countItems(data) {
  return data.domains.reduce(
    (domainSum, domain) => domainSum + domain.facets.reduce((facetSum, facet) => facetSum + facet.items.length, 0),
    0,
  );
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|");
}
