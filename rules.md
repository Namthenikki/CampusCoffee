# Project rules

Standing constraints for Campus Coffee. These are decisions already made — treat
them as settled unless explicitly changed.

## Attribution

- **Never credit an AI assistant anywhere.** Not in commit messages, not as a
  co-author trailer, not in code comments, docs, the README, or the UI.
- Commits are authored by the project owner. No "Generated with", no
  "Co-Authored-By" lines, no tool names in the history.
- This applies to every file that ships and every commit that lands.

## Money

- **The project runs on ₹0.** No paid services, no trials that convert, no
  credit card anywhere, until there is real traction.
- Current stack, all free tier: Supabase (database, auth), Brevo (email in and
  out), Vercel (hosting). The only paid item ever bought is the domain.
- Before adding any dependency or service, check the free tier covers it —
  including the renewal price, not just the promo price.

## Scope

Four features. Nothing else gets built until these work and there's traction.

1. **Mess Partner** — hard filters on meal timing, diet, hostel proximity
2. **Library Partner** — real timetable overlap as a hard filter; no shared free
   slot means no match, not a low-ranked one
3. **Blind Coffee** — anonymous, time-boxed, then a private mutual decision
4. **Coffee Date** — the visible-profile version, sharing one checkin/reveal/
   reliability module with Blind Coffee. Never duplicate that module.

**No swiping, anywhere.** It's the product's whole differentiator.

## Privacy — these are load-bearing, not preferences

- **Reliability scores and learned matching weights never reach a client.** They
  live in a table with no client-readable policy. Not shown to the user either.
- **A "no" is never announced.** Declined matches dissolve quietly; the other
  side is never told they were rejected.
- **Photo blur is per-person, reversible, and applied at view time.** Each person
  controls only their own face. Never a joint toggle, never burned into a file.
- **Honest cancellations don't count against anyone.** Only silent no-shows do.
- Verification reads the sender address and nothing else. Message bodies are
  never stored.

## Security

- **Never commit secrets.** `.env.local` stays gitignored; keys go in Vercel's
  environment variables, never in the repo. Check `git status` before committing.
- **Never trust a `From` header.** Inbound verification requires the receiving
  edge's SPF/DKIM verdict to pass.
- Server-only credentials (service role, API keys) never appear in client
  components — `lib/supabase/admin.ts` is guarded with `server-only`.

## Design

- Palette is **Cherry & Cream**: warm porcelain ground, espresso ink, one cherry
  accent, butter for highlights, dill for success. Defined once in
  `app/globals.css`; change it there and the whole app follows.
- **No purple.** No generic AI-template aesthetics — no Inter/Roboto defaults,
  no purple-to-blue gradients, no cookie-cutter card layouts.
- Mobile first. Every screen is designed for a phone held one-handed at night.
