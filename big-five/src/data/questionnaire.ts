import rawQuestionnaire from "./questionnaire.json";

export type DomainId = "O" | "C" | "E" | "A" | "N";
export type ItemKeying = "positive" | "reverse";
export type ResponseValue = 1 | 2 | 3 | 4 | 5;

export type ResponseScaleOption = {
  value: ResponseValue;
  label: string;
};

export type QuestionnaireItem = {
  id: string;
  domainId: DomainId;
  domainName: string;
  facetId: string;
  facetName: string;
  facetEnglishName: string;
  keyed: ItemKeying;
  text: string;
  order: number;
};

export type Facet = {
  id: string;
  domainId: DomainId;
  domainName: string;
  domainColor: string;
  name: string;
  englishName: string;
  description: string;
  itemIds: string[];
};

export type Domain = {
  id: DomainId;
  name: string;
  englishName: string;
  color: string;
  description: string;
  facetIds: string[];
};

type RawQuestionnaire = typeof rawQuestionnaire;

export const questionnaire = rawQuestionnaire as RawQuestionnaire;
export const responseScale = questionnaire.responseScale as ResponseScaleOption[];

export const domains: Domain[] = questionnaire.domains.map((domain) => ({
  id: domain.id as DomainId,
  name: domain.name,
  englishName: domain.englishName,
  color: domain.color,
  description: domain.description,
  facetIds: domain.facets.map((facet) => facet.id),
}));

export const facets: Facet[] = questionnaire.domains.flatMap((domain) =>
  domain.facets.map((facet) => ({
    id: facet.id,
    domainId: domain.id as DomainId,
    domainName: domain.name,
    domainColor: domain.color,
    name: facet.name,
    englishName: facet.englishName,
    description: facet.description,
    itemIds: facet.items.map((item) => item.id),
  })),
);

export const questionnaireItems: QuestionnaireItem[] = questionnaire.domains.flatMap((domain) =>
  domain.facets.flatMap((facet) =>
    facet.items.map((item, index) => ({
      id: item.id,
      domainId: domain.id as DomainId,
      domainName: domain.name,
      facetId: facet.id,
      facetName: facet.name,
      facetEnglishName: facet.englishName,
      keyed: item.keyed as ItemKeying,
      text: item.text,
      order: index + 1,
    })),
  ),
);

export const itemsById = new Map(questionnaireItems.map((item) => [item.id, item]));
export const facetsById = new Map(facets.map((facet) => [facet.id, facet]));
export const domainsById = new Map(domains.map((domain) => [domain.id, domain]));

export const questionnaireStats = {
  domainCount: domains.length,
  facetCount: facets.length,
  itemCount: questionnaireItems.length,
  estimatedMinutes: questionnaire.estimatedMinutes,
  itemsPerFacet: questionnaireItems.length / facets.length,
};
