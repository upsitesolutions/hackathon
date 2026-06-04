import { CosmosClient, Container, SqlQuerySpec } from "@azure/cosmos";

const DEFAULT_DB_NAME = process.env.COSMOS_DB_NAME ?? "sous-db";
const RECIPES_CONTAINER_NAME = process.env.COSMOS_RECIPES_CONTAINER ?? "recipes";
const SESSIONS_CONTAINER_NAME = process.env.COSMOS_SESSIONS_CONTAINER ?? "sessions";
const VISITORS_CONTAINER_NAME = process.env.COSMOS_VISITORS_CONTAINER ?? "visitors";

const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 200;

type Verdict = "on_track" | "adjust" | "done";
type AdjustmentType = "ingredient" | "timing" | "technique";

export type Step = {
  stepId: string;
  instruction: string;
  expectedVisualState: string;
  commonFailures: string[];
  checkpointMinutes: number;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  contentHash: string;
  steps: Step[];
};

export type Turn = {
  stepId: string;
  promptedAt: string;
  verdict: Verdict;
  advice: string;
  actualDurationMinutes: number;
  imageBlobPath?: string;
};

export type Adjustment = {
  stepId: string;
  type: AdjustmentType;
  description: string;
};

export type PersonalizedRecipeStep = {
  stepId: string;
  instruction: string;
  note?: string;
};

export type PersonalizedRecipe = {
  title: string;
  personalizedSteps: PersonalizedRecipeStep[];
  notes: string;
};

// ----- Visitors -----

export type Visitor = {
  /** Cosmos document id (uuid) */
  id: string;
  /** Caller-supplied name, or "anon" */
  name: string;
  /** ISO-8601 timestamp of when this visit was recorded */
  visitedAt: string;
};

// ----- Sessions -----

export type Session = {
  id: string;
  sessionId: string;
  recipeId: string;
  startedAt: string;
  turns: Turn[];
  adjustments: Adjustment[];
  personalizedRecipe: PersonalizedRecipe | null;
};

let cachedClient: CosmosClient | undefined;

function getCosmosClient(): CosmosClient {
  if (cachedClient) {
    return cachedClient;
  }

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!connectionString && !(endpoint && key)) {
    throw new Error("Set COSMOS_CONNECTION_STRING or both COSMOS_ENDPOINT and COSMOS_KEY.");
  }

  cachedClient = connectionString
    ? new CosmosClient(connectionString)
    : new CosmosClient({ endpoint: endpoint as string, key: key as string });
  return cachedClient;
}

export async function initializeDatabaseIfNeeded(): Promise<void> {
  const client = getCosmosClient();

  await withRetry(async () => {
    console.log("Ensuring Cosmos DB database and containers exist...");
    await client.databases.createIfNotExists({ id: DEFAULT_DB_NAME });
    console.log(`Database "${DEFAULT_DB_NAME}" is ready.`);

    const database = client.database(DEFAULT_DB_NAME);
    await database.containers.createIfNotExists({
      id: RECIPES_CONTAINER_NAME,
      partitionKey: { paths: ["/id"] }
    });

    await database.containers.createIfNotExists({
      id: SESSIONS_CONTAINER_NAME,
      partitionKey: { paths: ["/sessionId"] }
    });

    await database.containers.createIfNotExists({
      id: VISITORS_CONTAINER_NAME,
      partitionKey: { paths: ["/id"] }
    });
  }, "initializeDatabaseIfNeeded");
}

function getContainer(containerName: string): Container {
  return getCosmosClient().database(DEFAULT_DB_NAME).container(containerName);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const statusCode = (error as { code?: number; statusCode?: number }).statusCode
    ?? (error as { code?: number; statusCode?: number }).code;

  return statusCode === 408 || statusCode === 429 || statusCode === 449 || statusCode === 500 || statusCode === 503;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  const retryAfterMs = (error as { retryAfterInMs?: number } | undefined)?.retryAfterInMs;
  if (typeof retryAfterMs === "number" && retryAfterMs > 0) {
    return retryAfterMs;
  }

  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Cosmos operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await withTimeout(operation());
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isRetriableError(error)) {
        throw new Error(`${operationName} failed: ${(error as Error).message}`);
      }

      const delayMs = getRetryDelayMs(error, attempt);
      await sleep(delayMs);
    }
  }
}

function toSessionIdPartitionKey(sessionId: string): string {
  return sessionId;
}

export async function getRecipes(): Promise<Recipe[]> {
  const container = getContainer(RECIPES_CONTAINER_NAME);
  return withRetry(async () => {
    const query: SqlQuerySpec = {
      query: "SELECT * FROM c"
    };

    const { resources } = await container.items.query<Recipe>(query).fetchAll();
    return resources;
  }, "getRecipes");
}

export async function getRecipe(id: string): Promise<Recipe> {
  const container = getContainer(RECIPES_CONTAINER_NAME);
  return withRetry(async () => {
    const { resource } = await container.item(id, id).read<Recipe>();
    if (!resource) {
      throw new Error(`Recipe not found for id=${id}`);
    }

    return resource;
  }, "getRecipe");
}

export async function getStep(recipeId: string, stepId: string): Promise<Step> {
  const recipe = await getRecipe(recipeId);
  const step = recipe.steps.find((candidate) => candidate.stepId === stepId);

  if (!step) {
    throw new Error(`Step not found for recipeId=${recipeId} stepId=${stepId}`);
  }

  return step;
}

export async function cacheRecipe(recipe: Recipe): Promise<void> {
  const container = getContainer(RECIPES_CONTAINER_NAME);
  await withRetry(async () => {
    await container.items.upsert<Recipe>(recipe);
  }, "cacheRecipe");
}

export async function getCachedRecipe(contentHash: string): Promise<Recipe | null> {
  const container = getContainer(RECIPES_CONTAINER_NAME);

  return withRetry(async () => {
    const query: SqlQuerySpec = {
      query: "SELECT TOP 1 * FROM c WHERE c.contentHash = @contentHash",
      parameters: [{ name: "@contentHash", value: contentHash }]
    };

    const { resources } = await container.items.query<Recipe>(query).fetchAll();
    return resources[0] ?? null;
  }, "getCachedRecipe");
}

export async function createSession(sessionId: string, recipeId: string): Promise<void> {
  const container = getContainer(SESSIONS_CONTAINER_NAME);
  const session: Session = {
    id: sessionId,
    sessionId,
    recipeId,
    startedAt: new Date().toISOString(),
    turns: [],
    adjustments: [],
    personalizedRecipe: null
  };

  await withRetry(async () => {
    await container.items.upsert<Session>(session);
  }, "createSession");
}

export async function appendTurn(sessionId: string, turn: Turn): Promise<void> {
  const container = getContainer(SESSIONS_CONTAINER_NAME);
  const pk = toSessionIdPartitionKey(sessionId);

  await withRetry(async () => {
    try {
      await container.item(sessionId, pk).patch([
        { op: "add", path: "/turns/-", value: turn }
      ]);
      return;
    } catch {
      const { resource } = await container.item(sessionId, pk).read<Session>();
      if (!resource) {
        throw new Error(`Session not found for sessionId=${sessionId}`);
      }

      resource.turns.push(turn);
      await container.item(sessionId, pk).replace<Session>(resource);
    }
  }, "appendTurn");
}

export async function appendAdjustment(sessionId: string, adj: Adjustment): Promise<void> {
  const container = getContainer(SESSIONS_CONTAINER_NAME);
  const pk = toSessionIdPartitionKey(sessionId);

  await withRetry(async () => {
    try {
      await container.item(sessionId, pk).patch([
        { op: "add", path: "/adjustments/-", value: adj }
      ]);
      return;
    } catch {
      const { resource } = await container.item(sessionId, pk).read<Session>();
      if (!resource) {
        throw new Error(`Session not found for sessionId=${sessionId}`);
      }

      resource.adjustments.push(adj);
      await container.item(sessionId, pk).replace<Session>(resource);
    }
  }, "appendAdjustment");
}

export async function savePersonalizedRecipe(sessionId: string, recipe: PersonalizedRecipe): Promise<void> {
  const container = getContainer(SESSIONS_CONTAINER_NAME);
  const pk = toSessionIdPartitionKey(sessionId);

  await withRetry(async () => {
    try {
      await container.item(sessionId, pk).patch([
        { op: "set", path: "/personalizedRecipe", value: recipe }
      ]);
      return;
    } catch {
      const { resource } = await container.item(sessionId, pk).read<Session>();
      if (!resource) {
        throw new Error(`Session not found for sessionId=${sessionId}`);
      }

      resource.personalizedRecipe = recipe;
      await container.item(sessionId, pk).replace<Session>(resource);
    }
  }, "savePersonalizedRecipe");
}

export async function getSession(sessionId: string): Promise<Session> {
  const container = getContainer(SESSIONS_CONTAINER_NAME);
  const pk = toSessionIdPartitionKey(sessionId);

  return withRetry(async () => {
    const { resource } = await container.item(sessionId, pk).read<Session>();
    if (!resource) {
      throw new Error(`Session not found for sessionId=${sessionId}`);
    }

    return resource;
  }, "getSession");
}

// ----- Visitor helpers -----

export async function addVisitor(name: string): Promise<Visitor> {
  const container = getContainer(VISITORS_CONTAINER_NAME);
  const visitor: Visitor = {
    id: crypto.randomUUID(),
    name,
    visitedAt: new Date().toISOString()
  };

  return withRetry(async () => {
    await container.items.create<Visitor>(visitor);
    return visitor;
  }, "addVisitor");
}

export async function getAllVisitors(): Promise<Visitor[]> {
  const container = getContainer(VISITORS_CONTAINER_NAME);

  return withRetry(async () => {
    const { resources } = await container.items
      .query<Visitor>({ query: "SELECT c.id, c.name, c.visitedAt FROM c ORDER BY c.visitedAt DESC" })
      .fetchAll();
    return resources;
  }, "getAllVisitors");
}
