export interface AppData {
  id: string;
  name: string;
  tagline: string;
  descriptionShort?: string;
  image: string;
  tags?: string[];
  links: {
    appStoreUrl?: string;
    googlePlayUrl?: string;
    webUrl?: string;
  };
}

export interface ValueData {
  title: string;
  description: string;
  icon: string;
}

export interface LegalSection {
  heading: string;
  content: string;
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export type Lang = "en" | "ko";
export type LegalType = "terms" | "privacy";
