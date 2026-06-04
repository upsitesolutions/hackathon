# Sous — Presentation Screens (Mobile)

3 full-screen swipeable slides before the demo. Tap to advance.

---

## Screen 1 — The Problem: Cost

**Headline:** Eating out costs 32% more than it did in 2020.

**Subtext:** For a lot of people, cooking at home isn't a hobby — it's the budget.

**Visual:** FRED chart — Consumer Price Index for Food Away from Home (BLS data via fred.stlouisfed.org). Use as full-bleed background with dark overlay. The post-2020 kink tells the story on its own.  
File: save the chart screenshot as `app/assets/images/cpi-food-away.png`.

---

## Screen 2 — The Problem: Recipes Don't Help

**Headline:** But cooking at home is hard.

**Subtext:** Recipes tell you *what* to do. They can't tell you if you're doing it right. "Caramelize onions 45 minutes" — but what does done actually look like?

**Photo:** Someone looking frustrated at a pan, or burned food on a stove.  
Search: "burned food on stove" or "cooking mistake kitchen" on Unsplash.

---

## Screen 3 — The Solution

**Headline:** Sous.

**Subtext:** Point your camera at what you're cooking. Get a real-time verdict. Never guess again.

**CTA button:** See it in action →  (navigates into the live app demo)

**Photo/treatment:** Clean dark background, app icon or logo centered. No busy photo — let the copy breathe.

---

## Notes for Rosa

- Swipe right to advance, no back navigation (it's a one-way funnel into the demo)
- Full bleed photo behind text with a dark overlay for readability
- "See it in action →" button should route to the recipe input screen (index.tsx)
- Suggested component: `app/src/app/pitch/[slide].tsx` or a simple state machine in `app/src/app/pitch.tsx`
- Only show pitch screens on first launch (or always, if this is a demo build)
