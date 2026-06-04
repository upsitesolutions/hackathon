
# SousAI — MVP Spec, Dev Plan & Tech Stack

**Working name:** SousAI · *the AI sous-chef that looks over your shoulder*
**Hackathon theme:** "I wish this thing existed"
**One-liner:** Snap a photo of whatever you're cooking, ask *"what did I do wrong?"* or *"what's next?"*, and get an instant answer from an AI that can actually see your pan.

---

## 1. The problem we're solving

Cooking goes wrong in the moment, not before or after.

- Recipes are **static**. They can't see that your onions are burning, your sauce broke, or your dough is too wet.
- Googling mid-cook is **slow and generic** — you're scrolling SEO blog posts with greasy hands while the pan smokes.
- Asking a friend means **waiting 10 minutes** for "looks fine?" — by then it's ruined.

There is no tool that does the one thing you actually need: **look at what's in front of you, right now, and tell you what to do.**

That gap is the wish. SousAI fills it with a multimodal AI that sees, understands the dish, and responds in seconds.

**Target wedge for the pitch:** home cooks who panic mid-recipe — beginners and improvers learning to trust themselves in the kitchen.

---

## 2. The core loop (this *is* the product)

```
START a cooking session  →  SNAP a photo  →  ASK ("what did I do wrong?" / "what's next?")  →  GET diagnosis + next step  →  repeat until done
```

Everything in the MVP exists to make this single loop feel fast, smart, and reliable in front of judges. If a feature doesn't serve this loop, it's a stretch goal.

---

## 3. MVP requirements

These are scoped to be **fully demoable by one person with one phone and no other users** — directly targeting the 25-point "working MVP" bucket.

### Must-have (MVP — build these first)

| # | Feature | Why it matters | Done = |
|---|---------|----------------|--------|
| M1 | Start a cooking session (enter or pick a dish) | Gives the AI context so answers are specific | User can name "risotto" and a session opens |
| M2 | Capture / upload a photo from the app | The core input; the thing nothing else does | Photo taken in-app, shown in the chat thread |
| M3 | Multimodal Q&A on the photo | The "magic moment" — AI sees the pan and answers | "What did I do wrong?" returns a specific, photo-grounded reply |
| M4 | Session memory / context | Follow-ups make sense ("now what?") | AI remembers the dish + prior photos in the session |
| M5 | Clean chat UI (photo + text bubbles) | UX & design bucket (15 pts); demos well | Scrollable thread, send button, loading state |
| M6 | Two quick-action buttons | Removes typing mid-cook | Tappable "What did I do wrong?" and "What's next?" |

### Should-have (if time allows after MVP is solid)

| # | Feature | Why |
|---|---------|-----|
| S1 | **Voice mode / "greasy-hands mode"** | Speak the question, hear the answer — huge demo wow factor, real differentiator. Azure AI Speech. |
| S2 | Step / progress tracking | AI tracks where you are in the dish; "next step" gets smarter |
| S3 | Inline timer when a step needs waiting | Practical, kitchen-real touch |

### Won't-have (explicitly out of scope for the hackathon)

- User accounts beyond a throwaway/anonymous ID (auth slows you down; demo as a single user)
- Saved recipe library / social feed
- Payments, onboarding flows, settings screens
- Android *and* iOS polish — pick one target device for the demo

> **Rule for the room:** if a task doesn't move M1–M6 forward, it waits. Protect the demo.

---

## 4. Tech stack (Azure-first + React Native)

Built to maximize the **Azure bonus points** and the **tech feasibility** bucket (10 pts), while staying realistically buildable in hackathon time.

### Architecture at a glance

```
[ React Native app (Expo) ]
        │  photo + question
        ▼
[ Azure Functions API  (Node/TypeScript) ]
        │            │                 │
        ▼            ▼                 ▼
[ Azure Blob ]  [ Azure OpenAI ]  [ Azure Cosmos DB ]
  store photo    GPT-4o vision      session + chat
                 (see + reason)      history
        ▲
        │ (optional, stretch)
[ Azure AI Speech ]  ←→  voice in / voice out
```

### Components

| Layer | Technology | Role | Why this choice |
|-------|-----------|------|-----------------|
| **Mobile app** | **React Native via Expo** | The cooking UI: camera, chat, quick-actions | Expo = camera + image picker + builds with almost no native setup. Fast at a hackathon. |
| **AI brain** | **Azure OpenAI Service — GPT-4o** | Multimodal: sees the photo, diagnoses, suggests next step, holds conversation | One model does vision *and* chat — the whole core loop. Core Azure product. |
| **Voice (stretch)** | **Azure AI Speech** | Speech-to-Text (ask hands-free) + Text-to-Speech (hear the answer) | "Greasy-hands mode." Big demo moment, still pure Azure. |
| **API / backend** | **Azure Functions** (Node + TypeScript) | Orchestrates: receive photo+question → call OpenAI → return answer; serves session state | Serverless, deploys in minutes, scales to zero. No server to babysit during a hackathon. |
| **Photo storage** | **Azure Blob Storage** | Stores uploaded cooking photos; passes URLs/bytes to GPT-4o | Cheap, simple, native pairing with the rest of Azure. |
| **Database** | **Azure Cosmos DB** | Cooking sessions, message history, dish context | Schemaless = fast to iterate; integrates cleanly with Functions. |
| **Auth (optional)** | **Microsoft Entra External ID (Azure AD B2C)** | Only if you want real sign-in | Skip for MVP — use an anonymous device ID. Add only if time is plentiful. |
| **Safety (stretch)** | **Azure AI Content Safety** | Filters inputs/outputs | One extra Azure service = more bonus points; quick to wire in. |

### Azure services checklist (for the "we used Azure" points)
- [x] Azure OpenAI Service (GPT-4o) — **core**
- [x] Azure Functions — **core**
- [x] Azure Blob Storage — **core**
- [x] Azure Cosmos DB — **core**
- [ ] Azure AI Speech — stretch (voice mode)
- [ ] Azure AI Content Safety — stretch
- [ ] Microsoft Entra External ID — only if you need real auth

> Wire up the four core services first. Each extra Azure service is a talking point in the pitch — but only if it works on the day.

### The one prompt that powers it all (starting point)

System prompt for the GPT-4o call (tune during the hack):

> *You are SousAI, an expert sous-chef. The user is mid-cook making **{dish}**. You can see their photo. Be concise and concrete. If something is wrong, say exactly what and the single fastest fix. If they ask what's next, give the next one or two steps only. Never dump the whole recipe. Assume they have greasy hands and 10 seconds to read.*

Send: the system prompt + the dish + the running message history + the latest photo (as image content) + the user's question.

---

## 5. Dev plan (timeboxed for a hackathon)

Assumes a ~24–36h hackathon and a small team. Adjust block sizes to your clock. **Order is the point: working core loop before anything pretty or extra.**

### Phase 0 — Setup (first 1–2 hrs) · *everyone*
- Create the Azure resource group; provision **OpenAI**, **Functions**, **Blob**, **Cosmos DB**. Grab keys/endpoints.
- Confirm GPT-4o vision access in your Azure OpenAI deployment (this is the one thing that can block you — verify it *now*).
- Scaffold the Expo app (`npx create-expo-app`) and a Functions project.
- Agree on the API contract (see Phase 1) so frontend + backend can build in parallel.

### Phase 1 — The vertical slice (next 4–6 hrs) · *split FE / BE*
Goal: one ugly-but-working pass through the whole loop.

**Backend track**
- `POST /session` → creates a session in Cosmos with the dish name, returns `sessionId`.
- `POST /message` → accepts `sessionId`, optional photo, and question. Uploads photo to Blob, calls GPT-4o with history + image, saves the exchange to Cosmos, returns the reply.

**Frontend track**
- Screen 1: enter dish → calls `/session`.
- Screen 2: chat thread + camera button + text input → calls `/message`, renders the reply.
- Use placeholder/mock responses until the backend is live, then swap in the real endpoint.

✅ **Checkpoint:** snap a real photo → get a real GPT-4o answer in the app. *This is your MVP. Everything after is upside.*

### Phase 2 — Make it good (next 4–6 hrs)
- Add the two quick-action buttons (M6).
- Polish the chat UI: photo bubbles, typing/loading indicator, error states (UX points).
- Tighten the system prompt so answers are short, specific, and photo-grounded.
- Handle the unhappy paths: no photo, bad photo, network error — don't let the demo crash.

### Phase 3 — Stretch + wow (remaining time, only if MVP is rock-solid)
- **Voice mode** (S1) with Azure AI Speech — the single highest-impact stretch.
- Step tracking / timer (S2/S3).
- Azure AI Content Safety pass.

### Phase 4 — Demo prep (last 2–3 hrs · *do not skip*)
- **Pre-stage 3 photos** of one dish: raw, mid-cook, and an "uh oh" moment. Rehearse the exact taps.
- Build a fallback: a short screen-recording of the working loop in case live wifi/camera fails.
- Write and rehearse the 90-second pitch (open with the "I wish this existed" story).
- Freeze the code. Stop building. Practice the demo twice.

### Parallelization cheat-sheet
- **Person A (backend):** Functions, OpenAI call, Cosmos, Blob.
- **Person B (frontend):** Expo app, camera, chat UI.
- **Person C (if you have one):** prompt tuning + demo dish, photos, and pitch deck.

---

## 6. Risks & how to dodge them

| Risk | Mitigation |
|------|-----------|
| GPT-4o vision not enabled on your Azure OpenAI deployment | **Verify in Phase 0.** It's the one true blocker. |
| Live camera/wifi fails on stage | Pre-staged photos + a backup screen recording. |
| Answers are vague/generic | Invest in the system prompt; force "what's wrong + one fix." |
| Scope creep eats the demo | M1–M6 only until they all work. Stretch goals are opt-in. |
| Spending hours on auth | Skip it. Anonymous device ID for the MVP. |

---

## 7. How this maps to the scoring rubric

| Criterion | Points | How SousAI scores |
|-----------|-------:|-------------------|
| Working MVP | 25 | Core loop works solo, one phone, one photo — fully demoable |
| Built with AI | 20 | You'll build it with AI tooling end-to-end |
| Startup potential | 20 | Clear wedge (panicked home cooks), universal pain, nothing good exists yet |
| UX & design | 15 | Visual, fast, fun; voice/greasy-hands mode as differentiator |
| Tech feasibility | 10 | Proven Azure services, realistic scope, one model does the heavy lifting |
| **Azure bonus** | + | Four core Azure services, up to three more as stretch |

---

*Next step: scaffold the repo and lock the Phase-0 Azure provisioning. Want me to generate the starter Functions code and the Expo screens?*
