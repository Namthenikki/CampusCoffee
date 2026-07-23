"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { api, Avatar, Btn, Chip, Empty, Sheet, Token } from "@/components/ui";

type Candidate = {
  user: { id: string; name: string; branch: string | null; year: number | null; hostel: string; diet: string; messSlot: string; mealFreq: number };
  recurring: boolean;
  streak: number;
};
type Post = {
  id: string; text: string; slotLabel: string; needed: number;
  author: { name: string }; joinedUsers: { name: string }[]; mine: boolean; joinedByMe: boolean;
};

const SLOT_LABEL: Record<string, string> = { early: "Early bird", mid: "Regular", late: "Last call" };
const DIET_LABEL: Record<string, string> = { veg: "Veg", egg: "Egg", nonveg: "Non-veg" };

export default function Mess() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [needed, setNeeded] = useState(2);
  const [slotLabel, setSlotLabel] = useState("tonight's dinner");

  const load = useCallback(() => {
    api<{ candidates: Candidate[] }>("/api/mess/candidates").then(({ candidates }) => setCandidates(candidates)).catch(() => router.replace("/welcome"));
    api<{ posts: Post[] }>("/api/posts?kind=mess").then(({ posts }) => setPosts(posts)).catch(() => {});
  }, [router]);
  useEffect(load, [load]);

  const pair = async (userId: string) => {
    const { matchId } = await api<{ matchId: string }>("/api/mess/match", { method: "POST", body: JSON.stringify({ userId }) });
    router.push(`/chat/${matchId}`);
  };

  const createPost = async () => {
    if (!text.trim()) return;
    await api("/api/posts", { method: "POST", body: JSON.stringify({ kind: "mess", text, needed, slotLabel }) });
    setComposerOpen(false); setText("");
    load();
  };

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="serial">MESS PARTNER</p>
          <h1 className="font-display text-3xl font-bold">Table for two 🍛</h1>
        </div>
        <Btn small variant="ghost" onClick={() => setComposerOpen(true)}>+ Group</Btn>
      </header>
      <p className="-mt-2 text-sm text-khaki">Same timing, same block, compatible plates. Ranked by how often you both actually eat in mess.</p>

      {posts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">Open tables</h2>
          {posts.map((p) => (
            <Token key={p.id}>
              <p className="font-semibold">{p.text}</p>
              <p className="mt-0.5 text-xs text-khaki">
                {p.author.name} · {p.slotLabel} · {p.joinedUsers.length}/{p.needed} joined
                {p.joinedUsers.length > 0 && ` (${p.joinedUsers.map((j) => j.name).join(", ")})`}
              </p>
              {!p.mine && !p.joinedByMe && p.joinedUsers.length < p.needed && (
                <div className="mt-2">
                  <Btn small onClick={async () => { await api("/api/posts", { method: "POST", body: JSON.stringify({ join: p.id }) }); load(); }}>
                    Join table
                  </Btn>
                </div>
              )}
              {p.joinedByMe && <div className="mt-2"><Chip tone="matcha">You're in</Chip></div>}
            </Token>
          ))}
        </section>
      )}

      <h2 className="font-display text-lg font-bold">Your matches today</h2>
      {candidates === null ? (
        <p className="text-khaki">Brewing…</p>
      ) : candidates.length === 0 ? (
        <Empty title="No one at your table time yet" hint="Filters are strict on purpose — same slot, nearby block, compatible plate. Check back after class." />
      ) : (
        candidates.map((c, i) => (
          <Token key={c.user.id} className="pour-in" serial={undefined} stamp={c.recurring ? `${c.streak} MEALS` : undefined} stampTone="matcha">
            <div className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
              <Avatar name={c.user.name} />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">
                  {c.user.name}
                  <span className="ml-1 font-sans text-sm font-normal text-khaki">{c.user.branch} · Y{c.user.year}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip>{c.user.hostel}</Chip>
                  <Chip>{DIET_LABEL[c.user.diet]}</Chip>
                  <Chip>{SLOT_LABEL[c.user.messSlot]}</Chip>
                  <Chip tone="honey">{c.user.mealFreq} meals/wk</Chip>
                </div>
              </div>
              <Btn small onClick={() => pair(c.user.id)}>{c.recurring ? "Again?" : "Pair up"}</Btn>
            </div>
          </Token>
        ))
      )}

      <Sheet open={composerOpen} onClose={() => setComposerOpen(false)} title="Need more at your table?">
        <div className="flex flex-col gap-3">
          <input
            className="rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-khaki/60"
            placeholder='e.g. "Need 2 more for dinner, Block C mess"'
            maxLength={140}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex gap-2">
            {["tonight's dinner", "lunch tomorrow", "breakfast"].map((s) => (
              <button key={s} className="press" onClick={() => setSlotLabel(s)}>
                <Chip tone={slotLabel === s ? "honey" : "line"}>{s}</Chip>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-khaki">Seats needed</span>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="press" onClick={() => setNeeded(n)}>
                <Chip tone={needed === n ? "honey" : "line"}>{n}</Chip>
              </button>
            ))}
          </div>
          <Btn full onClick={createPost}>Post it</Btn>
        </div>
      </Sheet>
      <TabBar />
    </main>
  );
}
