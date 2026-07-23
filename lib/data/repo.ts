import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import type { GroupPost, Match, MatchKind, Message, User } from "../types";
import { matchUpdate, rowToMatch, rowToMessage, rowToPost, rowToUser } from "./map";

// All database access for matching and matches lives here. It runs with the
// service role because matching has to see the whole campus in order to rank
// it — callers are responsible for only ever returning a serialized, filtered
// view to the client (see lib/serialize.ts).

export async function allProfiles(): Promise<User[]> {
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("onboarded", true);
  return (data ?? []).map((r) => rowToUser(r, ""));
}

export async function profilesByIds(ids: string[]): Promise<Map<string, User>> {
  if (!ids.length) return new Map();
  const { data } = await supabaseAdmin().from("profiles").select("*").in("id", ids);
  return new Map((data ?? []).map((r) => [r.id as string, rowToUser(r, "")]));
}

export async function getProfile(id: string): Promise<User | null> {
  const { data } = await supabaseAdmin().from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? rowToUser(data, "") : null;
}

export async function myMatches(userId: string): Promise<Match[]> {
  const { data } = await supabaseAdmin()
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToMatch);
}

// Loads a match only if the requester is one of its two members.
export async function getMatchFor(matchId: string, userId: string): Promise<Match | null> {
  const { data } = await supabaseAdmin().from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!data) return null;
  const match = rowToMatch(data);
  return match.users.includes(userId) ? match : null;
}

export async function insertMatch(
  kind: MatchKind,
  a: string,
  b: string,
  extra: Record<string, unknown> = {},
): Promise<Match> {
  const { data, error } = await supabaseAdmin()
    .from("matches")
    .insert({ kind, user_a: a, user_b: b, ...extra })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToMatch(data);
}

export async function saveMatch(match: Match): Promise<void> {
  const { error } = await supabaseAdmin().from("matches").update(matchUpdate(match)).eq("id", match.id);
  if (error) throw new Error(error.message);
}

export async function findMatch(kind: MatchKind, a: string, b: string): Promise<Match | null> {
  const { data } = await supabaseAdmin()
    .from("matches")
    .select("*")
    .eq("kind", kind)
    .or(`and(user_a.eq.${a},user_b.eq.${b}),and(user_a.eq.${b},user_b.eq.${a})`)
    .maybeSingle();
  return data ? rowToMatch(data) : null;
}

export async function listMessages(matchId: string): Promise<Message[]> {
  const { data } = await supabaseAdmin()
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToMessage);
}

export async function lastMessages(matchIds: string[]): Promise<Map<string, Message>> {
  if (!matchIds.length) return new Map();
  const { data } = await supabaseAdmin()
    .from("messages")
    .select("*")
    .in("match_id", matchIds)
    .order("created_at", { ascending: true });
  const out = new Map<string, Message>();
  for (const row of data ?? []) out.set(row.match_id as string, rowToMessage(row));
  return out; // ascending order means the last write per match wins
}

export async function addMessage(matchId: string, sender: string, text: string): Promise<void> {
  const { error } = await supabaseAdmin().from("messages").insert({ match_id: matchId, sender, text });
  if (error) throw new Error(error.message);
}

export async function listPosts(kind: "mess" | "library"): Promise<GroupPost[]> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin()
    .from("posts")
    .select("*")
    .eq("kind", kind)
    .gt("created_at", dayAgo)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToPost);
}

export async function insertPost(
  kind: "mess" | "library",
  author: string,
  text: string,
  slotLabel: string,
  needed: number,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("posts")
    .insert({ kind, author, text, slot_label: slotLabel, needed });
  if (error) throw new Error(error.message);
}

export async function joinPost(postId: string, userId: string): Promise<void> {
  const { data } = await supabaseAdmin().from("posts").select("*").eq("id", postId).maybeSingle();
  if (!data) return;
  const post = rowToPost(data);
  if (post.by === userId || post.joined.includes(userId) || post.joined.length >= post.needed) return;
  await supabaseAdmin()
    .from("posts")
    .update({ joined: [...post.joined, userId] })
    .eq("id", postId);
}
