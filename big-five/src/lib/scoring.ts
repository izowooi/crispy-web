import {
  domains,
  facets,
  itemsById,
  questionnaireItems,
  type DomainId,
  type ItemKeying,
  type ResponseValue,
} from "@/data/questionnaire";

export type AnswerMap = Record<string, number | undefined>;

export type Band = "낮음" | "중간" | "높음";

export type FacetScore = {
  id: string;
  domainId: DomainId;
  name: string;
  englishName: string;
  description: string;
  score: number;
  answeredItems: number;
  totalItems: number;
  band: Band;
};

export type DomainScore = {
  id: DomainId;
  name: string;
  englishName: string;
  description: string;
  color: string;
  score: number;
  answeredItems: number;
  totalItems: number;
  band: Band;
  facets: FacetScore[];
};

export type ScoreResult = {
  domains: DomainScore[];
  facets: FacetScore[];
  totalItems: number;
  completedItems: number;
  missingItemIds: string[];
  isComplete: boolean;
};

const MIN_RESPONSE = 1;
const MAX_RESPONSE = 5;

export function isResponseValue(value: number | undefined): value is ResponseValue {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RESPONSE &&
    value <= MAX_RESPONSE
  );
}

export function scoreResponse(value: ResponseValue, keyed: ItemKeying): number {
  const normalized = keyed === "reverse" ? MAX_RESPONSE + MIN_RESPONSE - value : value;
  return ((normalized - MIN_RESPONSE) / (MAX_RESPONSE - MIN_RESPONSE)) * 100;
}

export function scoreAssessment(answers: AnswerMap): ScoreResult {
  const missingItemIds = questionnaireItems
    .filter((item) => !isResponseValue(answers[item.id]))
    .map((item) => item.id);

  const facetScores: FacetScore[] = facets.map((facet) => {
    const itemScores = facet.itemIds
      .map((itemId) => {
        const item = itemsById.get(itemId);
        const answer = answers[itemId];

        if (!item || !isResponseValue(answer)) {
          return null;
        }

        return scoreResponse(answer, item.keyed);
      })
      .filter((score): score is number => score !== null);

    const score = itemScores.length > 0 ? average(itemScores) : 0;

    return {
      id: facet.id,
      domainId: facet.domainId,
      name: facet.name,
      englishName: facet.englishName,
      description: facet.description,
      score: round(score),
      answeredItems: itemScores.length,
      totalItems: facet.itemIds.length,
      band: toBand(score),
    };
  });

  const domainScores: DomainScore[] = domains.map((domain) => {
    const domainFacets = facetScores.filter((facet) => facet.domainId === domain.id);
    const weightedScores = domainFacets.flatMap((facet) =>
      Array.from({ length: facet.answeredItems }, () => facet.score),
    );
    const answeredItems = domainFacets.reduce((sum, facet) => sum + facet.answeredItems, 0);
    const totalItems = domainFacets.reduce((sum, facet) => sum + facet.totalItems, 0);
    const score = weightedScores.length > 0 ? average(weightedScores) : 0;

    return {
      id: domain.id,
      name: domain.name,
      englishName: domain.englishName,
      description: domain.description,
      color: domain.color,
      score: round(score),
      answeredItems,
      totalItems,
      band: toBand(score),
      facets: domainFacets,
    };
  });

  return {
    domains: domainScores,
    facets: facetScores,
    totalItems: questionnaireItems.length,
    completedItems: questionnaireItems.length - missingItemIds.length,
    missingItemIds,
    isComplete: missingItemIds.length === 0,
  };
}

export function toBand(score: number): Band {
  if (score < 40) {
    return "낮음";
  }

  if (score >= 66) {
    return "높음";
  }

  return "중간";
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
