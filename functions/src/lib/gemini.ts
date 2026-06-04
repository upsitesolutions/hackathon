import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildAssessPrompt, buildRecipePrompt, RECIPE_SYSTEM, ASSESS_SYSTEM } from "./prompts";
import type { Recipe, Step } from "./db";

let cachedClient: GoogleGenerativeAI | undefined;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const key = "AQ.Ab8RN6KS59AQ-mQUMWv1qnIUKiJklAWqmUcbC3X-eRZk1sJmDg";
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

function getModelName(): string {
  return "gemini-3.5-flash";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(trimmed);
}

export type GeneratedRecipe = Omit<Recipe, "id" | "contentHash">;

export async function generateRecipe(sourceText: string): Promise<GeneratedRecipe> {
  const model = getClient().getGenerativeModel({
    model: getModelName(),
    systemInstruction: RECIPE_SYSTEM,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
  });

  const result = await model.generateContent(buildRecipePrompt(sourceText));
  const raw = result.response.text();
  const parsed = extractJson(raw) as { title?: string; description?: string; steps?: unknown[] };

  if (!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Gemini returned an invalid recipe.");
  }

  const steps: Step[] = parsed.steps.map((s, i) => {
    const step = s as Partial<Step>;
    return {
      stepId: step.stepId || `step-${i + 1}`,
      instruction: String(step.instruction ?? "").trim(),
      expectedVisualState: String(step.expectedVisualState ?? "").trim(),
      commonFailures: Array.isArray(step.commonFailures)
        ? step.commonFailures.map((f) => String(f)).filter(Boolean).slice(0, 5)
        : [],
      checkpointMinutes:
        typeof step.checkpointMinutes === "number" && step.checkpointMinutes > 0
          ? step.checkpointMinutes
          : 2
    };
  }).filter((s) => s.instruction.length > 0);

  if (steps.length === 0) throw new Error("Gemini recipe had no usable steps.");

  return {
    title: parsed.title.trim(),
    description: (parsed.description ?? "").toString().trim(),
    steps
  };
}

export type AssessVerdict = "on_track" | "adjust" | "done";

export interface AssessResult {
  verdict: AssessVerdict;
  advice: string;
  confidence: number;
}

export async function assessImage(args: {
  recipeTitle: string;
  step: Step;
  stepNumber: number;
  totalSteps: number;
  imageBase64: string;
  mimeType?: string;
}): Promise<AssessResult> {
  const model = getClient().getGenerativeModel({
    model: getModelName(),
    systemInstruction: ASSESS_SYSTEM,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
  });

  const prompt = buildAssessPrompt({
    recipeTitle: args.recipeTitle,
    step: args.step,
    stepNumber: args.stepNumber,
    totalSteps: args.totalSteps
  });

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: args.mimeType ?? "image/jpeg",
        data: args.imageBase64
      }
    }
  ]);

  const raw = result.response.text();
  const parsed = extractJson(raw) as Partial<AssessResult>;

  const verdict: AssessVerdict =
    parsed.verdict === "on_track" || parsed.verdict === "adjust" || parsed.verdict === "done"
      ? parsed.verdict
      : "adjust";

  const advice = (parsed.advice ?? "").toString().trim() || "Couldn't read the photo clearly — try a brighter angle.";

  let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  return { verdict, advice, confidence };
}
