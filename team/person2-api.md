# Person 2 — API / Orchestration

## Your job in one sentence
Build the Azure Functions backend that wires the mobile app, the vision model, and the database together.

## You own
```
functions/src/functions/          ← all HTTP trigger functions (yours alone)
functions/src/lib/openai-client.ts  ← Azure OpenAI client (yours alone)
functions/host.json
functions/package.json            ← you manage this, see dependency note below
functions/local.settings.json            ← you create it; Person 4 adds Cosmos vars
docs/api-contract.md           ← you write this on day 1
```

`functions/src/lib/prompts/` belongs to Person 3. `functions/src/lib/db.ts` belongs to Person 4. You `require()` both but never edit them.

You never touch `app/` or `database/`.

## ⚠️ Dependency coordination (do this at the start)

You own `functions/package.json`. Before anyone writes code, collect the full dependency list from all three server-side people and install everything in one shot:

```bash
# Person 2 needs:
npm install @azure/functions openai

# Person 3 needs: (none beyond openai — already installed)

# Person 4 needs:
npm install @azure/cosmos

# Install all at once so package.json is only touched once:
npm install @azure/functions openai @azure/cosmos
```

Commit `package.json` and `package-lock.json` immediately. Nobody else touches these files.

## ⚠️ .env.example coordination

You create `functions/local.settings.json` in task A1. Leave a placeholder line for Cosmos DB vars:
```
"COSMOS_CONNECTION_STRING": ""
```
Person 4 fills in the actual value in their local `.env` — they do not edit `.env.example`.

## You do NOT need to know
- How the Expo app is built
- How the vision prompt is engineered (Person 3 hands you a module)
- How Cosmos DB is provisioned (Person 4 hands you a db.js module and credentials)

You are the integrator. Everyone else hands you a module; you wire them together.

---

## What you receive from teammates

| From | What | When |
|------|------|-------|
| Person 3 | `functions/src/lib/prompts/assess.ts` — exports `buildAssessPrompt(step)` | Mid-session |
| Person 3 | `functions/src/lib/prompts/rescue.ts` — exports `buildRescuePrompt({step, problem})` | Mid-session |
| Person 3 | `functions/src/lib/prompts/verdict-schema.ts` — exports `validateVerdict(raw)` | Mid-session |
| Person 4 | `functions/src/lib/db.ts` — exports `getRecipes`, `getRecipe`, `getStep`, `upsertSession` | Mid-session |
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
**Files:** `functions/src/lib/openai-client.ts`, `functions/local.settings.json`, `functions/package.json`

Set up the Azure Functions v4 project under `functions/src/`. Install `@azure/functions` and `openai`. Create `openai-client.ts` — initialize with `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` from env. Verify `func start` boots cleanly.

✅ Done when: `func start` runs without errors; a direct OpenAI ping succeeds.

---

### A2 — /assess HTTP trigger (2h)
**File:** `functions/src/functions/assess.ts`

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
**File:** `functions/src/functions/rescue.ts`

Accept `{ recipeId, stepId, problem }` — 400 if missing. Load step, call `buildRescuePrompt`, call GPT-4o (text only), return `{ advice: string }`.

✅ Done when: rescue call returns a specific, useful recovery path.

---

### A4 — /recipes/enrich HTTP trigger (2h)
**File:** `functions/src/functions/enrich.ts`

**This is the first thing Person 1 calls — it's what makes any recipe work.**

Accept `{ sourceText?, sourceUrl? }` — 400 if both missing. If `sourceUrl` provided, fetch page text and strip HTML before passing to the prompt.

Steps:
1. Hash the input text — check Cosmos DB for a cached enriched recipe with that hash. Return cached if found.
2. Call `buildEnrichPrompt(rawText)` from Person 3 (task P0).
3. Parse the returned structured recipe.
4. Save to Cosmos DB with the content hash.
5. Return enriched recipe: `{ id, title, steps[] }` with `expectedVisualState`, `commonFailures[]`, `checkpointMinutes` per step.

Stub `buildEnrichPrompt` with a hardcoded recipe until Person 3 delivers.

✅ Done when: POST raw recipe text → response contains structured steps with visual states and timings.

---

### A4b — GET /sessions/:id/recipe (0.5h)
**File:** `functions/src/functions/sessions.ts`

`GET /api/sessions/{id}/recipe` → fetch session from Cosmos DB → return `session.personalizedRecipe`. Return 404 with `{ error: "recipe not yet generated" }` if null.

✅ Done when: returns the personalized recipe after a session completes.

---

### A5 — Validation + error shape (1h)
**Files:** all function handlers

Every handler: try/catch, return `{ status: 400, jsonBody: { error: '...' } }` on bad input, `{ status: 500, jsonBody: { error: 'internal error' } }` on unexpected throws. No HTML. The mobile client can only parse JSON.

✅ Done when: malformed requests return clean JSON errors.

---

### A6 — CORS + deploy config (1h)
**File:** `functions/host.json`

Add CORS so the Expo web preview can call the Functions host. Verify `func azure functionapp publish` deploys cleanly with env vars set as Application Settings. Document the deploy command.

✅ Done when: app reaches the deployed Azure endpoints without CORS errors.

---

## GitHub Copilot tips for your stream

**This is the highest-Copilot stream on the project.** Everything you build is well-documented Azure SDK work.

**Use Copilot heavily for:**
- Azure Functions v4 `app.http()` trigger boilerplate — type the function name and Copilot fills the handler skeleton.
- `@azure/cosmos` client patterns — container reads, upserts, partition key usage. Copilot knows the SDK well.
- URL fetch + HTML strip (for the enrich endpoint) — standard Node.js, Copilot completes it from a comment.
- Try/catch error response patterns — write `// return 400 if missing fields` and Copilot writes the check.
- `host.json` CORS config — just start typing and it'll complete the allowed origins block.

**Don't rely on Copilot for:**
- The content hash caching logic for enriched recipes — think through the key design yourself (hash of trimmed source text is fine).
- Wiring Person 3's prompt module — Copilot won't know the exact export shape until the file exists; import it manually.

---

## Kickoff prompt (paste this to your AI assistant to get started)

> I'm building the Azure Functions v4 (Node.js) backend for a hackathon app called Sous. The backend lives in `functions/`. My job is to write HTTP trigger functions for /assess (vision check), /rescue (cooking recovery advice), and /recipes (recipe data).
>
> The tech: Azure Functions v4 Node.js programming model (`@azure/functions`), Azure OpenAI GPT-4o vision, Azure Cosmos DB. I'll receive a prompt module from a teammate and a db module from another teammate — for now I'll stub them.
>
> Start with Task A1: set up the project scaffold under `functions/src/`, install dependencies, create `functions/src/lib/openai-client.ts`, and verify `func start` boots without errors.
