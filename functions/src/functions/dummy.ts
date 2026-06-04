import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { initializeDatabaseIfNeeded, addVisitor, getAllVisitors } from "../lib/db";

export async function dummy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const name = (request.query.get("name") ?? "").trim() || "anon";

  context.log(`dummy invoked — recording visitor name="${name}"`);

  try {
    await initializeDatabaseIfNeeded();

    const visitor = await addVisitor(name);
    context.log(`visitor recorded id=${visitor.id}`);

    const all = await getAllVisitors();

    return {
      status: 200,
      jsonBody: {
        ok: true,
        message: `Welcome, ${name}! You have been added to the visitors list.`,
        justAdded: visitor,
        visitors: all
      }
    };
  } catch (err) {
    context.error("dummy function error", err);
    return {
      status: 500,
      jsonBody: { ok: false, error: (err as Error).message }
    };
  }
}

app.http("dummy", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: dummy
});
