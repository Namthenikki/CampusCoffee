import { nextSerial, uid } from "./db";
import { distanceM } from "./geo";
import { updateReliability } from "./reliability";
import { applyOutcomeFeedback } from "./matching/coffee";
import {
  BLIND_WINDOW_MS, CAFES, CHECKIN_RADIUS_M, CHECKIN_REQUIRED_MS,
  HONEST_CANCEL_NOTICE_MS, type DB, type Match, type MatchKind,
} from "./types";

// ONE shared module for checkin, decisions, reveal, and reliability — Blind
// Coffee and Coffee Date both call into this. Never duplicated.

export async function createMatch(db: DB, kind: MatchKind, a: string, b: string): Promise<Match> {
  const match: Match = {
    id: uid(),
    serial: await nextSerial(),
    kind,
    users: [a, b],
    state: "active",
    createdAt: Date.now(),
    expiresAt: kind === "blind" ? Date.now() + BLIND_WINDOW_MS : null,
    slot: null,
    studySlot: null,
    decisions: {},
    cancels: {},
    checkin: { accumMs: 0, lastCreditAt: 0, pings: {}, success: false },
    reveal: { photos: {}, outcome: null, votes: {} },
    mealCount: 0,
    lastMealAt: null,
  };
  db.matches.push(match);
  return match;
}

// Blind window rollover: active → decision at expiry.
export function tickMatch(match: Match): void {
  if (match.kind === "blind" && match.state === "active" && match.expiresAt && Date.now() >= match.expiresAt) {
    match.state = "decision";
  }
}

export function recordDecision(db: DB, match: Match, userId: string, yes: boolean): void {
  match.decisions[userId] = yes ? "yes" : "no";
  const [a, b] = match.users;
  const da = match.decisions[a];
  const dbn = match.decisions[b];
  if (da === "no" || dbn === "no") {
    // Quiet dissolve — the other side never receives a rejection notification.
    if (da && dbn) match.state = "dissolved";
    else if (match.decisions[userId] === "no") match.state = "dissolved";
    return;
  }
  if (da === "yes" && dbn === "yes") {
    // Auto-suggest a real slot + partner cafe: tomorrow evening.
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(17, 0, 0, 0);
    const cafe = CAFES[Math.floor(Math.random() * CAFES.length)];
    match.slot = {
      label: "Tomorrow, 5–7 pm",
      cafe,
      startsAt: start.getTime(),
      endsAt: start.getTime() + 2 * 60 * 60 * 1000,
    };
    match.state = "meet_scheduled";
  }
}

// GPS proximity checkin. Both phones within ~30m, credited only while both
// ping (app foregrounded — no background location). 10+ cumulative minutes
// marks the date successful; under that stays inconclusive, never a no-show.
export function checkinPing(db: DB, match: Match, userId: string, lat: number, lng: number): void {
  const now = Date.now();
  match.checkin.pings[userId] = { t: now, lat, lng };
  const [a, b] = match.users;
  const pa = match.checkin.pings[a];
  const pb = match.checkin.pings[b];
  if (!pa || !pb) return;
  const bothFresh = Math.abs(pa.t - pb.t) <= 30_000;
  const near = distanceM(pa.lat, pa.lng, pb.lat, pb.lng) <= CHECKIN_RADIUS_M;
  if (bothFresh && near) {
    const delta = match.checkin.lastCreditAt ? Math.min(now - match.checkin.lastCreditAt, 30_000) : 15_000;
    match.checkin.accumMs += delta;
    match.checkin.lastCreditAt = now;
    if (!match.checkin.success && match.checkin.accumMs >= CHECKIN_REQUIRED_MS) {
      match.checkin.success = true;
      match.state = "met";
      for (const id of match.users) {
        const u = db.users.find((x) => x.id === id);
        if (u) updateReliability(u, "showed");
      }
    }
  } else {
    match.checkin.lastCreditAt = 0;
  }
}

export function cancelMeet(db: DB, match: Match, userId: string): "honest" | "late" {
  const honest = !!match.slot && match.slot.startsAt - Date.now() >= HONEST_CANCEL_NOTICE_MS;
  match.cancels[userId] = { at: Date.now(), honest };
  match.state = "dissolved";
  const u = db.users.find((x) => x.id === userId);
  // Honest cancellations (2+ hrs notice, in-app) are neutral. Late cancels
  // count as a silent no-show would.
  if (u) updateReliability(u, honest ? "honest_cancel" : "noshow");
  return honest ? "honest" : "late";
}

// Reveal votes: both "went well" → shared-selfie mutual reveal path;
// either "not" → solo pics, no forced cooperation, tagged not-a-match.
export function recordRevealVote(db: DB, match: Match, userId: string, vote: "well" | "not"): void {
  match.reveal.votes[userId] = vote;
  const [a, b] = match.users;
  const va = match.reveal.votes[a];
  const vb = match.reveal.votes[b];
  if (!va || !vb) return;
  const wentWell = va === "well" && vb === "well";
  match.reveal.outcome = wentWell ? "match" : "not_match";
  // Feed the outcome back into both users' future matching weights.
  const ua = db.users.find((x) => x.id === a);
  const ub = db.users.find((x) => x.id === b);
  if (ua && ub) {
    applyOutcomeFeedback(ua, ub, wentWell);
    applyOutcomeFeedback(ub, ua, wentWell);
  }
}
