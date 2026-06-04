import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getSession, appendTurn, type Turn } from "../lib/db";
import { assessImage } from "../lib/gemini";

export async function assessFn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json().catch(() => null)) as {
      sessionId?: unknown;
      recipeId?: unknown;
      stepId?: unknown;
      imageBase64?: unknown;
      mimeType?: unknown;
    } | null;

    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const stepId = typeof body?.stepId === "string" ? body.stepId : "";
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!sessionId || !stepId || !imageBase64) {
      return {
        status: 400,
        jsonBody: { error: "sessionId, stepId, and imageBase64 are required." }
      };
    }

    const session = await getSession(sessionId);
    const stepIndex = session.recipe.steps.findIndex((s) => s.stepId === stepId);
    if (stepIndex < 0) {
      return { status: 404, jsonBody: { error: `Step ${stepId} not found in session.` } };
    }
    const step = session.recipe.steps[stepIndex];

    context.log(`assess: session=${sessionId} step=${stepId} bytes=${imageBase64.length}`);

    const verdict = await assessImage({
      recipeTitle: session.recipe.title,
      step,
      stepNumber: stepIndex + 1,
      totalSteps: session.recipe.steps.length,
      imageBase64,
      mimeType
    });

    const turn: Turn = {
      stepId,
      promptedAt: new Date().toISOString(),
      verdict: verdict.verdict,
      advice: verdict.advice,
      actualDurationMinutes: 0,
      imageBlobPath: `inline:${mimeType};base64:${imageBase64.length}b`,
      imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
      imageMimeType: mimeType
    };

    try {
      await appendTurn(sessionId, turn);
    } catch (e) {
      context.warn("appendTurn failed (continuing): " + (e as Error).message);
    }

    return { status: 200, jsonBody: verdict };
  } catch (err) {
    context.error("assess error", err);
    return { status: 500, jsonBody: { error: (err as Error).message } };
  }
}

app.http("assess", {
  route: "assess",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: assessFn
});
