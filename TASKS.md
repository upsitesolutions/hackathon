# Sous — Task Breakdown

## Before anything: API contract alignment (all hands, 30 min)

Before any stream writes code that crosses a boundary, the team agrees on three things:

1. **Verdict schema** — the exact JSON shape the vision model returns and the server forwards to the client:
   ```json
   {
     "verdict": "on_track" | "adjust" | "done",
     "advice": "string — plain-language corrective action or confirmation",
     "confidence": 0.0–1.0
   }
   ```

2. **POST /assess request shape** — `{ stepId, recipeId, imageBase64 }` → verdict response above.

3. **POST /rescue request shape** — `{ recipeId, stepId, problem }` → `{ advice: string }`.

Pin these in a short `docs/api-contract.md` at the start of the session. All four streams build to these shapes. No unilateral changes without team sign-off.

---

## Stream 1: Mobile / UX

### Task M1: Recipe list screen
**Owner:** Mobile/UX
**Est:** 1.5h
**Depends on:** A4 (GET /recipes endpoint) — can use hardcoded mock data until A4 is live

Build `app/src/app/index.tsx` as a recipe picker. Replace the Expo boilerplate. Render a `FlatList` of recipe cards (title, short description, thumbnail placeholder). Tapping a card navigates to the step viewer (M2). Use a local `MOCK_RECIPES` constant initially; swap to `fetch('http://localhost:3000/recipes')` once A4 is ready.

**Done:** App launches, shows at least 2 named recipes, tap navigates forward.

---

### Task M2: Recipe step viewer screen
**Owner:** Mobile/UX
**Est:** 2h
**Depends on:** M1

Create `app/src/app/recipe/[id].tsx` (expo-router dynamic route). Show the current step number, the step instruction text, and — prominently — the `expectedVisualState` description ("what to look for"). Include Prev/Next step navigation. Show a "Check it" button at the bottom that will invoke the camera (M3). Pass `stepId` and `recipeId` through the navigation state.

**Done:** Can page through all steps of a recipe; expected visual state text is visible per step.

---

### Task M3: Camera capture component
**Owner:** Mobile/UX
**Est:** 2h
**Depends on:** M2 (needs `recipeId`/`stepId` in context)

Install `expo-camera`. Create `app/src/components/camera-capture.tsx` — a modal-style camera view. On capture: encode the photo as base64, then call the assess API (POST /assess). While waiting, show a spinner. On response, dismiss camera and pass the verdict to the result card (M4).

Use `expo-image-manipulator` to resize to ≤1024px before encoding — keeps payloads reasonable.

**Done:** Tapping "Check it" opens the camera, takes a photo, and returns a verdict object to the calling screen.

---

### Task M4: Assessment result card
**Owner:** Mobile/UX
**Est:** 1.5h
**Depends on:** API contract (verdict schema)

Create `app/src/components/assessment-card.tsx`. Receives a verdict object and renders:
- A status badge: green "On Track", amber "Adjust", blue "Done — pull it now"
- The `advice` string in large readable text
- A "Continue" button to dismiss and go back to the step viewer

The card should be visually distinct (bottom sheet or full overlay) so it reads clearly while cooking.

**Done:** Pass a hardcoded mock verdict to the card; all three verdict states render correctly.

---

### Task M5: Wire capture → assess → result
**Owner:** Mobile/UX
**Est:** 1h
**Depends on:** M3, M4, A2

In the recipe step viewer (M2), connect the "Check it" button → CameraCapture (M3) → POST /assess → AssessmentCard (M4). Handle loading state and basic error state (show "Could not reach server — try again"). Extract the API base URL into `app/src/constants/api.ts` so it's easy to point at staging or prod.

**Done:** Full flow works end-to-end in the simulator against a running local server.

---

### Task M6: Rescue prompt screen
**Owner:** Mobile/UX
**Est:** 1.5h
**Depends on:** A3

Add a "Help, something went wrong" button to the step viewer. On tap, open `app/src/app/rescue.tsx` — a simple screen with a multi-line text input ("Describe what happened") and a Submit button. POST to /rescue with `{ recipeId, stepId, problem }`. Display the returned `advice` string in a result card (reuse AssessmentCard layout).

**Done:** User can type a problem, submit, and see a recovery path.

---

## Stream 2: API / Orchestration

> **Runtime:** Azure Functions v4 (Node.js programming model). Local dev: `func start` (port 7071). Each endpoint is an HTTP trigger function in `server/src/functions/`.

### Task A1: Azure OpenAI client + project scaffold
**Owner:** API/Orchestration
**Est:** 1h
**Depends on:** none

Set up the Functions v4 project structure under `server/src/`. Create `server/src/lib/openai-client.js` — initialize the `openai` SDK with `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` from env. Export a single client instance. Add `server/.env.example` documenting all required vars. Verify `func start` boots without errors.

**Done:** `func start` runs; a direct call to `openai-client.js` round-trips a plain text prompt successfully.

---

### Task A2: assess HTTP trigger
**Owner:** API/Orchestration
**Est:** 2h
**Depends on:** A1, P1 (assess prompt), D2 (db.js)

Create `server/src/functions/assess.js`. Register as `app.http('assess', { methods: ['POST'], authLevel: 'anonymous', handler })`. Handler steps:
1. Parse `{ recipeId, stepId, imageBase64 }` from request body — return 400 if any missing.
2. Load step from Cosmos DB via `db.getStep(recipeId, stepId)`.
3. Build vision prompt via `buildAssessPrompt(step)`.
4. Call GPT-4o vision; validate verdict via `validateVerdict(raw)`.
5. Write session turn to Cosmos DB via `db.upsertSession(turn)`.
6. Return verdict JSON.

**Done:** `curl -X POST http://localhost:7071/api/assess` with a sample payload returns valid verdict JSON.

---

### Task A3: rescue HTTP trigger
**Owner:** API/Orchestration
**Est:** 1.5h
**Depends on:** A1, P4 (rescue prompt)

Create `server/src/functions/rescue.js`. Accept `{ recipeId, stepId, problem }` — return 400 if missing. Load step context from Cosmos DB, call `buildRescuePrompt`, call GPT-4o (text only), return `{ advice: string }`.

**Done:** `curl -X POST http://localhost:7071/api/rescue -d '{"problem":"my caramel seized",...}'` returns a specific recovery path.

---

### Task A4: recipes HTTP triggers
**Owner:** API/Orchestration
**Est:** 1h
**Depends on:** D2

Create `server/src/functions/recipes.js`. Two triggers:
- `GET /api/recipes` → `db.getRecipes()` → array of `{ id, title, description }`
- `GET /api/recipes/{id}` → `db.getRecipe(id)` → recipe with full `steps[]`

Read-only, no auth.

**Done:** Both endpoints return seeded data. Mobile team points `API_BASE_URL` at `http://localhost:7071` and swaps from mock.

---

### Task A5: Validation and error shape
**Owner:** API/Orchestration
**Est:** 1h
**Depends on:** A2, A3

In each function handler, wrap the body in try/catch. On missing fields: `return { status: 400, jsonBody: { error: '...' } }`. On unexpected errors: `return { status: 500, jsonBody: { error: 'internal error' } }`. No Jade, no HTML — the mobile client can only parse JSON.

**Done:** Malformed requests to all three endpoints return JSON 400s; injected throws return JSON 500s.

---

### Task A6: Session persistence via Cosmos DB output binding
**Owner:** API/Orchestration
**Est:** 1.5h
**Depends on:** A2, D3 (Cosmos DB sessions container)

Azure Functions supports Cosmos DB **output bindings** that replace manual SDK writes. Configure the output binding in the v4 API via the `extraOutputs` option on `app.http`:

```js
const { app, output } = require('@azure/functions');
const cosmosOutput = output.cosmosDB({
  databaseName: 'sous-db',
  containerName: 'sessions',
  connection: 'COSMOS_CONNECTION'
});
app.http('assess', {
  methods: ['POST'],
  authLevel: 'anonymous',
  extraOutputs: [cosmosOutput],
  handler: async (request, context) => {
    // ... after verdict ...
    context.extraOutputs.set(cosmosOutput, { sessionId, recipeId, stepId, verdict, advice, timestamp });
  }
});
```

Write a session turn document `{ sessionId, recipeId, stepId, verdict, advice, timestamp }` using the binding. Use a hardcoded demo `sessionId` or generate one per app launch — no user auth for MVP.

**Done:** After an assess call, a document appears in the sessions container in Cosmos DB portal.

---

## Stream 3: AI / Prompt Engineering

### Task P1: Assess prompt — first draft
**Owner:** AI/Prompt Engineering
**Est:** 1.5h
**Depends on:** verdict schema (API contract)

Create `server/lib/prompts/assess.js`. Export `buildAssessPrompt({ expectedVisualState, commonFailures, stepInstruction })` that returns a system + user message array ready for the OpenAI chat API. The prompt must:
- Show GPT-4o the step's expected visual state and common failure modes.
- Instruct it to respond in strict JSON matching the verdict schema.
- Ask for specific, actionable advice (not generic cooking tips).
- Include a "respond in JSON only, no prose wrapper" instruction.

**Done:** Function exported and tested with a hardcoded call — returns parseable JSON with correct schema.

---

### Task P2: Verdict schema validation
**Owner:** AI/Prompt Engineering
**Est:** 1h
**Depends on:** P1

Create `server/lib/prompts/verdict-schema.js`. Export a `validateVerdict(raw)` function that parses the model output and throws a typed error if the verdict is not `on_track | adjust | done`, if `advice` is missing or empty, or if JSON is malformed. The /assess route (A2) calls this before returning to the client — if validation fails, the route retries once with a stricter prompt instruction.

**Done:** Unit test file `server/lib/prompts/__tests__/verdict-schema.test.js` with passing tests for valid, invalid, and malformed inputs.

---

### Task P3: Calibrate assess prompt on demo recipes
**Owner:** AI/Prompt Engineering
**Est:** 2h
**Depends on:** P1, D3 (seeded bread/steak recipes with visual states)

Run the assess prompt manually against real or staged photos for each demo recipe step. For each step, test:
- A "correct" image (should return `on_track`)
- A "wrong" image — wet bread dough when it should be smooth, pale steak when it should have a sear (should return `adjust` with specific advice)
- The final step with a done state (should return `done`)

Iterate on the prompt until verdicts are reliable. Document the final prompt version and any per-recipe tweaks in `docs/prompt-notes.md`.

**Done:** At least 2 recipes × 3 scenarios produce correct verdicts. Notes committed.

---

### Task P4: Rescue prompt — design and test
**Owner:** AI/Prompt Engineering
**Est:** 1.5h
**Depends on:** none (can run in parallel with P1–P3)

Create `server/lib/prompts/rescue.js`. Export `buildRescuePrompt({ stepInstruction, expectedVisualState, problem })`. Prompt should:
- Frame GPT-4o as an experienced chef diagnosing a cooking problem.
- Provide the step context so advice is specific to what they were trying to do.
- Request a concise 2-4 sentence recovery path (not a full recipe rewrite).

Test against: seized caramel, over-salted dish, bread dough that won't come together, overcooked steak. Verify responses are actionable and specific.

**Done:** Function exported; 4 test cases produce useful, specific rescue advice.

---

### Task P5: Prompt hardening — edge cases
**Owner:** AI/Prompt Engineering
**Est:** 1.5h
**Depends on:** P1, P3

Stress-test the assess prompt:
- Off-topic image (a cat, a table, a blank wall) — should return a graceful "can't assess" response, not a hallucinated verdict.
- Very low-quality / blurry image — should note uncertainty, not confidently mislead.
- Step with no visual cue (e.g., "season to taste") — verify the prompt handles it without crashing.

Update `buildAssessPrompt` to handle these cases. Add a fallback in the /assess route (A2): if `confidence < 0.4`, override verdict to `adjust` with advice "The image isn't clear enough to assess — try again with better lighting."

**Done:** All three edge cases return sensible, non-hallucinated responses.

---

### Task P6: Token and latency audit
**Owner:** AI/Prompt Engineering
**Est:** 1h
**Depends on:** P3, P5

Measure end-to-end latency for a typical /assess call (image encode → POST → verdict received) and typical token counts. If latency exceeds 5s or tokens exceed 1500/call:
- Truncate `commonFailures[]` to top 3 in the prompt.
- Compress the image to 768px before sending.
- Consider a `max_tokens` cap on the response (verdict JSON is small).

Document the baseline and post-optimization numbers in `docs/prompt-notes.md`.

**Done:** Assess round-trip is ≤5s in practice on the demo device.

---

## Stream 4: Data / Recipes

### Task D1: Provision Cosmos DB account and containers
**Owner:** Data/Recipes
**Est:** 1h
**Depends on:** none

In the Azure portal (or via Azure CLI), provision:
- Cosmos DB account (NoSQL API, serverless tier for hackathon)
- Database: `sous-db`
- Containers: `recipes` (partition key: `/id`), `sessions` (partition key: `/sessionId`)

Save the connection string and key to `.env` (not committed). Share values with the API stream for their `.env`. Add `database/README.md` documenting the container structure and how to re-provision.

**Done:** Containers exist in Azure portal. API team can connect with the provided credentials.

---

### Task D2: Recipe and Step schema + Cosmos DB client
**Owner:** Data/Recipes
**Est:** 1.5h
**Depends on:** D1

Create `server/lib/db.js` — a Cosmos DB client wrapper using `@azure/cosmos`. Export:
- `getRecipes()` — returns all items from `recipes` container
- `getRecipe(id)` — returns one recipe with its embedded steps array
- `getStep(recipeId, stepId)` — returns a single step document
- `upsertSession(turn)` — writes/updates a session turn

Document the schema:
```js
// Recipe document
{ id, title, description, steps: [Step] }

// Step
{ stepId, instruction, expectedVisualState, commonFailures: string[] }
```

**Done:** Module exports verified with a quick test script that reads from a seeded container.

---

### Task D3: Seed recipe — Rustic bread
**Owner:** Data/Recipes
**Est:** 2h
**Depends on:** D2

Write and import a full bread recipe into Cosmos DB. The recipe needs 6-8 steps with rich, specific `expectedVisualState` and `commonFailures` per step. Examples:

- **Mix (Step 2):** `expectedVisualState`: "Dough is shaggy and just comes together — no dry flour patches, slightly sticky." `commonFailures`: ["too dry — crumbles apart", "too wet — sticks to bowl, no structure"]
- **Knead (Step 3):** `expectedVisualState`: "Smooth, elastic ball. Passes the windowpane test — stretches thin without tearing." `commonFailures`: ["still tearing — under-kneaded", "dense and tight — over-kneaded"]
- **Proof (Step 5):** `expectedVisualState`: "Doubled in size, domed top, finger poke springs back slowly." `commonFailures`: ["no rise — under-proofed or dead yeast", "collapsed — over-proofed"]

This is the primary demo recipe — invest in the visual state descriptions.

**Done:** Recipe document with ≥6 steps is in Cosmos DB; each step has a non-empty `expectedVisualState` and ≥2 `commonFailures`.

---

### Task D4: Seed recipe — Pan-seared steak
**Owner:** Data/Recipes
**Est:** 1.5h
**Depends on:** D2

Write and import a steak sear recipe. 4-5 steps, visually dramatic — ideal for live demo. Key steps:

- **Bring to temp (Step 1):** `expectedVisualState`: "Steak is room temperature, surface is dry (patted with paper towels). No moisture sheen." `commonFailures`: ["wet surface — will steam, not sear"]
- **Sear (Step 3):** `expectedVisualState`: "Deep mahogany crust on the bottom, fat rendering at edges. Smoke coming off the pan." `commonFailures`: ["pale/grey — pan too cold or moved too early", "burned black — heat too high"]
- **Finish (Step 4):** `expectedVisualState`: "Sides are browned halfway up. Thermometer reads 125°F for medium-rare." `commonFailures`: ["still red on sides — needs more time", "firm to touch — overcooked"]

**Done:** Recipe document in Cosmos DB with ≥4 steps and rich visual states.

---

### Task D5: Seed recipe — Caramelized onions (rescue demo)
**Owner:** Data/Recipes
**Est:** 1h
**Depends on:** D2

Add a third recipe specifically useful for demonstrating the rescue flow. Caramelized onions are slow, easily burned, and easy to mess up — good for "my onions seized and look dry" or "they're turning black." 4-5 steps. Focus on the failure modes since this recipe powers the rescue demo.

**Done:** Recipe in Cosmos DB; at least one step has 3+ `commonFailures` entries.

---

### Task D6: Index policy and connection hardening
**Owner:** Data/Recipes
**Est:** 1h
**Depends on:** D1, D2

Review the default Cosmos DB indexing policy for the `recipes` container — for the demo we only query by `id`, so narrow the index to `/id` and `/steps/*/stepId` to reduce RU consumption. In `server/lib/db.js`, add retry logic (exponential backoff on 429 responses) and a timeout of 5s per query so the demo doesn't hang on a slow DB call.

**Done:** Index policy updated in portal; db.js has retry logic; a test query against the seeded data completes in <200ms.

---

## Integration checkpoint

**When:** After all "Depends on: none" and first-wave tasks are done (~mid-session). All four streams sync for 20 minutes.

**Goal:** Get one complete end-to-end flow working on a real device:

1. App shows the bread recipe list (M1 + A4 + D3).
2. User pages to "Knead" step, sees expected visual state (M2).
3. User taps "Check it", camera opens, takes a photo (M3).
4. Photo posts to /assess, prompt runs against the step (A2 + P1).
5. Verdict + advice renders in the assessment card (M4).

**Checklist:**
- [ ] Run `func start` in `server/` to start the Azure Functions runtime (default port 7071, not 3000)
- [ ] `api.ts` base URL updated to `http://<LAN IP>:7071` so the physical phone can reach it
- [ ] Cosmos DB credentials in server `.env`
- [ ] Azure OpenAI deployment name confirmed and in `.env`
- [ ] At least one seeded recipe in Cosmos DB

After integration, finish the rescue flow (M6 + A3 + P4) and run the full demo rehearsal once before presenting.
