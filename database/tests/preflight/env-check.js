function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function run() {
  const hasConnectionString = hasValue(process.env.COSMOS_CONNECTION_STRING);
  const hasEndpoint = hasValue(process.env.COSMOS_ENDPOINT);
  const hasKey = hasValue(process.env.COSMOS_KEY);

  const usingConnectionString = hasConnectionString;
  const usingEndpointKey = hasEndpoint && hasKey;

  console.log("Cosmos env preflight");
  console.log(`COSMOS_CONNECTION_STRING: ${hasConnectionString ? "set" : "missing"}`);
  console.log(`COSMOS_ENDPOINT: ${hasEndpoint ? "set" : "missing"}`);
  console.log(`COSMOS_KEY: ${hasKey ? "set" : "missing"}`);

  if (!usingConnectionString && !usingEndpointKey) {
    console.error("Preflight failed: set COSMOS_CONNECTION_STRING or both COSMOS_ENDPOINT and COSMOS_KEY.");
    process.exit(1);
  }

  console.log("Preflight passed: environment variables are configured.");
}

run();
