# Person 1 — Mobile / UX

## Your job in one sentence
Build the Expo app: everything the user sees and touches.

## You own
```
app/
```
That's it. You never touch `server/`, `database/`, or anything outside `app/`.

## You do NOT need to know
- How the Azure Functions backend works
- How Cosmos DB is set up
- How the vision prompt is engineered

You call one API endpoint. That's your only external dependency.

---

## Your API contract (agree on this at the start)

```
POST http://localhost:7071/api/recipes/enrich
Body:    { "sourceText": "..." }   or   { "sourceUrl": "https://..." }
Returns: { "id": "...", "title": "...", "steps": [{ "stepId", "instruction", "expectedVisualState", "commonFailures", "checkpointMinutes" }] }

POST http://localhost:7071/api/assess
Body:    { "recipeId": "...", "stepId": "...", "imageBase64": "..." }
Returns: { "verdict": "on_track" | "adjust" | "done", "advice": "...", "confidence": 0.0–1.0 }

POST http://localhost:7071/api/rescue
Body:    { "recipeId": "...", "stepId": "...", "problem": "..." }
Returns: { "advice": "..." }

GET  http://localhost:7071/api/sessions/:id/recipe
Returns: { personalizedRecipe: { title, personalizedSteps[], notes } }
```

Store the base URL in `app/src/constants/api.ts` as `API_BASE_URL`. **Use a hardcoded mock enriched recipe until the server is ready** — don't block on Person 2.

---

## Your tasks

### M1 — Recipe input screen (1.5h)
**File:** `app/src/app/index.tsx`

Replace the Expo boilerplate. This is the entry point: a large text area where the user pastes any recipe (or a URL), and a "Let's Cook" button. On submit, POST the raw text/URL to `/api/recipes/enrich`. Show a loading state ("Sous is researching your recipe…") while the server enriches it — this takes a few seconds. On success, navigate to the step viewer with the enriched recipe.

No fixed recipe list. Any recipe works.

✅ Done when: user can paste a recipe, tap submit, see a loading state, and land on the step viewer with structured steps.

---

### M2 — Step viewer screen (2h)
**File:** `app/src/app/recipe/[id].tsx`

Dynamic expo-router route. Show: step number, instruction text, and — prominently — the `expectedVisualState` ("what to look for"). Prev/Next navigation. "Check it" button at the bottom that will invoke the camera (M3).

✅ Done when: you can page through all steps; expected visual state is visible per step.

---

### M3 — Camera capture (2h)
**File:** `app/src/components/camera-capture.tsx`

Install `expo-camera`. Modal-style camera view. On capture: resize to ≤1024px with `expo-image-manipulator`, encode as base64, POST to `/api/assess`. Show a spinner while waiting. On response, dismiss camera and pass the verdict to the result card (M4).

✅ Done when: tapping "Check it" opens the camera, captures, and returns a verdict object.

---

### M4 — Assessment result card (1.5h)
**File:** `app/src/components/assessment-card.tsx`

Receives a verdict object and renders:
- Status badge: 🟢 "On Track" / 🟡 "Adjust" / 🔵 "Done — pull it now"
- `advice` text in large, readable font
- "Continue" button to dismiss

Make it visually distinct — full overlay or bottom sheet. It needs to be readable with flour-covered hands in a kitchen.

✅ Done when: all three verdict states render correctly with hardcoded mock data.

---

### M5 — Wire the full assess flow (1h)
**File:** `app/src/app/recipe/[id].tsx` (update), `app/src/constants/api.ts`

Connect: "Check it" → CameraCapture → POST /assess → AssessmentCard. Loading state, basic error state ("Could not reach server — try again"). Point `API_BASE_URL` at `http://localhost:7071`.

✅ Done when: full flow works end-to-end in the simulator against the local server.

---

### M6 — Rescue screen (1.5h)
**File:** `app/src/app/rescue.tsx`

"Help, something went wrong" button in the step viewer. Opens a screen with a multi-line text input and Submit. POST to `/api/rescue`. Display the returned advice using the AssessmentCard layout.

✅ Done when: user types a problem, submits, sees a recovery path.

---

### M7 — Checkpoint timer (2h)
**File:** `app/src/components/checkpoint-timer.tsx`

**This is a core UX feature — Sous tells you when to check, you don't have to remember.**

Each step has a `checkpointMinutes` value. When a step becomes active, start a countdown timer. When it fires, show a prominent prompt: *"Time to check your [proof / sear / caramel] — tap to snap a photo."* This should feel like a gentle nudge, not an alarm.

- Use `expo-notifications` for a local notification if the app is backgrounded.
- In-app: show a pulsing banner at the top of the step viewer.
- Tapping the banner opens the camera (M3) directly.

✅ Done when: timer fires at `checkpointMinutes`, in-app banner appears, tapping it opens the camera.

---

### M8 — Personalized recipe screen (1.5h)
**File:** `app/src/app/recipe-result.tsx`

At the end of a session (after the final step), show a "Your Recipe" screen. Fetch `GET /api/sessions/:id/recipe` — the server returns a personalized recipe generated from the session. Display it as a clean, readable recipe card with the adjusted instructions and timing notes.

Include a share button (use `expo-sharing` to export as text). This is the takeaway the user keeps.

✅ Done when: screen displays a personalized recipe fetched from the session; share button exports the text.

---

## Kickoff prompt (paste this to your AI assistant to get started)

> I'm building the mobile frontend for a hackathon app called Sous — a real-time visual AI sous-chef. The stack is Expo / React Native with expo-router and TypeScript. The app is in the `app/` directory.
>
> My job: recipe list screen, step-by-step viewer, checkpoint timer that prompts the user when it's time to take a photo, camera capture that POSTs to an API and gets back a verdict, assessment result card, rescue screen, and a personalized recipe screen shown at the end of a session.
>
> Key product behavior: Sous is proactive — it tells the user when to check their food based on a per-step timer (`checkpointMinutes`). The user doesn't tap "check it" on their own schedule; Sous prompts them.
>
> The API runs at `http://localhost:7071`. I should use mock data until it's ready. Start with Task M1: build `app/src/app/index.tsx` as a recipe list screen using a local MOCK_RECIPES constant.
