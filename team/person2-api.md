# Person 2 — API / Orchestration

## Your job in one sentence
Build the Azure Functions backend that wires the mobile app, the vision model, and the database together.

## You own
```
server/src/functions/    ← HTTP trigger functions
server/src/lib/          ← openai-client.js, db.js (from Person 4)
server/host.json
server/package.json
server/.env.example
```

You never touch `app/` or `database/`.

## You do NOT need to know
- How the Expo app is built
- How the vision prompt is engineered (Person 3 hands you a module)
- How Cosmos DB is provisioned (Person 4 hands you a db.js module and credentials)

You are the integrator. Everyone else hands you a module; you wire them together.

---

## What you receive from teammates

| From | What | When |
|------|------|-------|
| Person 3 | `server/src/lib/prompts/assess.js` — exports `buildAssessPrompt(step)` | Mid-session |
| Person 3 | `server/src/lib/prompts/rescue.js` — exports `buildRescuePrompt({step, problem})` | Mid-session |
| Person 3 | `server/src/lib/prompts/verdict-schema.js` — exports `validateVerdict(raw)` | Mid-session |
| Person 4 | `server/src/lib/db.js` — exports `getRecipes`, `getRecipe`, `getStep`, `upsertSession` | Mid-session |
| Person 4 | Cosmos DB credentials for `.env` | Day 1 |

Until those modules arrive, stub them with hardcoded returns so your functions still run.

---

## API contract (align on this at the start)

```
POST /api/assess
Body:    { "recipeId": "...", "stepId": "...", "imageBase64": "..." }
Returns: { "verdict": "on_track" | "adjust" | "done", "advice": "...", "confidence": 0.0–1.0 }

POST /api/rescue
Body:    { "recipeId": "...", "stepId": "...", "problem": "..." }
Returns: { "advice": "..." }

GET  /api/recipes        → [{ "id", "title", "description" }]
GET  /api/recipes/{id}  → { "id", "title", "steps": [...] }
```

---

## Your tasks

### A1 — Project scaffold + OpenAI client (1h)
**Files:** `server/src/lib/openai-client.js`, `server/.env.example`, `server/package.json`

Set up the Azure Functions v4 project under `server/src/`. Install `@azure/functions` and `openai`. Create `openai-client.js` — initialize with `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` from env. Verify `func start` boots cleanly.

✅ Done when: `func start` runs without errors; a direct OpenAI ping succeeds.

---

### A2 — /assess HTTP trigger (2h)
**File:** `server/src/functions/assess.js`

```js
app.http('assess', { methods: ['POST'], authLevel: 'anonymous', handler })
```

Handler:
1. Parse body — 400 if `recipeId`, `stepId`, or `imageBase64` missing.
2. `db.getStep(recipeId, stepId)` → step.
3. `buildAssessPrompt(step)` → prompt.
4. GPT-4o vision call with image + prompt.
5. `validateVerdict(raw)` → verdict.
6. `db.upsertSession(turn)`.
7. Return verdict JSON.

Stub db and prompt modules until Person 3 and 4 hand them over.

✅ Done when: `curl -X POST http://localhost:7071/api/assess` returns valid verdict JSON.

---

### A3 — /rescue HTTP trigger (1.5h)
**File:** `server/src/functions/rescue.js`

Accept `{ recipeId, stepId, problem }` — 400 if missing. Load step, call `buildRescuePrompt`, call GPT-4o (text only), return `{ advice: string }`.

✅ Done when: rescue call returns a specific, useful recovery path.

---

### A4 — /recipes HTTP triggers (1h)
**File:** `server/src/functions/recipes.js`

- `GET /api/recipes` → `db.getRecipes()`
- `GET /api/recipes/{id}` → `db.getRecipe(id)`

Read-only, no auth. Stub db until Person 4 delivers.

✅ Done when: both endpoints return data. Person 1 can drop their mock.

---

### A5 — Validation + error shape (1h)
**Files:** all function handlers

Every handler: try/catch, return `{ status: 400, jsonBody: { error: '...' } }` on bad input, `{ status: 500, jsonBody: { error: 'internal error' } }` on unexpected throws. No HTML. The mobile client can only parse JSON.

✅ Done when: malformed requests return clean JSON errors.

---

### A6 — CORS + deploy config (1h)
**File:** `server/host.json`

Add CORS so the Expo web preview can call the Functions host. Verify `func azure functionapp publish` deploys cleanly with env vars set as Application Settings. Document the deploy command.

✅ Done when: app reaches the deployed Azure endpoints without CORS errors.

---

## Kickoff prompt (paste this to your AI assistant to get started)

> I'm building the Azure Functions v4 (Node.js) backend for a hackathon app called Sous. The backend lives in `server/`. My job is to write HTTP trigger functions for /assess (vision check), /rescue (cooking recovery advice), and /recipes (recipe data).
>
> The tech: Azure Functions v4 Node.js programming model (`@azure/functions`), Azure OpenAI GPT-4o vision, Azure Cosmos DB. I'll receive a prompt module from a teammate and a db module from another teammate — for now I'll stub them.
>
> Start with Task A1: set up the project scaffold under `server/src/`, install dependencies, create `server/src/lib/openai-client.js`, and verify `func start` boots without errors.
