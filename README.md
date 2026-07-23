# Campus Coffee ☕

**Your campus, one token at a time.** Mess partners, study partners, blind coffee. No swiping. Ever.

Mobile-first web app for finding every kind of partner on an Indian college campus — built as a locked 4-feature MVP. Nothing else gets built until these four work and there's traction.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 — open on your phone via the Network URL for the real experience
```

First run seeds a demo campus of 24 students who chat back, accept brews, and show up to dates, so every flow is testable solo. Delete `data/db.json` and restart to reset the campus.

## The four features

| Feature | Hard filter (SQL-WHERE style) | Soft ranking | Signature mechanic |
|---|---|---|---|
| **Mess Partner** | Same timing slot, compatible diet, same/adjacent hostel block | Meal-frequency similarity, mild branch/year boost | Recurring pairs: 2+ shared meals pins that partner to the top ("Again?") |
| **Library Partner** | Real timetable free-slot overlap — zero overlap = excluded, not ranked low | Subject Jaccard (0.5) > study-style compat (0.3) > past sessions together (0.2), exam-mode stack | **No slot, no chat** — chat only exists after a slot both are free in is locked (validated server-side) |
| **Blind Coffee** | Opt-in queue, orientation, reliability threshold, never-rematch | Weighted per-user score (below) | Anonymous 48h window → private "meet?" → GPS checkin → selfie reveal with per-person blur |
| **Coffee Date** | Same engine as Blind | Same engine as Blind | Visible profiles; reuses the exact same checkin/reveal/reliability module |

## The matching engine ([lib/matching/](lib/matching/))

- **Dating score** = per-user weighted blend of interest Jaccard + branch/year proximity + prompt-answer token overlap + partner reliability.
- **Controlled randomness**: the daily pour samples 3 from the top 5 (softmax, T=0.15) — never a deterministic leaderboard, never a bad match.
- **Feedback loop** ([lib/matching/coffee.ts](lib/matching/coffee.ts) `applyOutcomeFeedback`): after every resolved date, each user's weight vector nudges toward the components that predicted a good date and away from ones that predicted a bad one. The formula is the starting point; outcomes are the lever.
- **Cold start**: under 100 users, thresholds relax and weights stay at defaults — filter + rank by whatever signal exists.
- **Reliability** ([lib/reliability.ts](lib/reliability.ts)): private EWMA of show-up outcomes. Honest cancels (2+ hrs notice, in-app) and inconclusive checkins are neutral. Never shown to anyone — it only quietly deprioritizes serial no-shows.

## The meet module ([lib/matchflow.ts](lib/matchflow.ts)) — shared, never duplicated

1. Both said yes → auto-suggested slot + partner cafe.
2. **Checkin**: both phones within ~30 m, foreground only, 10+ cumulative minutes → "MET". Under 10 min = inconclusive, never a strike.
3. **Reveal**: mutual "went well" → one shared selfie reveals both at once. Either "not a match" → optional solo pics, zero forced cooperation.
4. **Blur**: every photo starts blurred; each person toggles only their own face; applied at view time (server withholds the image data for blurred photos), never baked into a file.
5. Quiet dissolve: a "no" at any decision point just makes the token vanish for the other side — rejection is never notified.

## Privacy rules enforced in code

- Reliability + learned weights never serialize to any client — not even your own ([app/api/me/route.ts](app/api/me/route.ts)).
- Blind partners: first initial only, hostel hidden, branch only if they opted to show it ([lib/serialize.ts](lib/serialize.ts)).
- Blind-phase chat blocks links, handles, and phone numbers server-side ([app/api/chat/[matchId]/route.ts](app/api/chat/%5BmatchId%5D/route.ts)).
- Demo controls ([app/api/dev/route.ts](app/api/dev/route.ts)) refuse to touch matches between two real humans.

## Stack & deployment

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · zero other runtime deps.

Data lives in a JSON file behind one async repository module ([lib/db.ts](lib/db.ts)) — fine for local/demo. **Before deploying to Vercel** (serverless filesystems are ephemeral), swap that module's load/persist for a real database — Neon Postgres via the Vercel Marketplace is the intended path; every consumer already goes through the async interface, so the swap touches one file.

Production TODO before real students touch it (tracked, deliberate cuts from MVP):

- Email OTP verification for campus-domain signups (auth is honor-system today)
- Server-rendered blur (CSS/withheld-data blur is honest but belongs on the server behind signed URLs at scale)
- Push notifications, report/block, and moderation tooling
- Real-time chat transport (polling every 2.5 s is fine to ~hundreds of users)

Product psychology and mechanics rationale: [docs/PRODUCT.md](docs/PRODUCT.md)
