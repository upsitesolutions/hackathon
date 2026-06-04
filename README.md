# Sous 🧑‍🍳👁️

> **Working name — placeholder for the team.** An AI sous-chef that *watches* what you're cooking and tells you how to adapt — because a recipe is only a starting point.

---

## The Problem

Recipes are lossy. They're a flat, one-size-fits-all script for a process that is actually full of hidden variables — humidity, flour protein content, pan heat, oven calibration, how ripe the fruit is, how your "medium dice" compares to the author's.

Bread is the canonical example. Two people follow the identical recipe and get wildly different loaves, because the recipe can't see that your dough is too wet, that you under-proofed, or that your oven runs 20°F hot.

**Experienced chefs don't follow recipes — they read the food.** They adjust on the fly based on what the dough *looks* and *feels* like, how the onions are browning, whether the sauce has reduced enough. That sensory judgment is exactly the layer a written recipe throws away, and it's exactly the layer beginners lack.

## The Insight

The gap between a recipe and a good result is **sensory feedback + the experience to act on it.** You can't fix that with better-written instructions. You fix it by giving the cook an experienced eye looking over their shoulder.

## The Product

**Sous is a real-time visual sous-chef.** Point your phone at what you're cooking and Sous assesses the *actual state* of the food against what this step should look like — then tells you what to do about it.

Not "Step 4: knead for 10 minutes." Instead:

> *"Your dough still looks shaggy and is tearing — it needs ~3 more minutes of kneading. Add a tablespoon of flour first; it's reading a little wet."*

The recipe becomes a **scaffold**, not a script. Sous supplies the chef's intuition the recipe left out.

## How It Works

1. **Paste in any recipe.** A URL, a block of text, a photo of a cookbook page — whatever you have. Sous reads it and does the research: what should each step *look* like, what are the common failure modes, when should it check in with you?
2. **Sous enriches it.** In seconds, your raw recipe becomes a structured guide — each step annotated with the visual cue a chef would watch for, the timing, and what can go wrong.
3. **Sous runs the clock.** Once you start cooking, Sous prompts you at each checkpoint: *"Time to check your dough — snap a photo."* You don't have to remember to check in; Sous tells you when.
4. **Snap a photo.** Point your camera at what you're cooking. Sous assesses the real state vs. the intended state — consistency, color, browning, sear, reduction, size.
5. **Sous advises.** It confirms you're on track, or gives a concrete corrective action: lower the heat, add liquid, keep going, you're done — pull it now.
6. **Rescue mode.** Stuck? "My caramel seized," "the dough won't come together" → describe the problem, Sous diagnoses and gives a recovery path.
7. **Your personalized recipe.** At the end, Sous generates a recipe customized to *your* kitchen — adjusted for how your dough behaved, how long your oven actually took, what worked and what didn't. Next time you make it, start from your version.

## Core Features

### MVP (hackathon demo)
- 📥 **Any recipe in** — paste text, a URL, or a photo. Sous parses and enriches it automatically.
- 🔬 **Recipe research** — for each step, Sous derives the expected visual state, common failure modes, and checkpoint timing. No manual data entry.
- ⏱️ **Timer-driven checkpoints** — Sous prompts you when it's time to check. You don't have to remember.
- 📷 **Visual state check** — snap a photo; vision model evaluates it against the enriched step data.
- 🧭 **Adaptive guidance** — plain-language verdict (adjust / on track / done) with a specific corrective action.
- 🆘 **Rescue prompt** — describe what went wrong, get a recovery path.
- 📄 **Personalized recipe export** — at the end, Sous generates a recipe adjusted to your session: your timings, your adjustments, your kitchen.

### Stretch
- 🔁 Live streaming assessment (continuous, not snapshot).
- 🗣️ Hands-free voice in/out (your hands are covered in flour).
- 🧠 Learns your kitchen over time across multiple sessions — persistent calibration.
- 🌡️ Integrate smart thermometers; trigger checkpoints from temperature reads.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Expo / RN app  │ ──▶ │  Azure Functions v4  │ ──▶ │  Azure OpenAI    │
│  (app/)         │     │  HTTP triggers       │     │  GPT-4o vision   │
│  camera + UI    │ ◀── │  (functions/src/        │ ◀── │                  │
└─────────────────┘     │   functions/)        │     └──────────────────┘
                        └──────────┬───────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Cosmos DB       │
                          │  recipes, steps, │
                          │  sessions        │
                          └──────────────────┘
```

| Layer | Tech | Lives in |
|-------|------|----------|
| Mobile client | Expo / React Native, expo-router | `app/` |
| API | Azure Functions v4 (Node.js) | `functions/src/functions/` |
| Vision + reasoning | Azure OpenAI (GPT-4o vision) | `functions/src/lib/prompts/` |
| Data | Azure Cosmos DB (NoSQL, serverless) | `database/` + `functions/src/lib/db.ts` |

**Request flow:** app captures image + current step → HTTP trigger (`/assess`) → function loads step from Cosmos DB, builds vision prompt, calls GPT-4o → structured verdict (`on_track | adjust | done`) + advice returned → function writes session turn to Cosmos DB via output binding → app renders the guidance.

## Data Model (first pass)

- **RawInput** — what the user submitted: `{ sourceText?, sourceUrl? }`. Input to enrichment.
- **Recipe** — enriched output: title, ingredients, `steps[]`. Cached in Cosmos DB by content hash so the same recipe isn't re-enriched on reuse.
- **Step** — `{ instruction, expectedVisualState, commonFailures[], checkpointMinutes }`. Fully derived by the enrichment prompt — no hand-authoring required.
- **Session** — per-cook run: `{ recipeId, startedAt, turns[], adjustments[], personalizedRecipe }`.
- **Turn** — one checkpoint event: `{ stepId, promptedAt, verdict, advice, actualDurationMinutes }`.
- **Adjustment** — a mid-cook deviation: `{ stepId, type, description }` — e.g. "added extra flour", "oven ran hot".
- **PersonalizedRecipe** — generated at session end: modified step instructions, adjusted timings, notes for this cook's kitchen.
- **UserPrefs** *(stretch)* — persistent calibrations across sessions (oven bias, preferred doneness).

## Demo Plan (what we show the judges)

The demo is scripted around **pre-selected photos** — not live cooking. This keeps it reliable and lets us control the "wow" moment.

### The pitch in one sentence
> *"You show it a photo of what you're cooking, and it tells you exactly what's wrong and how to fix it — something no recipe has ever been able to do."*

### Demo script (~3 minutes)

**Scene 1 — the problem (30s)**
Show the bread step that says "knead until smooth and elastic." Show the recipe. Ask: "how do you know when it's right?" No recipe tells you.

**Scene 2 — Sous catches a mistake (90s)**
- Navigate to the "Knead" step in the app. The expected visual state is shown: *"smooth, elastic ball — passes the windowpane test."*
- Snap (or load) a photo of **under-kneaded dough** — shaggy, tearing, not smooth.
- Sous returns: `adjust` → *"Still tearing — needs 3 more minutes. It's also reading a little wet; add a tablespoon of flour before continuing."*
- Now load a **correctly kneaded** photo. Sous returns: `done` → *"Good windowpane stretch, smooth surface — you're ready to proof."*
- **That's the moment.** It saw what the recipe couldn't describe.

**Scene 3 — rescue mode (45s)**
- Switch to the steak recipe, "Sear" step.
- Snap a photo of a **pale, grey-bottomed steak** (classic cold-pan mistake).
- Sous returns: `adjust` → *"No sear crust — pan wasn't hot enough. Pull the steak, get the pan smoking, then go again. Pat the surface dry first."*

**Scene 4 — close (15s)**
Every cooking mistake has a visual signature. Sous reads it. Recipes never could.

### Photos to prepare in advance
Have these staged on a device or in the app before presenting:

| Recipe | Step | Photo type | Expected verdict |
|--------|------|------------|-----------------|
| Bread | Knead | Shaggy, tearing dough | `adjust` — keep kneading, add flour |
| Bread | Knead | Smooth, elastic ball | `done` — ready to proof |
| Bread | Proof | Flat, no rise | `adjust` — under-proofed or dead yeast |
| Bread | Proof | Domed, doubled | `on_track` — looking good |
| Steak | Sear | Pale grey bottom | `adjust` — pan too cold |
| Steak | Sear | Deep mahogany crust | `done` — flip it now |
| Onions | Caramelize | Black, burned edges | rescue → recovery advice |

## GitHub Copilot on this project

This project is built with GitHub Copilot as the primary coding assistant — fitting for a Microsoft hackathon where the demo itself uses Azure OpenAI.

| Stream | Copilot fit | What it's good for here |
|--------|------------|-------------------------|
| Person 2 — Azure Functions | ⭐⭐⭐ Best fit | `@azure/functions` v4 triggers, `@azure/cosmos` SDK patterns, `host.json` CORS, URL fetch + HTML strip |
| Person 4 — Cosmos DB client | ⭐⭐⭐ Strong | `@azure/cosmos` CRUD, retry/backoff boilerplate, consistent export patterns |
| Person 1 — Expo / RN | ⭐⭐ Strong | `FlatList`, `expo-camera`, `expo-router`, `expo-notifications` boilerplate |
| Person 3 — Prompts | ⭐ Scaffolding only | JS function scaffolding and `validateVerdict()` logic — **not** the prompt text itself, which requires cooking domain knowledge Copilot lacks |

**Pitch note for judges:** The Azure Functions backend and Cosmos DB layer were scaffolded with GitHub Copilot. The vision and enrichment models run on Azure OpenAI GPT-4o. The whole stack is Microsoft.

## Why Now

Multimodal models can finally judge *physical state from an image* well enough to give cooking-grade advice. The sensory layer that recipes always discarded is now machine-readable. That's the unlock.

---

## Team Structure

| Person | Role | Brief |
|--------|------|-------|
| **Rosa** | Mobile / UX | [team/rosa-mobile.md](team/rosa-mobile.md) |
| **Akiva** | Backend + Prompts | [team/akiva-backend-prompts.md](team/akiva-backend-prompts.md) |
| **Joanna** | Data / Cosmos DB | [team/joanna-data.md](team/joanna-data.md) |
| **Matt** | QA + Demo | [team/matt-qa-demo.md](team/matt-qa-demo.md) |

### File ownership — zero overlap

| File / directory | Owner | Everyone else |
|-----------------|-------|---------------|
| `app/` | Rosa | never touch |
| `functions/src/functions/` | Akiva | never touch |
| `functions/src/lib/openai-client.ts` | Akiva | never touch |
| `functions/src/lib/prompts/` | Akiva | never touch |
| `functions/package.json` + `package-lock.json` | Akiva | never touch — tell Akiva your deps at the start |
| `functions/local.settings.json` | each person keeps their own | gitignored — never commit |
| `functions/src/lib/db.ts` | Joanna | never touch |
| `database/` | Joanna | never touch |
| `docs/api-contract.md` | Akiva writes day 1 | read-only once agreed |
| `database/fixtures/photos/` | Matt | sources demo photos |

### The one interface to agree on before anyone writes code

30 minutes at the start. Agree on:

```json
POST /assess   { "recipeId": "...", "stepId": "...", "imageBase64": "..." }
               → { "verdict": "on_track|adjust|done", "advice": "...", "confidence": 0.0–1.0 }

POST /rescue   { "recipeId": "...", "stepId": "...", "problem": "..." }
               → { "advice": "..." }

GET  /recipes  → [{ "id": "...", "title": "...", "description": "..." }]
GET  /recipes/:id → { "id", "title", "steps": [{ "stepId", "instruction", "expectedVisualState", "commonFailures" }] }
```

Pin this in `docs/api-contract.md`. Persons 1 and 2 both build to it. No changes without a team check-in.

---

## Getting Started

```bash
# Mobile app
cd app && npm install && npx expo start

# Azure Functions backend (requires Azure Functions Core Tools)
npm install -g azure-functions-core-tools@4
cd server && npm install && func start
# Runs on http://localhost:7071
```

Copy `.env.example` to `.env` in `functions/` (as `local.settings.json`) and fill in:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `COSMOS_CONNECTION_STRING`

See `.github/agents/` for the Cosmos DB, React Native, and Node backend agent guides.
