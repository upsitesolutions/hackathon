# Joanna — Data / Cosmos DB

## Your job in one sentence
Provision the database, write the DB client module, and create the fixture files Akiva uses to calibrate prompts.

---

## Files you are allowed to touch
```
database/                         ← schema docs, fixtures, seed scripts
functions/src/lib/db.ts           ← Cosmos DB client wrapper (yours alone)
```

## Files you must never touch
```
app/                              ← Rosa's
functions/src/functions/          ← Akiva's
functions/src/lib/prompts/        ← Akiva's
functions/src/lib/openai-client.ts ← Akiva's
functions/package.json            ← Akiva's (tell him what deps you need)
```

**One exception:** tell Akiva you need `@azure/cosmos` at the start so he can install it with everything else.

---

## What you hand off and when

| Deliverable | To | When |
|-------------|-----|------|
| Cosmos DB connection string + key | Akiva | Day 1, as soon as containers exist |
| `database/fixtures/bread-raw.txt` | Akiva | Early — unblocks P0 (enrichment prompt) |
| `database/fixtures/steak-raw.txt` | Akiva | Early |
| `database/fixtures/onions-raw.txt` | Akiva | Early |
| `functions/src/lib/db.ts` | Akiva | Mid-session |

---

## Cosmos DB schema

```ts
// Recipe document — container: `recipes`, partition key: /id
{
  id: string,               // e.g. "bread-rustic"
  title: string,
  description: string,
  contentHash: string,      // hash of source text, used for cache lookup
  steps: Step[]
}

// Step (embedded in Recipe)
{
  stepId: string,
  instruction: string,
  expectedVisualState: string,
  commonFailures: string[],
  checkpointMinutes: number
}

// Session document — container: `sessions`, partition key: /sessionId
{
  sessionId: string,
  recipeId: string,
  startedAt: string,        // ISO timestamp
  turns: Turn[],
  adjustments: Adjustment[],
  personalizedRecipe: PersonalizedRecipe | null
}

// Turn (embedded in Session)
{
  stepId: string,
  promptedAt: string,
  verdict: "on_track" | "adjust" | "done",
  advice: string,
  actualDurationMinutes: number
}

// Adjustment (embedded in Session)
{
  stepId: string,
  type: "ingredient" | "timing" | "technique",
  description: string
}

// PersonalizedRecipe (embedded in Session after generation)
{
  title: string,
  personalizedSteps: { stepId: string, instruction: string, note?: string }[],
  notes: string
}
```

---

## Your tasks

### D1 — Provision Cosmos DB (1h)
**Azure portal or CLI — no code**

Provision:
- Cosmos DB account (NoSQL API, **serverless tier** — free at hackathon scale)
- Database: `sous-db`
- Containers:
  - `recipes` — partition key `/id`
  - `sessions` — partition key `/sessionId`

Save connection string + key. **Give to Akiva immediately** so he can put it in `local.settings.json`.

Add `database/README.md` documenting the container structure and how to re-provision.

✅ Done: containers exist in Azure portal; Akiva has credentials.

---

### D2 — Cosmos DB client: db.ts (1.5h)
**File:** `functions/src/lib/db.ts`

Install `@azure/cosmos` (tell Akiva to add it). Export these functions:

```ts
getRecipes(): Promise<Recipe[]>
getRecipe(id: string): Promise<Recipe>
getStep(recipeId: string, stepId: string): Promise<Step>
cacheRecipe(recipe: Recipe): Promise<void>       // used by enrich endpoint
getCachedRecipe(contentHash: string): Promise<Recipe | null>
createSession(sessionId: string, recipeId: string): Promise<void>
appendTurn(sessionId: string, turn: Turn): Promise<void>
appendAdjustment(sessionId: string, adj: Adjustment): Promise<void>
savePersonalizedRecipe(sessionId: string, recipe: PersonalizedRecipe): Promise<void>
getSession(sessionId: string): Promise<Session>
```

Add 5s timeout and retry on 429 (Cosmos serverless rate-limits under burst).

Local-first portability requirements:
- Support either `COSMOS_CONNECTION_STRING` or (`COSMOS_ENDPOINT` + `COSMOS_KEY`) so local emulator and cloud both work.
- Keep names configurable with defaults:
  - DB: `sous-db`
  - Containers: `recipes`, `sessions`
- Add an init/bootstrap helper that ensures DB + containers exist locally before tests.

Simple pre-prod smoke test:
- Build functions: `cd functions && npm run build`
- Run env preflight: `node ../database/tests/preflight/env-check.js`
- Run DB smoke test: `node ../database/tests/db-smoke.js`
- Pass criteria:
  - recipe cache read/write works by id and contentHash
  - step lookup works
  - session create + append turn + append adjustment works
  - personalized recipe save + readback works

✅ Done: test script reads from a seeded container without errors.

---

### D3 — Fixture: Rustic bread (2h)
**Primary demo recipe — most important fixture.**

Two files:

**`database/fixtures/bread-raw.txt`** — Raw recipe text exactly as a user would paste it in. No structured fields. Realistic — copy from a real recipe source, then lightly simplify. This is what Akiva feeds to the enrichment prompt to test it.

**`database/fixtures/bread-enriched.json`** — Hand-authored expected output. Akiva compares the prompt's actual output against this to check quality. Include 6–8 steps:

| Step | checkpointMinutes | expectedVisualState | commonFailures |
|------|:-----------------:|---------------------|----------------|
| Mix | 3 | Shaggy, just comes together. Slightly sticky, no dry patches. | Too dry — crumbles apart; Too wet — sticks to bowl with no structure |
| Knead | 10 | Smooth, elastic ball. Windowpane test: stretches thin without tearing. | Still shaggy and tearing — under-kneaded; Dense and tight — over-kneaded |
| First proof | 45 | Doubled in size, domed top. Finger poke springs back slowly. | No rise — under-proofed or dead yeast; Collapsed — over-proofed |
| Shape | 5 | Taut surface, neat seam underneath. | Loose, slack surface — needs more tension |
| Bake (early) | 15 | Oven spring, starting to colour on top. | No oven spring — under-proofed going in |
| Bake (final) | 30 | Deep golden-brown crust. Hollow thud when tapped on bottom. | Pale and soft — needs more time; Cracked sides — oven too hot |

✅ Done: both files committed; bread-enriched.json has ≥6 steps with non-empty visual states.

---

### D4 — Fixture: Pan-seared steak (1h)
**Files:** `database/fixtures/steak-raw.txt` + `database/fixtures/steak-enriched.json`

4–5 steps. Fast and visual — backup demo.

| Step | checkpointMinutes | expectedVisualState | commonFailures |
|------|:-----------------:|---------------------|----------------|
| Prep | 2 | Room temp, surface completely dry. No moisture sheen. | Wet surface — will steam not sear |
| Preheat pan | 3 | Pan smoking, oil just past shimmer. | Oil pooling, not smoking — too cold; Burning oil — too hot |
| First sear | 3 | Deep mahogany crust forming. Fat rendering at edges. | Pale/grey — pan too cold or moved too early; Black crust — heat too high |
| Finish | 4 | Sides browned halfway up. Firm but with slight give. | Still raw on sides — needs more time; Rock hard — overcooked |

✅ Done: both files committed with ≥4 steps and rich visual states.

---

### D5 — Fixture: Caramelized onions (1h)
**Files:** `database/fixtures/onions-raw.txt` + `database/fixtures/onions-enriched.json`

Powers the rescue demo — load up `commonFailures`. 4–5 steps.

✅ Done: both files committed; at least one step has 3+ common failures.

---

### D6 — Index policy + hardening (0.5h)
**Azure portal + `functions/src/lib/db.ts`**

Narrow Cosmos DB index policy on `recipes` to `/id` and `/contentHash` only. In `db.ts`, verify retry logic handles 429. Confirm a full recipe read completes in <200ms.

✅ Done: index updated; db.ts has retry; queries are fast.

---

## GitHub Copilot tips

**Use heavily for:** `@azure/cosmos` client setup, container read/write/upsert patterns, retry/backoff boilerplate. Copilot knows this SDK well — start typing `const client = new CosmosClient` and it'll complete the pattern.

**Don't use for:** the `expectedVisualState` and `commonFailures` content in fixture files — Copilot generates plausible but generic descriptions. Use Claude or ChatGPT and verify against real cooking references. The quality of this content directly affects how well Akiva's prompts calibrate.

---

## Kickoff prompt

> I'm Joanna, the data/Cosmos DB person for a hackathon app called Sous — a visual AI sous-chef. I own `functions/src/lib/db.ts` and everything in `database/`.
>
> My job: provision an Azure Cosmos DB account (NoSQL, serverless), write a TypeScript client module with functions for reading recipes, caching enriched recipes by content hash, and managing session turns/adjustments/personalized recipe. Also create raw + enriched JSON fixture files for 3 demo recipes (bread, steak, caramelized onions) that the prompt engineer uses to calibrate the AI.
>
> Start with D1: provision the Cosmos DB account in the Azure portal — NoSQL API, serverless tier, database `sous-db`, containers `recipes` (partition key `/id`) and `sessions` (partition key `/sessionId`). Then move to D2.
