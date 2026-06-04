# Matt — QA + Demo

## Your job in one sentence
Own the demo — stage the photos, test every scenario end-to-end, rehearse the pitch, and make sure the team ships something that actually works in front of judges.

---

## Files you are allowed to touch
```
team/                             ← update docs as things change
docs/                             ← demo script, pitch notes
database/fixtures/                ← help Joanna with fixture content if needed
```

## Files you must never touch
```
app/                              ← Rosa's
functions/                        ← Akiva's
database/                         ← Joanna's (except fixtures/ if helping)
```

You don't write feature code. If you find a bug, report it to the right person — don't fix it yourself.

---

## Why this role matters

Every hackathon team has the same failure mode: everyone builds in isolation, the demo is the first time the full flow runs, and something breaks in front of the judges. Your job is to make sure that doesn't happen.

The demo is scripted around **pre-staged photos**, not live cooking. You source those photos. You rehearse the pitch. You catch the integration bugs nobody else sees because they're heads-down in their stream.

---

## Your tasks

### QA1 — Source demo photos (2h) ⚠️ start early — these are needed for prompt calibration too
**Output:** `database/fixtures/photos/`

Find or photograph the following. Lighting matters — bright, overhead, no shadows. Use your own kitchen or Google Images for staged shots.

| Recipe | Step | State | Filename |
|--------|------|-------|----------|
| Bread | Knead | Shaggy, tearing dough — under-kneaded | `bread-knead-bad.jpg` |
| Bread | Knead | Smooth, elastic ball — correctly kneaded | `bread-knead-good.jpg` |
| Bread | Proof | Flat, barely risen — under-proofed | `bread-proof-bad.jpg` |
| Bread | Proof | Domed, doubled in size — correctly proofed | `bread-proof-good.jpg` |
| Steak | Sear | Pale grey bottom — pan too cold | `steak-sear-bad.jpg` |
| Steak | Sear | Deep mahogany crust — correct sear | `steak-sear-good.jpg` |
| Onions | Caramelize | Black, burned edges — rescue scenario | `onions-burned.jpg` |

Share these with Akiva early — he needs them to calibrate the assess prompt (task A6).

✅ Done: 7 photos committed to `database/fixtures/photos/`, clearly named.

---

### QA2 — Write and share the demo script (1h)
**File:** `docs/demo-script.md`

Write out the exact 3-minute demo flow. Every sentence the presenter says. Every tap. Every photo shown. Time it.

Structure:
1. **30s — The problem.** Show a recipe. Ask "how do you know when the dough is right?" Nobody can answer.
2. **90s — Sous catches a mistake.** Navigate to Knead step. Load `bread-knead-bad.jpg`. Show verdict: `adjust` + advice. Then load `bread-knead-good.jpg`. Show verdict: `done`. That's the moment.
3. **45s — Rescue mode.** Steak sear step. Load `steak-sear-bad.jpg`. Show recovery advice.
4. **15s — Close.** "Every cooking mistake has a visual signature. Sous reads it. Recipes never could."

✅ Done: script committed and shared with the team.

---

### QA3 — Integration checkpoint (1h) — mid-session, coordinate with everyone
**Not a file — a meeting**

When Rosa has M1–M4 working and Akiva has A0 + A4 running, call a 20-minute sync:

1. Rosa's app points at Akiva's local server (swap `API_BASE_URL` to LAN IP, not localhost)
2. Joanna's Cosmos DB has at least one seeded recipe
3. Akiva's `func start` is running and reachable on the LAN
4. Run the 5-step flow: paste recipe → enrich → step viewer → camera → verdict

Checklist:
- [ ] `API_BASE_URL` is the LAN IP (not localhost) so Rosa's phone can reach it
- [ ] `local.settings.json` has Cosmos DB credentials
- [ ] Azure OpenAI credentials are in `local.settings.json`
- [ ] At least one fixture recipe is seeded in Cosmos DB
- [ ] Physical device (not just simulator) can hit the server

Log every bug you find. Assign to the right person.

✅ Done: at least one full end-to-end flow works on a physical device.

---

### QA4 — Test all 6 demo scenarios (1h)
**Depends on:** QA3 integration checkpoint passing

Load each demo photo into the app and verify the verdict:

| Photo | Expected verdict | Expected advice contains |
|-------|-----------------|--------------------------|
| `bread-knead-bad.jpg` | `adjust` | kneading / flour reference |
| `bread-knead-good.jpg` | `done` | proof / ready |
| `bread-proof-bad.jpg` | `adjust` | yeast / time reference |
| `bread-proof-good.jpg` | `on_track` | positive confirmation |
| `steak-sear-bad.jpg` | `adjust` | pan temperature reference |
| `steak-sear-good.jpg` | `done` | flip reference |

If a verdict is wrong, report to Akiva with the photo and the actual vs expected output.

✅ Done: all 6 scenarios return correct verdicts.

---

### QA5 — Test rescue mode (30min)

Type these problems into the rescue screen and verify the advice is specific and useful:

| Problem | Advice should mention |
|---------|----------------------|
| "My caramel seized and turned grainy" | water, heat, re-melt |
| "My bread dough won't come together" | hydration, flour, kneading |
| "My steak is grey all the way through" | overcooking, resting |
| "My onions are burning but still taste raw" | heat reduction, water, patience |

Report to Akiva if any return generic or unhelpful advice.

✅ Done: all 4 rescue scenarios return specific, actionable advice.

---

### QA6 — Rehearse the demo (30min)
**With the full team**

Run through the 3-minute demo script (QA2) from start to finish, on a real device, with someone playing the judge role. Time it. Note anything awkward. Make sure:

- App launches fast (no loading spinner for >3s)
- The verdict card is readable at arm's length
- The "wow moment" (Sous catches the bad dough) lands clearly
- The presenter can explain what's happening without looking at the screen

✅ Done: full demo rehearsed, timing confirmed, team confident.

---

## Coordination responsibilities

You're the only person watching the whole system — keep the team unblocked:

- **Morning:** make sure everyone knows what they're building today and has what they need (credentials, API contract, fixture files).
- **Mid-session:** run QA3 integration checkpoint. Don't let it slip to the last hour.
- **Throughout:** if Rosa is blocked waiting for Akiva's endpoint, escalate. If Akiva is blocked waiting for Joanna's db.ts, escalate. Silent blocks kill hackathons.
- **Final hour:** demo rehearsal only. No new code.
