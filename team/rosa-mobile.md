# Rosa — Mobile / UX

## Your job in one sentence
Build everything the user sees and touches in the Expo app.

---

## Files you are allowed to touch
```
app/                        ← everything in here is yours
```

## Files you must never touch
```
functions/                  ← Akiva's
database/                   ← Joanna's
team/                       ← shared docs, don't edit mid-session
docs/api-contract.md        ← read-only once agreed
```

If you think you need to change something outside `app/`, talk to the team first.

---

## Your API contract

Agree on this with Akiva at the start. Store `API_BASE_URL` in `app/src/constants/api.ts` and point it at `http://localhost:7071` for local dev.

```
POST /api/recipes/enrich
Body:    { "sourceText": "..." }  or  { "sourceUrl": "https://..." }
Returns: { "id": "...", "title": "...", "steps": [{ "stepId", "instruction",
           "expectedVisualState", "commonFailures", "checkpointMinutes" }] }

POST /api/assess
Body:    { "recipeId": "...", "stepId": "...", "imageBase64": "..." }
Returns: { "verdict": "on_track"|"adjust"|"done", "advice": "...", "confidence": 0.0–1.0 }

POST /api/rescue
Body:    { "recipeId": "...", "stepId": "...", "problem": "..." }
Returns: { "advice": "..." }

GET  /api/sessions/:id/recipe
Returns: { "personalizedRecipe": { "title", "personalizedSteps[]", "notes" } }
```

**Use a hardcoded mock enriched recipe until Akiva's server is running.** Don't block.

---

## Nav structure
Akiva already set the bottom tabs to **Chat** and **Recipes**.
- **Chat tab** — recipe input → active cooking session
- **Recipes tab** — past sessions / saved personalized recipes

---

## Your tasks

### M1 — Recipe input screen (1.5h)
**File:** `app/src/app/index.tsx` (or wire into Chat tab)

Large text area for pasting any recipe or a URL. "Let's Cook" button. On submit, POST to `/api/recipes/enrich`. Show a loading state: *"Sous is researching your recipe…"* On success, navigate to the step viewer with the enriched recipe. Start with a hardcoded mock enriched recipe — swap the real fetch in once Akiva's server is up.

✅ Done: user pastes a recipe, taps submit, sees loading, lands on step viewer.

---

### M2 — Step viewer screen (2h)
**File:** `app/src/app/recipe/[id].tsx`

Expo-router dynamic route. Show: step number, instruction text, and prominently the `expectedVisualState` ("what to look for"). Prev/Next navigation. "Check it" button at the bottom (triggers camera, M3). Pass `recipeId` and `stepId` through state.

✅ Done: can page through all steps; expected visual state is visible per step.

---

### M3 — Camera capture component (2h)
**File:** `app/src/components/camera-capture.tsx`

Install `expo-camera`. Modal camera view. On capture: resize to ≤1024px (`expo-image-manipulator`), encode as base64, POST to `/api/assess`. Spinner while waiting. On response, pass verdict to assessment card (M4).

✅ Done: tapping "Check it" opens camera, captures, returns a verdict object.

---

### M4 — Assessment result card (1.5h)
**File:** `app/src/components/assessment-card.tsx`

Receives verdict object. Renders:
- Status badge: 🟢 On Track / 🟡 Adjust / 🔵 Done — pull it now
- `advice` text large and readable
- "Continue" button to dismiss

Full overlay or bottom sheet. Must be readable with flour-covered hands.

✅ Done: all three verdict states render with hardcoded mock data.

---

### M5 — Wire full assess flow (1h)
**Files:** `app/src/app/recipe/[id].tsx`, `app/src/constants/api.ts`

Connect: "Check it" → CameraCapture → POST /assess → AssessmentCard. Loading state. Error state ("Could not reach server — try again").

✅ Done: full flow works end-to-end against Akiva's local server.

---

### M6 — Rescue screen (1.5h)
**File:** `app/src/app/rescue.tsx`

"Help, something went wrong" button in step viewer. Multi-line text input + Submit. POST to `/api/rescue`. Show advice using AssessmentCard layout.

✅ Done: user types a problem, submits, sees a specific recovery path.

---

### M7 — Checkpoint timer (2h)
**File:** `app/src/components/checkpoint-timer.tsx`

Each step has `checkpointMinutes`. When a step becomes active, start a countdown. When it fires: pulsing in-app banner — *"Time to check your [step name] — tap to snap a photo."* Tapping opens camera (M3) directly. Use `expo-notifications` for background notifications.

✅ Done: timer fires at `checkpointMinutes`; banner appears; tapping opens camera.

---

### M8 — Personalized recipe screen (1.5h)
**File:** `app/src/app/recipe-result.tsx`

After the final step, show a "Your Recipe" screen. Fetch `GET /api/sessions/:id/recipe`. Display as a clean recipe card with adjusted instructions and notes. Share button via `expo-sharing`.

✅ Done: screen displays a personalized recipe; share exports as text.

---

## GitHub Copilot tips

**Use heavily for:** `FlatList`, `expo-camera`, `expo-router` dynamic routes, `expo-notifications`, loading/error state patterns, bottom sheet layout boilerplate.

**Don't use for:** the mock recipe data shape — write that by hand from the API contract above so the shape is exact.

---

## Kickoff prompt

> I'm building the mobile frontend for a hackathon app called Sous — a visual AI sous-chef. Stack: Expo / React Native, expo-router, TypeScript. App is in `app/`.
>
> The bottom tabs are already set up as "Chat" and "Recipes". My job: recipe input screen (paste any recipe → AI enriches it), step-by-step viewer with expected visual states, checkpoint timer that prompts me when to take a photo, camera capture that POSTs to an API and gets a verdict, assessment result card, rescue screen, and personalized recipe screen at the end.
>
> The API runs at `http://localhost:7071`. I'll use a hardcoded mock until it's ready.
>
> Start with M1: `app/src/app/index.tsx` — recipe input screen with a text area, a "Let's Cook" button, and a loading state that says "Sous is researching your recipe…"
