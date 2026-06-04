import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getSession } from "../lib/db";

export async function getSessionFn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const sessionId = request.params.sessionId;
  if (!sessionId) {
    return { status: 400, jsonBody: { error: "sessionId is required" } };
  }

  try {
    const session = await getSession(sessionId);
    return { status: 200, jsonBody: session };
  } catch (err) {
    context.error("getSession error", err);
    return { status: 404, jsonBody: { error: (err as Error).message } };
  }
}

app.http("getSession", {
  route: "sessions/{sessionId}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getSessionFn
});
