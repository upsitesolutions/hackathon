import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { initializeDatabaseIfNeeded, listSavedSessions } from "../lib/db";

export async function listSavedSessionsFn(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    await initializeDatabaseIfNeeded();
    const sessions = await listSavedSessions();

    const summaries = sessions.map((s) => ({
      sessionId: s.sessionId,
      recipeId: s.recipeId,
      title: s.title,
      prompt: s.prompt,
      savedAt: s.savedAt,
      stepCount: s.recipe.steps.length,
      turnCount: s.turns.length
    }));

    return { status: 200, jsonBody: { sessions: summaries } };
  } catch (err) {
    context.error("listSavedSessions error", err);
    return { status: 500, jsonBody: { error: (err as Error).message } };
  }
}

app.http("listSavedSessions", {
  route: "saved-sessions",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: listSavedSessionsFn
});
