import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function dummy(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const name = request.query.get("name") ?? "world";

  context.log(`dummy function invoked for name=${name}`);

  return {
    status: 200,
    jsonBody: {
      ok: true,
      message: `Dummy function is running. Hello, ${name}!`,
      timestamp: new Date().toISOString()
    }
  };
}

app.http("dummy", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: dummy
});