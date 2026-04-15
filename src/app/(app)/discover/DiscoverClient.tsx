"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SENIORITY_LABELS, type Contact, type Seniority } from "@/lib/types";

const FREE_LIMIT = 6;

export default function DiscoverClient({
  contacts,
  savedIds,
  plan,
  profileSchool,
}: {
  contacts: (Contact & { _score: number })[];
  savedIds: string[];
  plan: string;
  profileSchool: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [role, setRole] = useState<string>("");
  const [seniority, setSeniority] = useState<Seniority | "all">("all");
  const [alumniOnly, setAlumniOnly] = useState(false);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set(savedIds));

  const industries = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.industry).filter(Boolean))) as string[],
    [contacts]
  );
  const cities = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.city).filter(Boolean))) as string[],
    [contacts]
  );

  const filtered = contacts.filter((c) => {
    if (industry !== "all" && c.industry !== industry) return false;
    if (city !== "all" && c.city !== city) return false;
    if (seniority !== "all" && c.seniority !== seniority) return false;
    if (role.trim() && !(c.title || "").toLowerCase().includes(role.toLowerCase())) return false;
    if (alumniOnly && profileSchool) {
      if (!c.school || c.school.toLowerCase() !== profileSchool.toLowerCase()) return false;
    }
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return [c.full_name, c.title, c.company, c.school, ...(c.tags || [])]
      .filter(Boolean).join(" ").toLowerCase().includes(t);
  });

  const visible = plan === "premium" ? filtered : filtered.slice(0, FREE_LIMIT);

  async function save(c: Contact) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("relationship_entries").upsert(
      { user_id: user.id, contact_id: c.id, status: "saved" },
      { onConflict: "user_id,contact_id" }
    );
    setSavedSet((s) => new Set([...s, c.id]));
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6">
        <p className="chip">Chicago</p>
        <h1 className="h-display text-3xl mt-3">Discover</h1>
        <p className="text-slate-600 text-sm mt-1">Filter, curate, and save anyone you'd actually reach out to.</p>
      </header>

      <section className="card p-4 mb-6 grid md:grid-cols-6 gap-3">
        <input className="input md:col-span-2" placeholder="Search name, company, school…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="all">All industries</option>
          {industries.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="input" placeholder="Role contains…" value={role} onChange={(e) => setRole(e.target.value)} />
        <select className="input" value={seniority} onChange={(e) => setSeniority(e.target.value as any)}>
          <option value="all">Any seniority</option>
          {(Object.keys(SENIORITY_LABELS) as Seniority[]).map((s) => (
            <option key={s} value={s}>{SENIORITY_LABELS[s]}</option>
          ))}
        </select>
        <label className="md:col-span-6 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={alumniOnly} onChange={(e) => setAlumniOnly(e.target.checked)} />
          Only show alumni of my school{profileSchool ? ` (${profileSchool})` : ""}
        </label>
      </section>

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
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              {c.school && <span>{c.school}</span>}
              {c.seniority && <span className="chip">{SENIORITY_LABELS[c.seniority]}</span>}
            </div>
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

      {visible.length === 0 && (
        <div className="card p-10 text-center mt-6">
          <p className="font-serif text-xl">No one matches those filters.</p>
          <p className="text-sm text-slate-500 mt-1">Try loosening a filter or searching by name.</p>
        </div>
      )}

      {plan !== "premium" && filtered.length > FREE_LIMIT && (
        <div className="mt-8 card p-6 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg">{filtered.length - FREE_LIMIT} more matches available</p>
            <p className="text-sm text-slate-600">Free plan shows {FREE_LIMIT} top matches.</p>
          </div>
          <Link href="/settings#plan" className="btn-primary">Upgrade to Premium</Link>
        </div>
      )}
    </main>
  );
}
