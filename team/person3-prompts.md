# Person 3 — AI / Prompt Engineering

## Your job in one sentence
Design and calibrate the vision prompts that make Sous actually work — the core IP of the product.

## You own
```
functions/src/lib/prompts/
  assess.js          ← vision prompt builder
  rescue.js          ← rescue prompt builder
  verdict-schema.js  ← verdict validation
docs/prompt-notes.md ← calibration notes and test results
```

You never touch `app/`, `functions/src/functions/`, `functions/src/lib/openai-client.ts`, `functions/src/lib/db.ts`, `functions/package.json`, or `database/`.

## You do NOT need to know
- How the Expo app is built
- How Azure Functions routes work
- How Cosmos DB is set up

You work entirely in isolation. You test prompts directly against the Azure OpenAI API. When you're happy with them, you hand the module to Person 2 to wire in.

---

## What you hand off to Person 2

| File | Exports | When |
|------|---------|-------|
| `functions/src/lib/prompts/assess.js` | `buildAssessPrompt(step)` → messages array | Mid-session |
| `functions/src/lib/prompts/rescue.js` | `buildRescuePrompt({ step, problem })` → messages array | Mid-session |
| `functions/src/lib/prompts/verdict-schema.js` | `validateVerdict(rawString)` → verdict object or throws | As soon as P2 is done |

---

## The verdict schema (agree on this at the start)

Every assess call must return exactly this shape:

```json
{
  "verdict": "on_track" | "adjust" | "done",
  "advice": "plain-language corrective action or confirmation",
  "confidence": 0.0–1.0
}
```

Your prompt must instruct the model to return **only this JSON, no prose wrapper**.

---

## Your tasks

### P0 — Recipe enrichment prompt (2h) ⚠️ do this first — it unblocks everyone
**File:** `functions/src/lib/prompts/enrich.js`

**This is the most important prompt in the product.** Any recipe the user pastes in — a URL they scraped, a photo of a cookbook, a rough list of steps — gets passed through this prompt and comes out as a fully structured recipe Sous can work with.

Export `buildEnrichPrompt(rawText)` → messages array for the OpenAI chat API (text only, no image).

The prompt must instruct the model to:
1. Parse the recipe into ordered steps.
2. For each step, derive:
   - `expectedVisualState` — what would an experienced chef look for here? Be specific: color, texture, consistency, size, smell cues if visual isn't enough.
   - `commonFailures[]` — 2–4 things that commonly go wrong at this step and how they visually present.
   - `checkpointMinutes` — how long into this step should Sous prompt for a photo check?
3. Return strict JSON matching the Recipe schema (see below).

```json
{
  "title": "...",
  "steps": [
    {
      "stepId": "step-1",
      "instruction": "...",
      "expectedVisualState": "...",
      "commonFailures": ["...", "..."],
      "checkpointMinutes": 5
    }
  ]
}
```

Test against at least 3 very different recipe inputs:
- A bare-bones recipe (just ingredient list + vague steps)
- A detailed recipe with timing already included
- A recipe for something with very visual checkpoints (bread, caramel, steak)

✅ Done when: all 3 test inputs produce a valid structured recipe JSON with non-empty `expectedVisualState` and `commonFailures` per step.

---

### P1 — Assess prompt, first draft (1.5h)
**File:** `functions/src/lib/prompts/assess.js`

Export `buildAssessPrompt({ expectedVisualState, commonFailures, stepInstruction })` that returns a messages array for the OpenAI chat API (system + user with image). The prompt must:
- Show the model the step's expected visual state and common failure modes
- Ask it to respond in strict JSON matching the verdict schema
- Request specific, actionable advice — not generic cooking tips
- Include "respond in JSON only, no prose" instruction

Test directly with the OpenAI SDK — no server needed.

✅ Done when: function returns parseable verdict JSON with correct schema on a test call.

---

### P2 — Verdict schema validation (1h)
**File:** `functions/src/lib/prompts/verdict-schema.js`

Export `validateVerdict(raw)`. Parses the model output string. Throws a typed error if:
- JSON is malformed
- `verdict` is not one of `on_track | adjust | done`
- `advice` is missing or empty string

Person 2's /assess function calls this before returning to the client. If validation fails, the route retries once with a stricter instruction.

✅ Done when: unit tests pass for valid input, invalid verdict value, missing advice, and malformed JSON.

---

### P3 — Calibrate on demo recipes (2h)
**Depends on:** P1, recipe content from Person 4

Run the assess prompt manually against real or staged photos for each demo recipe step. For each step, test three scenarios:
- **Correct state** → should return `on_track`
- **Wrong state** (e.g. wet dough, pale steak) → should return `adjust` with specific advice
- **Done state** → should return `done`

Iterate on the prompt until verdicts are reliable. Document results in `docs/prompt-notes.md`.

Key demo scenarios to nail:
| Recipe | Wrong photo | Expected advice |
|--------|-------------|-----------------|
| Bread / Knead | Shaggy, tearing dough | "Still tearing — 3 more minutes, add flour" |
| Bread / Proof | Flat, no rise | "Under-proofed — check yeast, give it more time" |
| Steak / Sear | Pale grey bottom | "Pan too cold — pull steak, get pan smoking first" |
| Onions | Black edges | "Burned — lower heat, add splash of water" |

✅ Done when: 2+ recipes × 3 scenarios return correct verdicts consistently.

---

### P4 — Rescue prompt (1.5h)
**File:** `functions/src/lib/prompts/rescue.js`

Export `buildRescuePrompt({ stepInstruction, expectedVisualState, problem })`. Frame the model as an experienced chef diagnosing a specific problem. Provide the step context so advice is specific. Request a concise 2-4 sentence recovery path.

Test against: seized caramel, over-salted dish, bread that won't come together, overcooked steak.

✅ Done when: 4 test cases return specific, actionable recovery paths (not generic tips).

---

### P5 — Edge case hardening (1.5h)
**Depends on:** P1, P3

Stress-test the assess prompt:
- **Off-topic image** (a cat, a blank wall) → should gracefully say "can't assess this", not hallucinate a verdict
- **Blurry / dark image** → should note uncertainty, not confidently mislead
- **Step with no visual cue** (e.g. "season to taste") → shouldn't crash or hallucinate

Add a fallback rule: if `confidence < 0.4`, override to `adjust` with "Image isn't clear enough — try again with better lighting."

✅ Done when: all three edge cases return sensible non-hallucinated responses.

---

### P6 — Token and latency audit (1h)
**Depends on:** P3, P5

Measure: end-to-end latency for a typical assess call, and typical token counts. Target: ≤5s round-trip, ≤1500 tokens/call. If over:
- Truncate `commonFailures[]` to top 3
- Compress image to 768px before sending
- Add `max_tokens` cap on response

Document baseline and optimized numbers in `docs/prompt-notes.md`.

✅ Done when: assess round-trip is ≤5s on the demo device.

---

### P7 — Personalized recipe generation prompt (2h)
**File:** `functions/src/lib/prompts/personalize.js`

At the end of a session, Sous generates a personalized recipe based on everything it observed. Export `buildPersonalizePrompt({ originalRecipe, turns, adjustments })` where:
- `originalRecipe` — the base recipe with steps
- `turns` — array of `{ stepId, verdict, advice, actualDurationMinutes }` from the session
- `adjustments` — any manual notes the cook logged ("added extra flour", "oven ran hot")

The prompt should instruct the model to rewrite the recipe incorporating what it learned:
- Adjust step timings to match what actually worked for this cook
- Add personal notes where verdicts flagged issues ("your oven runs hot — check bread 5 min early")
- Keep the output as a clean, readable recipe (not a session report)

Returns: `{ title, personalizedSteps[], notes }` — strict JSON.

Test against a simulated session with a mix of `on_track` and `adjust` turns. The output should read like a recipe someone would actually save and reuse.

✅ Done when: function produces a clean personalized recipe JSON from a test session; timing adjustments and personal notes are present.

---

## GitHub Copilot tips for your stream

**Use Copilot for:**
- The JS scaffolding around prompts — function signatures, export statements, the messages array structure. Copilot will complete `{ role: 'system', content: ... }` patterns automatically.
- `validateVerdict()` and its unit tests — this is pure parsing/type-checking logic. Write the JSDoc comment describing the shape and Copilot will write most of the function.
- JSON schema validation boilerplate — if you use a validation library, Copilot will complete the schema definition.

**Don't rely on Copilot for:**
- The actual prompt text — Copilot does not know what bread dough looks like or what failure modes matter for a sear. Write the domain content yourself; use Copilot only for the surrounding JS structure.
- Prompt calibration (P3) — that's iterative judgment work. Run it yourself against the Azure OpenAI playground or a test script.

---

## Kickoff prompt (paste this to your AI assistant to get started)

> I'm doing prompt engineering for a hackathon app called Sous — a visual AI sous-chef. My job is to design the prompts that make it work. No app or server code involved — I work in `functions/src/lib/prompts/` and test directly against Azure OpenAI.
>
> Core prompts: (1) vision assessment — given a step's expected visual state and a photo, return a structured verdict (on_track / adjust / done) + advice in strict JSON; (2) rescue — given a problem description and step context, return a specific recovery path; (3) personalized recipe generation — given the original recipe + a session's turn history (verdicts, actual timings, adjustments), rewrite the recipe customized to this cook's kitchen.
>
> Start with Task P1: create `functions/src/lib/prompts/assess.js` that exports `buildAssessPrompt({ expectedVisualState, commonFailures, stepInstruction })` and returns a messages array for the OpenAI chat completions API.
