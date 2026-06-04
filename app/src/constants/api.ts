export const API_BASE_URL = 'http://localhost:7071';

export const API_PATHS = {
  enrichRecipe: '/api/recipes/enrich',
  assessRecipe: '/api/assess',
  rescueRecipe: '/api/rescue',
  sessionRecipe: (sessionId: string) => `/api/sessions/${sessionId}/recipe`,
} as const;

export interface EnrichedRecipeStep {
  stepId: string;
  instruction: string;
  expectedVisualState: string;
  commonFailures: string[];
  checkpointMinutes: number;
}

export interface EnrichedRecipe {
  id: string;
  title: string;
  steps: EnrichedRecipeStep[];
}

export interface EnrichRecipeFromTextRequest {
  sourceText: string;
  sourceUrl?: never;
}

export interface EnrichRecipeFromUrlRequest {
  sourceText?: never;
  sourceUrl: string;
}

export type EnrichRecipeRequest = EnrichRecipeFromTextRequest | EnrichRecipeFromUrlRequest;

export type EnrichRecipeResponse = EnrichedRecipe;

export type AssessVerdict = 'on_track' | 'adjust' | 'done';

export interface AssessRequest {
  recipeId: string;
  stepId: string;
  imageBase64: string;
}

export interface AssessResponse {
  verdict: AssessVerdict;
  advice: string;
  confidence: number;
}

export interface RescueRequest {
  recipeId: string;
  stepId: string;
  problem: string;
}

export interface RescueResponse {
  advice: string;
}

export type PersonalizedRecipeStep = string;

export interface PersonalizedRecipe {
  title: string;
  personalizedSteps: PersonalizedRecipeStep[];
  notes: string;
}

export interface SessionRecipeResponse {
  personalizedRecipe: PersonalizedRecipe;
}
