# Campus Coffee — Execution Plan (from research to launch)

> Companion to [ADDICTION-RESEARCH.md](ADDICTION-RESEARCH.md). Written 2026-07-23.
> Strategy in one line: **ship the locked 4-feature MVP wrapped in three research mechanics (9PM Drop, dyadic streaks, token share-cards), then launch as one synchronized campus event at semester start — freshers first.**

---

## Why this wins (the causal chain)

Latent demand (freshers arriving knowing nobody) → one-night saturation launch (density playbook) → 9PM Drop makes usage a daily ritual (appointment mechanic) → real meetups happen (GPS check-in) → streaks + passbook make pairs sticky (loss aversion + investment) → share-cards on Instagram stories recruit the rest of campus (sends-per-reach loop) → outcome ratings feed matching weights → matches get better → repeat.

Every link is a mechanic that's been proven at scale by someone else. Nothing in the chain is invented.

---

## Phase 1 — Finish the engine (now → ~Aug 10) · BUILD

The remaining migration steps, in order, unchanged from locked scope:

1. **OTP auth flow** (Supabase email OTP, domain appended from `NEXT_PUBLIC_EMAIL_DOMAIN`)
2. **Port data layer** from `lib/db.ts` JSON store to Supabase, one API route at a time
3. **RLS hardening** (`private_stats` stays server-only — already designed)
4. **Realtime chat** (Supabase Realtime)
5. **Storage for selfie reveals** (Supabase Storage + signed URLs)
6. **Seed script**, **deploy to Vercel Hobby**

**One addition to do NOW, not later: the `events` table.** Every screen-view/token-accept/check-in logged from day one. Costs an hour now; retention cohorts are impossible to reconstruct retroactively. This is how we'll know if the mechanics are working.

## Phase 2 — The addiction layer (parallel with late Phase 1) · BUILD

Not scope creep — packaging around the locked four features. Launch-critical items only:

| Mechanic | What it actually is technically | Effort |
|---|---|---|
| **9PM Drop** | Daily Vercel cron (Hobby supports daily crons, ₹0) that runs matching at 21:00 IST and releases all tokens at once + home-screen countdown component | Small — a scheduler around the existing matching engine |
| **Token expiry** | `expires_at` on tokens (72h; Blind Coffee 48h already locked) + "lapsing" visual state (torn perforation) | Small |
| **3-second home screen** | Open → tonight's tokens / countdown / open loops (pending "meet?", reveal timers) already rendered. No navigation to value | Medium — mostly layout |
| **Share cards** | `@vercel/og` (satori) image routes: founding serial, "token redeemed ☕", milestone cards. Anonymous-safe, story-sized, token aesthetic | Small–medium |
| **Web push** | PWA service worker + Web Push API (₹0, no FCM billing). Doctrine: curiosity-gap events from real humans only, max 1 streak warning/day, zero "we miss you" | Medium |

**Deferred to v1.1 (2 weeks post-launch, when pairs exist):** dyadic mess/library streaks (counter over completed GPS check-ins + flame UI + 1 freeze/month). **Deferred to end-of-sem:** passbook "Wrapped" recap. Passbook v1 (archive of stamped tokens) is nearly free since completed meetups are already stored — include at launch if time allows.

## Phase 3 — Pre-launch (2–3 weeks before launch night) · MARKET

1. **Instagram page + mockup posts first** (Bier's media-first validation). Post token designs, "coming to MUJ". Saves/DMs = demand proof before final polish.
2. **Waitlist with teeth** — one page + one Supabase table: OTP-locked signup (real students only, seeds the DB), **live counter + hostel leaderboard** ("B-Block: 84"), **numbered founding tokens** (#001–#500 shown on profile forever), referral = queue jump + day-one Blind Coffee access.
3. **Recruit 15–20 ambassadors** across hostels/years/societies. Currency (₹0): low serials, ambassador stamp on profile, early access, feature input. Jobs: seed launch-night queues, mess-table talk, story reposts, brutal feedback.

## Phase 4 — Launch night · THE EVENT

- **Date:** align with semester start / freshers' arrival — the week when "I have nobody to eat with" peaks campus-wide. (User confirms exact MUJ dates; freshers are the wedge — maximal latent demand, zero existing habits.)
- **Daytime:** ambassadors run mess-hour tables, paper tokens with QR — "redeem your first coffee."
- **21:00 — The First Drop.** Waitlist converts, founding tokens go live, first Blind Coffee queue fires. Everyone's first experience is simultaneous. This is the Saturn 50%-in-3-hours structure, deliberately.
- Every milestone that night emits a share card.

## Phase 5 — Post-launch operating cadence · ITERATE

- **Liquidity gating:** Blind Coffee stays locked until ~200 signups ("unlocks when 200 students join" — honest scarcity that is also a growth counter). A 4-person queue is a broken slot machine.
- **Weekly dashboard (from `events`):** time-to-first-accepted-token (<24h) · % matches reaching GPS check-in (THE number — it is word-of-mouth) · drop attendance 21:00–21:30 · repeat-booking rate · share-cards per meetup · D1/D7/D30 cohorts.
- **Targets:** D1 ≥50%, D7 ≥35%, D30 ≥30%, DAU/MAU ≥40% (Saturn-class; 6× dating-app average).
- **Weekly ambassador feedback loop** — Saturn called this their best learning channel.
- **Guardrails (load-bearing):** never fake anything; reliability stays private (DB-enforced); sessions end on designed highs; pitch = "the app that gets you off your phone and across the table."

---

## Decisions to lock

1. **9PM Drop becomes part of the locked scope** (recommended — it's the ritual that carries D1 retention).
2. **Launch date** — user picks the exact semester-start/freshers week.
3. Streaks v1.1 two weeks post-launch, Wrapped at end-of-sem.

## Immediate next actions (in order)

1. Build OTP auth flow (Phase 1, step 1)
2. Create `events` table + logging helper
3. Port first API route to Supabase
4. Waitlist page (can ship before the app itself — it collects demand while we build)
