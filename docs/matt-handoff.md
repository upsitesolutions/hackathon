# Matt QA/Demo — Session Handoff

## What's done

### QA1 — Demo photos ✅ committed to `database/fixtures/photos/`

| File | State | Source |
|------|-------|--------|
| `bread-knead-bad.jpg` | Shaggy mixed dough | Downloaded (King Arthur) |
| `bread-knead-good.jpg` | Smooth elastic ball | Downloaded (King Arthur) |
| `bread-proof-bad.jpg` | Underproofed loaf shape (has red X overlay from source) | Downloaded |
| `bread-proof-good.jpg` | Dough in containers, doubled | Downloaded (King Arthur) |
| `steak-sear-bad.jpg` | Pale wet steak in pan, no crust | Downloaded (Anova forum) |
| `steak-sear-good.jpg` | Deep mahogany crust, butter basting in pan | Downloaded |
| `onions-burned.jpg` | Diced black scorched onions | Real photo (Matt) |
| `onions-caramelize-early.jpg` | Just softened, pale gold | Real photo (Matt) |
| `onions-caramelize-done.jpg` | Deep amber, jammy | Real photo (Matt) |
| `onions-caramelize-burned.jpg` | Very dark, dry edges | Real photo (Matt) |

**Known issues:**
- `bread-proof-bad.jpg` has a red X graphic overlay from the source article — works for demo but not clean
- `bread-proof-good.jpg` shows containers, not a bowl — acceptable but not ideal
- Bread proof photos are both downloaded, not real kitchen shots

### Akiva needs to be pinged
- Photos are on `main` in `database/fixtures/photos/`
- He needs them to calibrate his A6 assess prompt
- **Ask him**: does the recipe flow support a caramelized onions step with early/done/burned states? If yes, the 3 `onions-caramelize-*` photos are ready. If no, they sit unused.

---

## Demo recipe decisions made this session

**Rule established:** Only use scenarios that are purely visual — if a chef would reach for a thermometer, it's the wrong scenario. Salmon is out.

**Recommended demo recipes:**
1. **Caramelized onions** — best progression story, real photos already in place
2. **Steak sear** — best single wow moment ("pan too cold, Maillard reaction didn't happen")
3. **Pasta sauce** — discussed as good third option (watery vs right consistency vs scorched), no photos yet

**Cut from demo:** Bread — too niche, visual differences subtle, photos are weakest set.

---

## What's still open

| Task | Status | Blocker |
|------|--------|---------|
| QA2 — demo script (`docs/demo-script.md`) | ❌ not started | None — do this next |
| QA3 — integration checkpoint | ❌ blocked | Rosa needs M1-M4, Akiva needs A0+A4 |
| QA4 — test 6 demo scenarios | ❌ blocked | QA3 |
| QA5 — test rescue mode | ❌ blocked | QA3 |
| QA6 — rehearse demo | ❌ blocked | QA3 |

**Next action: write the demo script (QA2).** It should be a 3-minute script covering the updated recipe choices (onions + steak, not bread). See `team/matt-qa-demo.md` for the structure.
