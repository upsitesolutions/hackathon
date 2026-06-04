# Akiva — Backend + Prompts

## Your job in one sentence
Build the Azure Functions backend and all the AI prompts — you own the full brain of the app.

---

## Files you are allowed to touch
```
functions/src/functions/          ← all HTTP trigger functions
functions/src/lib/openai-client.ts ← Azure OpenAI client
functions/src/lib/prompts/        ← all prompt modules (yours alone)
functions/host.json
functions/package.json            ← you manage deps for everyone, see note below
functions/tsconfig.json
functions/local.settings.json     ← local env vars (gitignored)
docs/api-contract.md              ← you write this on day 1
```

## Files you must never touch
```
app/                              ← Rosa's
database/                         ← Joanna's
functions/src/lib/db.ts           ← Joanna's — import it, never edit it
```

---

## ⚠️ Dependency coordination — do this first

You own `functions/package.json`. Before anyone writes code, collect deps from Joanna and install everything once:

```bash
cd functions
npm install openai @azure/cosmos
# (Joanna needs @azure/cosmos)
```

Commit `package.json` and `package-lock.json` immediately. Nobody else touches these files.

---

## ⚠️ Local settings

Azure Functions uses `local.settings.json` (not `.env`). Create `functions/local.settings.json` — it's gitignored, so each person keeps their own copy:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "",
    "AZURE_OPENAI_API_KEY": "",
    "AZURE_OPENAI_DEPLOYMENT": "",
    "COSMOS_CONNECTION_STRING": ""
  }
}
```

Share the actual values with the team over Slack/chat — never commit them.

---

## API contract — write this first, share with Rosa

Pin in `docs/api-contract.md` before anyone builds:

```
POST /api/recipes/enrich
Body:    { "sourceText"?: "...", "sourceUrl"?: "https://..." }
Returns: { "id": "...", "title": "...", "steps": [{ "stepId", "instruction",
           "expectedVisualState", "commonFailures[]", "checkpointMinutes" }] }

POST /api/assess
Body:    { "recipeId": "...", "stepId": "...", "imageBase64": "..." }
Returns: { "verdict": "on_track"|"adjust"|"done", "advice": "...", "confidence": 0.0–1.0 }

POST /api/rescue
Body:    { "recipeId": "...", "stepId": "...", "problem": "..." }
Returns: { "advice": "..." }

GET  /api/sessions/{id}/recipe
Returns: { "personalizedRecipe": { "title", "personalizedSteps[]", "notes" } }
```

---

## Your tasks

### A0 — Project scaffold + API contract (1h)
**Files:** `functions/src/lib/openai-client.ts`, `functions/local.settings.json`, `docs/api-contract.md`

Set up `functions/src/` structure. Create `openai-client.ts` — initialize the `openai` SDK with env vars. Verify `npm start` (runs `tsc && func start`) boots cleanly. Write `docs/api-contract.md` and share with Rosa.

✅ Done: `func start` runs on port 7071; a direct OpenAI ping succeeds; contract doc committed.

---

### P0 — Recipe enrichment prompt (2h) ⚠️ do this before A4 — unblocks everything
**File:** `functions/src/lib/prompts/enrich.ts`

**The most important prompt in the product.** Takes any raw recipe text and returns a fully structured recipe Sous can work with.

Export `buildEnrichPrompt(rawText: string)` → messages array for the OpenAI chat API.

The prompt must instruct GPT-4o to parse each step and derive:
- `expectedVisualState` — what would an experienced chef look for? Specific: color, texture, consistency.
- `commonFailures[]` — 2–4 things that can go wrong and how they look visually.
- `checkpointMinutes` — when Sous should prompt for a photo.

Returns strict JSON:
```json
{
  "title": "...",
  "steps": [{
    "stepId": "step-1",
    "instruction": "...",
    "expectedVisualState": "...",
    "commonFailures": ["...", "..."],
    "checkpointMinutes": 5
  }]
}
```

Test against 3 different recipe inputs before wiring in. See Joanna's `database/fixtures/` for test inputs once she has them.

✅ Done: 3 different recipe inputs → valid structured JSON with non-empty visual states per step.

---

### A4 — /recipes/enrich HTTP trigger (1.5h)
**File:** `functions/src/functions/enrich.ts`
**Depends on:** P0, Joanna's db.ts

Accept `{ sourceText?, sourceUrl? }` — 400 if both missing. If URL, fetch and strip HTML. Hash the text → check Cosmos DB cache. If cached, return immediately. Otherwise call `buildEnrichPrompt`, save result, return enriched recipe.

✅ Done: POST raw recipe text → returns structured steps with visual states.

---

### P1 — Assess prompt (1.5h)
**File:** `functions/src/lib/prompts/assess.ts`

Export `buildAssessPrompt({ expectedVisualState, commonFailures, stepInstruction })` → messages array with image. Instruct GPT-4o to return strict JSON matching the verdict schema. Ask for specific, actionable advice — not generic tips.

✅ Done: test call returns parseable verdict JSON with correct schema.

---

### P2 — Verdict schema validation (1h)
**File:** `functions/src/lib/prompts/verdict-schema.ts`

Export `validateVerdict(raw: string)` — parses model output, throws on invalid `verdict` value, missing `advice`, or malformed JSON.

✅ Done: handles valid, invalid verdict, missing advice, and malformed JSON correctly.

---

### A2 — /assess HTTP trigger (2h)
**File:** `functions/src/functions/assess.ts`
**Depends on:** P1, P2, Joanna's db.ts

```ts
app.http('assess', { methods: ['POST'], authLevel: 'anonymous', handler })
```

1. Parse body — 400 if missing fields.
2. `db.getStep(recipeId, stepId)` → step.
3. `buildAssessPrompt(step)` → prompt.
4. GPT-4o vision call.
5. `validateVerdict(raw)` → verdict.
6. `db.appendTurn(sessionId, turn)`.
7. Return verdict JSON.

✅ Done: `curl -X POST http://localhost:7071/api/assess` returns valid verdict JSON.

---

### P4 — Rescue prompt (1.5h)
**File:** `functions/src/lib/prompts/rescue.ts`

Export `buildRescuePrompt({ stepInstruction, expectedVisualState, problem })`. Frame GPT-4o as an experienced chef. Request a 2–4 sentence recovery path. Test against: seized caramel, over-salted dish, bread won't come together, overcooked steak.

✅ Done: 4 test cases return specific, actionable recovery paths.

---

### A3 — /rescue HTTP trigger (1h)
**File:** `functions/src/functions/rescue.ts`
**Depends on:** P4, Joanna's db.ts

Accept `{ recipeId, stepId, problem }`. Load step, call `buildRescuePrompt`, return `{ advice: string }`.

✅ Done: returns a specific recovery path for a test problem.

---

### P7 — Personalized recipe prompt (1.5h)
**File:** `functions/src/lib/prompts/personalize.ts`

Export `buildPersonalizePrompt({ originalRecipe, turns, adjustments })`. Rewrites the recipe incorporating session data: adjusted timings, personal notes where verdicts flagged issues. Returns strict JSON: `{ title, personalizedSteps[], notes }`.

✅ Done: test session with mixed verdicts produces a clean personalized recipe JSON.

---

### A4b — /sessions/:id/recipe (0.5h)
**File:** `functions/src/functions/sessions.ts`

`GET /api/sessions/{id}/recipe` → fetch session → return `session.personalizedRecipe`. 404 if not yet generated.

✅ Done: returns personalized recipe after session completes.

---

### A5 — Validation + error shape (0.5h)
Every handler: try/catch, JSON error responses only. `{ status: 400, jsonBody: { error: '...' } }` on bad input. No HTML — Rosa's app can't parse it.

✅ Done: malformed requests return JSON errors.

---

### A6 — CORS + calibration (1h)
**File:** `functions/host.json`

Add CORS for Expo web preview. Then calibrate the assess prompt against Matt's demo photos (P3 work) — iterate until verdicts are reliable for all 6 demo scenarios. See Matt's brief for the photo list.

✅ Done: assess round-trip ≤5s; all 6 demo scenarios return correct verdicts.

---

## GitHub Copilot tips

**Use heavily for:** `app.http()` trigger boilerplate, `@azure/cosmos` client patterns, try/catch error response shapes, `host.json` CORS, URL fetch + HTML strip, TypeScript type imports from `@azure/functions`.

**Don't use for:** the actual prompt text — Copilot doesn't know what bread dough looks like. Write the domain content yourself and use Copilot only for the surrounding TypeScript scaffolding.

---

## Kickoff prompt

> I'm Akiva, building the Azure Functions v4 TypeScript backend for a hackathon app called Sous — a visual AI sous-chef. I own everything in `functions/` including HTTP trigger functions and all AI prompt modules.
>
> Stack: Azure Functions v4, TypeScript, Azure OpenAI GPT-4o vision, Azure Cosmos DB. The project already has a working dummy function and TypeScript config set up.
>
> I own both the HTTP triggers AND the prompt engineering — I iterate the full loop: write prompt → wire into handler → test → refine.
>
> Start with A0: set up `functions/src/lib/openai-client.ts`, verify `npm start` boots cleanly, then write `docs/api-contract.md`.
