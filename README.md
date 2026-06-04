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

1. **Pick a recipe** (or paste/snap one in). Sous breaks it into steps, each with an *expected visual state*.
2. **Cook with the camera on.** At any step, capture a photo (or short stream) of your pan / bowl / board.
3. **Sous assesses** the real state vs. the intended state using a vision model — consistency, color, browning, sear, reduction, size.
4. **Sous advises.** It confirms you're on track, or gives a concrete corrective action: lower the heat, add liquid, keep going, you're done — pull it now.
5. **Rescue mode.** Stuck? "My caramel seized," "this is too salty," "the dough won't come together" → Sous diagnoses and gives a recovery path.

## Core Features

### MVP (hackathon demo)
- 📷 **Visual state check** — snap a photo at a step; vision model evaluates it against the step's target state.
- 🧭 **Adaptive guidance** — plain-language "adjust / continue / you're done" verdict with a specific corrective action.
- 📋 **Recipe scaffolding** — a recipe is parsed into steps, each annotated with the visual cue a chef would watch for.
- 🆘 **Rescue prompt** — describe what went wrong, get a recovery path.

### Stretch
- 🔁 Live streaming assessment (continuous, not snapshot).
- 🗣️ Hands-free voice in/out (your hands are covered in flour).
- 🧠 Learns your kitchen over time (your oven runs hot, you like things browner) — persisted per user.
- 🌡️ Pull in timers/temps and trigger them from visual cues.

## Architecture

Maps directly onto what's already scaffolded in this repo.

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Expo / RN app  │ ──▶ │  Node/Express    │ ──▶ │  Vision model    │
│  (app/)         │     │  API (server/)   │     │  (Azure OpenAI / │
│  camera + chat  │ ◀── │  orchestration   │ ◀── │   GPT-4o vision) │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Cosmos DB       │
                        │  recipes, steps, │
                        │  sessions, prefs │
                        └──────────────────┘
```

| Layer | Tech | Lives in |
|-------|------|----------|
| Mobile client | Expo / React Native, expo-router | `app/` |
| API / orchestration | Node + Express | `server/` |
| Vision + reasoning | Azure OpenAI (GPT-4o vision) | called from `server/` |
| Data | Azure Cosmos DB | `database/` |

**Request flow:** app captures image + current step → POST to server → server builds a prompt pairing the image with the step's expected visual state → vision model returns a structured verdict (`on_track | adjust | done`) + advice → server persists the session turn to Cosmos DB → app renders the guidance.

## Data Model (first pass)

- **Recipe** — title, ingredients, ordered `steps[]`.
- **Step** — instruction, `expectedVisualState` (what a chef watches for), `commonFailures[]`.
- **Session** — user, recipe, timeline of `{stepId, image, verdict, advice}` turns.
- **UserPrefs** *(stretch)* — learned calibrations (oven bias, doneness preference).

## Demo Plan (what we show the judges)

Make bread (or sear a steak — fast and visual). Deliberately go off-recipe — too-wet dough, or an under-heated pan — and let Sous **catch it and correct it on camera**. The "it saw the mistake a recipe never could" moment is the pitch.

## Why Now

Multimodal models can finally judge *physical state from an image* well enough to give cooking-grade advice. The sensory layer that recipes always discarded is now machine-readable. That's the unlock.

---

## Getting Started

Two independent npm packages:

```bash
# Mobile app
cd app && npm install && npx expo start

# API server
cd server && npm install && npm start
```

See `.github/agents/` for the Cosmos DB, React Native, and Node backend agent guides.
