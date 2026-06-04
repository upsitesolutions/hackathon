# Person 4 — Data / Recipes

## Your job in one sentence
Provision the database, write the DB client, and prepare the test fixtures Person 3 uses to calibrate prompts.

## You own
```
database/              ← schema docs, seed scripts, test fixtures
server/src/lib/db.js   ← Cosmos DB client wrapper
```

You never touch `app/`, `server/src/functions/`, or `server/src/lib/prompts/`.

## You do NOT need to know
- How the Expo app is built
- How Azure Functions routes work
- How the vision prompt is designed

**Important shift:** Sous no longer has a fixed recipe library. Users bring their own recipes, and the enrichment prompt (Person 3's P0 task) generates all the structured data automatically. Your seeded recipes are **test fixtures** — they let Person 3 verify the enrichment prompt is working and let the team demo without needing live enrichment. Think of them as golden examples, not the product's recipe list.

---

## What you hand off

| Deliverable | Goes to | When |
|-------------|---------|-------|
| Cosmos DB credentials (endpoint + key) | Person 2, for `.env` | Day 1, as soon as containers are provisioned |
| `server/src/lib/db.js` | Person 2 | Mid-session |
| Raw recipe text files (`database/fixtures/`) | Person 3 (as enrichment prompt test inputs) | Early — unblocks P0 |

---

## Cosmos DB schema

```js
// Recipe document — stored in `recipes` container, partition key: /id
{
  id: "bread-rustic",
  title: "Rustic White Bread",
  description: "...",
  steps: [Step]   // embedded array
}

// Step (embedded in recipe)
{
  stepId: "knead",
  instruction: "Knead the dough for 8–10 minutes.",
  expectedVisualState: "Smooth, elastic ball. Stretches thin without tearing (windowpane test).",
  commonFailures: [
    "Still shaggy and tearing — needs more kneading",
    "Dense and tight — over-kneaded, stop now"
  ],
  checkpointMinutes: 10   // ← when Sous prompts for a photo during this step
}

// Session document — stored in `sessions` container, partition key: /sessionId
{
  sessionId: "...",
  recipeId: "...",
  startedAt: "ISO timestamp",
  turns: [Turn],           // checkpoint events during the session
  adjustments: [Adjustment], // manual notes the cook logged
  personalizedRecipe: {...}  // generated at session end, null until then
}

// Turn (embedded in session)
{
  stepId: "knead",
  promptedAt: "ISO timestamp",   // when the timer fired
  verdict: "adjust",
  advice: "Still tearing — 3 more minutes, add flour",
  actualDurationMinutes: 13      // how long the step actually took
}

// Adjustment (embedded in session) — manual notes
{
  stepId: "knead",
  type: "ingredient" | "timing" | "technique",
  description: "Added extra tablespoon of flour — dough was sticky"
}

// PersonalizedRecipe (embedded in session after generation)
{
  title: "My Rustic Bread (adjusted for my kitchen)",
  personalizedSteps: [
    {
      stepId: "knead",
      instruction: "Knead for 12–13 minutes (your dough tends to need extra time).",
      note: "Add a tablespoon of flour if it's sticking — your kitchen runs humid."
    }
  ],
  notes: "Your oven runs hot — reduce final bake temp by 10°F next time."
}
```

---

## Your tasks

### D1 — Provision Cosmos DB (1h)
**No code — Azure portal or CLI**

Provision:
- Cosmos DB account (NoSQL API, **serverless tier** — free for hackathon scale)
- Database: `sous-db`
- Containers: `recipes` (partition key `/id`), `sessions` (partition key `/sessionId`)

Save connection string + key. Share with Person 2 immediately. Add `database/README.md` with the container structure and re-provision steps.

✅ Done when: containers exist in Azure portal, Person 2 has credentials.

---

### D2 — Cosmos DB client (db.js) (1.5h)
**File:** `server/src/lib/db.js`

Install `@azure/cosmos`. Export:
- `getRecipes()` — all items from `recipes` container
- `getRecipe(id)` — one recipe with embedded steps
- `getStep(recipeId, stepId)` — single step from recipe's steps array
- `createSession(sessionId, recipeId)` — create a new session document
- `appendTurn(sessionId, turn)` — push a turn onto `session.turns[]`
- `appendAdjustment(sessionId, adjustment)` — push an adjustment note
- `savePersonalizedRecipe(sessionId, recipe)` — write the generated recipe onto the session
- `getSession(sessionId)` — fetch the full session (for recipe export)

Add 5s timeout and basic retry on 429 (Cosmos DB rate limit).

✅ Done when: a test script reads from the seeded container without errors.

---

### D3 — Demo fixture: Rustic bread (2h)
**Used by Person 3 to calibrate the enrichment and assess prompts, and as the primary demo.**

Two things to produce:
1. `database/fixtures/bread-raw.txt` — raw recipe text exactly as a user might paste it in (no structured fields). This is what gets fed to the enrichment prompt.
2. `database/fixtures/bread-enriched.json` — the expected enriched output (hand-authored). Person 3 uses this to verify the prompt produces the right structure.

For the enriched JSON, include:

6–8 steps. Each step needs a rich `expectedVisualState` and 2–3 `commonFailures`. Reference:

| Step | checkpointMinutes | expectedVisualState | commonFailures |
|------|:-----------------:|--------------------|-----------------------|
| Mix | 3 | "Shaggy, just comes together. Slightly sticky, no dry patches." | "Too dry — crumbles apart", "Too wet — sticks to bowl with no structure" |
| Knead | 10 | "Smooth, elastic ball. Windowpane test: stretches thin without tearing." | "Still shaggy and tearing — under-kneaded", "Dense and tight — over-kneaded" |
| First proof | 45 | "Doubled in size, domed top. Finger poke springs back slowly." | "No rise — under-proofed or dead yeast", "Collapsed — over-proofed" |
| Shape | 5 | "Taut surface, neat seam underneath." | "Loose, slack surface — needs more tension" |
| Bake (early) | 15 | "Oven spring, starting to colour on top." | "No oven spring — under-proofed going in" |
| Bake (final) | 30 | "Deep golden-brown crust. Hollow thud when tapped on the bottom." | "Pale and soft — needs more time", "Cracked sides — oven too hot" |

✅ Done when: recipe document with ≥6 steps is in Cosmos DB, each with `expectedVisualState` and ≥2 `commonFailures`.

---

### D4 — Demo fixture: Pan-seared steak (1.5h)
**Fast, visual, dramatic — backup demo. Same two-file pattern as D3.**

Produce `database/fixtures/steak-raw.txt` and `database/fixtures/steak-enriched.json`.

4–5 steps:

| Step | checkpointMinutes | expectedVisualState | commonFailures |
|------|:-----------------:|--------------------|-----------------------|
| Prep | 2 | "Room temp, surface completely dry. No moisture sheen." | "Wet surface — will steam not sear" |
| Preheat pan | 3 | "Pan smoking, oil just past shimmer." | "Oil pooling, not smoking — too cold", "Burning oil — too hot, reduce heat" |
| First sear | 3 | "Deep mahogany crust forming. Fat rendering at edges." | "Pale/grey — pan too cold or moved too early", "Black crust — heat too high" |
| Finish | 4 | "Sides browned halfway up. Firm but with slight give." | "Still raw on sides — needs more time", "Rock hard — overcooked" |

✅ Done when: recipe in Cosmos DB with ≥4 steps and rich visual states.

---

### D5 — Demo fixture: Caramelized onions (1h)
**Powers the rescue demo — focus on failure modes. Same two-file pattern.**

Produce `database/fixtures/onions-raw.txt` and `database/fixtures/onions-enriched.json`.

4–5 steps. The point of this recipe is the rescue flow, so load up the `commonFailures` — these are what "my onions seized" and "they're turning black" map to.

| Step | key commonFailures |
|------|-------------------|
| Slice | "Too thick — won't cook evenly" |
| Start cooking | "Heat too high — browning too fast on outside, raw inside" |
| Caramelize | "Stuck and dry — add splash of water or stock and scrape", "Burning black edges — heat too high, lower immediately" |
| Final | "Acrid smell — burnt sugars, can't recover — start over" |

✅ Done when: recipe in Cosmos DB, at least one step has 3+ `commonFailures`.

---

### D6 — Index policy + connection hardening (1h)
**Depends on:** D1, D2

Narrow the Cosmos DB index policy on `recipes` to `/id` and `/steps/*/stepId` — reduces RU consumption. In `db.js`, add exponential backoff on 429 responses (Cosmos serverless can rate-limit under burst). Verify a full read of a seeded recipe completes in <200ms.

✅ Done when: index policy updated, db.js has retry logic, queries are fast.

---

## Kickoff prompt (paste this to your AI assistant to get started)

> I'm the data / Cosmos DB person for a hackathon app called Sous — a visual AI sous-chef. My job is to provision an Azure Cosmos DB account, write a client module (`server/src/lib/db.js`), and seed 3 demo recipes with rich visual state descriptions per step.
>
> The schema: each Recipe document has an embedded `steps[]` array. Each step has `stepId`, `instruction`, `expectedVisualState` (what the food should look like at this step), and `commonFailures[]` (what can go wrong visually). This content is what the AI uses to assess a photo.
>
> Start with Task D1: provision a Cosmos DB account (NoSQL API, serverless tier) in the Azure portal with two containers — `recipes` (partition key `/id`) and `sessions` (partition key `/sessionId`). Then move to D2 and write `server/src/lib/db.js`.
