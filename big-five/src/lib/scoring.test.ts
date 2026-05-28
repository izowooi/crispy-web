import { describe, expect, it } from "vitest";
import { domains, facets, questionnaireItems } from "@/data/questionnaire";
import { scoreAssessment } from "@/lib/scoring";

describe("Big Five questionnaire data", () => {
  it("contains a 30-minute ready 180 item bank across 5 domains and 30 facets", () => {
    expect(domains).toHaveLength(5);
    expect(facets).toHaveLength(30);
    expect(questionnaireItems).toHaveLength(180);
  });

  it("keeps every facet balanced with 6 items and 3 reverse-keyed items", () => {
    for (const facet of facets) {
      const facetItems = questionnaireItems.filter((item) => item.facetId === facet.id);
      expect(facetItems).toHaveLength(6);
      expect(facetItems.filter((item) => item.keyed === "reverse")).toHaveLength(3);
    }
  });
});

describe("scoreAssessment", () => {
  it("scores direct and reverse keyed answers on a 0-100 scale", () => {
    const answers = Object.fromEntries(
      questionnaireItems.map((item) => [item.id, item.keyed === "positive" ? 5 : 1]),
    );

    const result = scoreAssessment(answers);

    for (const domain of result.domains) {
      expect(domain.score).toBe(100);
    }

    for (const facet of result.facets) {
      expect(facet.score).toBe(100);
    }
  });

  it("reports completion metadata and missing answers", () => {
    const partialAnswers = Object.fromEntries(
      questionnaireItems.slice(0, 20).map((item) => [item.id, 3]),
    );

    const result = scoreAssessment(partialAnswers);

    expect(result.completedItems).toBe(20);
    expect(result.totalItems).toBe(180);
    expect(result.isComplete).toBe(false);
    expect(result.missingItemIds).toHaveLength(160);
  });
});
