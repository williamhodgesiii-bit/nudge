"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/lib/types";

const FREE_LIMIT = 6;

export default function DiscoverClient({
  contacts,
  savedIds,
  plan,
}: {
  contacts: (Contact & { _score: number })[];
  savedIds: string[];
  plan: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set(savedIds));

  const industries = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.industry).filter(Boolean))) as string[],
    [contacts]
  );

  const filtered = contacts.filter((c) => {
    if (filter !== "all" && c.industry !== filter) return false;
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return [c.full_name, c.title, c.company, c.school, ...(c.tags || [])]
      .filter(Boolean).join(" ").toLowerCase().includes(t);
  });

  const visible = plan === "premium" ? filtered : filtered.slice(0, FREE_LIMIT);

  async function save(c: Contact) {
    const supa = supabase;
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    await supa.from("relationship_entries").upsert(
      { user_id: user.id, contact_id: c.id, status: "saved" },
      { onConflict: "user_id,contact_id" }
    );
    setSavedSet((s) => new Set([...s, c.id]));
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="chip">Chicago</p>
          <h1 className="h-display text-3xl mt-3">Discover</h1>
          <p className="text-slate-600 text-sm mt-1">Curated for your goals. Save anyone you'd actually reach out to.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input className="input w-64" placeholder="Search name, company, school…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-44" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All industries</option>
            {industries.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
      </header>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((c) => (
          <article key={c.id} className="card-lift p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg leading-tight text-slate-900">{c.full_name}</p>
                <p className="text-sm text-slate-600">{c.title}{c.company ? ` · ${c.company}` : ""}</p>
              </div>
              {c._score >= 3 && <span className="chip">Top match</span>}
            </div>
            {c.school && <p className="text-xs text-slate-500 mt-2">{c.school}</p>}
            {c.bio && <p className="text-sm text-slate-700 mt-3 line-clamp-3">{c.bio}</p>}
            {(c.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {(c.tags || []).slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            )}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-stone-200">
              {savedSet.has(c.id) ? (
                <span className="btn-secondary cursor-default">✓ Saved</span>
              ) : (
                <button className="btn-secondary" onClick={() => save(c)}>Save</button>
              )}
              <Link href={`/outreach?contact=${c.id}`} className="btn-primary">Draft outreach</Link>
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="btn-ghost ml-auto text-xs">LinkedIn ↗</a>
              )}
            </div>
          </article>
        ))}
      </section>

      {plan !== "premium" && filtered.length > FREE_LIMIT && (
        <div className="mt-8 card p-6 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg">{filtered.length - FREE_LIMIT} more matches available</p>
            <p className="text-sm text-slate-600">Free plan shows {FREE_LIMIT} top matches at a time.</p>
          </div>
          <Link href="/settings#plan" className="btn-primary">Upgrade to Premium</Link>
        </div>
      )}
    </main>
  );
}
