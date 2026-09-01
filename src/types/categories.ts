export type CategoryValidationStatus =
  | "valid"
  | "invalid"
  | "unknown";

export type CategoryValidationSource =
  | "local"
  | "wikidata"
  | "geodata"
  | "fallback";

export type CategoryValidationResult = {
  status: CategoryValidationStatus;
  source: CategoryValidationSource;
  normalizedAnswer: string;
  reason: string;
};

export type CategoryValidationRequest = {
  category: string;
  letter: string;
  answer: string;
  language: "en" | "de";
};