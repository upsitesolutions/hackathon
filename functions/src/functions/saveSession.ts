import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { markSessionSaved, getSession } from "../lib/db";

export async function saveSessionFn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const sessionId = request.params.sessionId;
  if (!sessionId) {
    return { status: 400, jsonBody: { error: "sessionId is required" } };
  }

  try {
    await markSessionSaved(sessionId);
    const session = await getSession(sessionId);
    return { status: 200, jsonBody: { ok: true, session } };
  } catch (err) {
    context.error("saveSession error", err);
    return { status: 500, jsonBody: { error: (err as Error).message } };
  }
}

app.http("saveSession", {
  route: "sessions/{sessionId}/save",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: saveSessionFn
});
