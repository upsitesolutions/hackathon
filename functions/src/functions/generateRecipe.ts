import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { randomUUID, createHash } from "crypto";
import { initializeDatabaseIfNeeded, cacheRecipe, createSession, type Recipe } from "../lib/db";
import { generateRecipe } from "../lib/gemini";

export async function generateRecipeFn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json().catch(() => null)) as { sourceText?: unknown } | null;
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : "";

    if (!sourceText) {
      return { status: 400, jsonBody: { error: "sourceText is required" } };
    }

    await initializeDatabaseIfNeeded();

    context.log(`generateRecipe: prompt="${sourceText.slice(0, 80)}"`);
    const generated = await generateRecipe(sourceText);

    const recipeId = `recipe-${randomUUID()}`;
    const contentHash = createHash("sha256").update(sourceText).digest("hex");
    const recipe: Recipe = {
      id: recipeId,
      title: generated.title,
      description: generated.description,
      contentHash,
      steps: generated.steps
    };

    await cacheRecipe(recipe);

    const sessionId = `session-${randomUUID()}`;
    await createSession(sessionId, recipeId, {
      prompt: sourceText,
      title: generated.title,
      recipe
    });

    return {
      status: 200,
      jsonBody: {
        sessionId,
        recipeId,
        recipe
      }
    };
  } catch (err) {
    context.error("generateRecipe error", err);
    return { status: 500, jsonBody: { error: (err as Error).message } };
  }
}

app.http("generateRecipe", {
  route: "recipes/enrich",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: generateRecipeFn
});
