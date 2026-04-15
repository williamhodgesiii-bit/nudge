"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CHANNEL_LABELS, type Channel, type Contact, type OutreachDraft, type StudentProfile } from "@/lib/types";

const FREE_DRAFT_LIMIT = 5;

export default function OutreachClient({
  profile,
  contacts,
  drafts,
  initialContactId,
  plan,
  fullName,
}: {
  profile: StudentProfile;
  contacts: Contact[];
  drafts: OutreachDraft[];
  initialContactId: string | null;
  plan: string;
  fullName: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [contactId, setContactId] = useState<string | null>(initialContactId || contacts[0]?.id || null);
  const [channel, setChannel] = useState<Channel>("linkedin_dm");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const contact = contacts.find((c) => c.id === contactId) || null;
  const driverDrafts = drafts.length;
  const atLimit = plan !== "premium" && driverDrafts >= FREE_DRAFT_LIMIT;

  async function generate() {
    if (!contact) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        body: JSON.stringify({
          channel,
          notes,
          student: { ...profile, full_name: fullName },
          contact: {
            full_name: contact.full_name,
            title: contact.title,
            company: contact.company,
            school: contact.school,
            bio: contact.bio,
          },
        }),
      });
      const j = await res.json();
      setSubject(j.subject || "");
      setBody(j.body || "");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!contact || !body.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("outreach_drafts").insert({
      user_id: user.id,
      contact_id: contact.id,
      channel,
      subject: channel === "intro_email" ? subject : null,
      body,
      edited: true,
    });
    // ensure relationship entry exists, advance to 'ready'
    await supabase.from("relationship_entries").upsert(
      { user_id: user.id, contact_id: contact.id, status: "ready" },
      { onConflict: "user_id,contact_id" }
    );
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    router.refresh();
  }

  function copyAll() {
    const t = (channel === "intro_email" && subject ? `Subject: ${subject}\n\n` : "") + body;
    navigator.clipboard.writeText(t);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6">
        <p className="chip">Compose</p>
        <h1 className="h-display text-3xl mt-3">Outreach</h1>
        <p className="text-slate-600 text-sm mt-1">Pick a person, pick a channel, edit the draft until it sounds like you.</p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-5">
          <div className="card p-5">
            <p className="label">To</p>
            <select className="input" value={contactId ?? ""} onChange={(e) => setContactId(e.target.value)}>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} — {c.company}</option>
              ))}
            </select>
            {contact && (
              <div className="mt-4 text-sm">
                <p className="font-medium">{contact.full_name}</p>
                <p className="text-slate-600">{contact.title} · {contact.company}</p>
                {contact.school && <p className="text-xs text-slate-500 mt-1">{contact.school}</p>}
                {contact.bio && <p className="text-slate-700 mt-2 text-sm leading-relaxed">{contact.bio}</p>}
              </div>
            )}
          </div>

          <div className="card p-5">
            <p className="label">Channel</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={
                    "rounded-xl border px-3 py-2 text-sm transition " +
                    (channel === c
                      ? "bg-slate-900 text-stone-50 border-slate-900"
                      : "bg-stone-50 border-stone-200 text-slate-700 hover:border-slate-900")
                  }
                >
                  {CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="label">Anything to weave in?</p>
            <textarea className="input min-h-[88px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., I just read their post on payments fraud — want to mention it." />
          </div>
        </aside>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl">Draft</h2>
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={generate} disabled={generating || !contact || atLimit}>
                {generating ? "Generating…" : body ? "Regenerate" : "Generate"}
              </button>
              <button className="btn-ghost" onClick={copyAll} disabled={!body}>Copy</button>
              <button className="btn-primary" onClick={saveDraft} disabled={saving || !body}>
                {savedFlash ? "Saved ✓" : saving ? "Saving…" : "Save draft"}
              </button>
            </div>
          </div>

          {channel === "intro_email" && (
            <div className="mb-3">
              <label className="label">Subject</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Auto-generated, editable" />
            </div>
          )}
          <label className="label">Body</label>
          <textarea
            className="input min-h-[320px] leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Generated draft will appear here. Always editable. Nudge never sends for you."
          />

          {atLimit && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-100 p-4 flex items-center justify-between">
              <p className="text-sm text-slate-700">Free plan includes {FREE_DRAFT_LIMIT} saved drafts. Upgrade for unlimited.</p>
              <a href="/settings#plan" className="btn-primary">Upgrade</a>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">No auto-send. No LinkedIn automation. Copy when ready, send from your own account.</p>
        </section>
      </div>

      {drafts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl mb-3">Saved drafts</h2>
          <ul className="grid md:grid-cols-2 gap-4">
            {drafts.map((d) => {
              const c = contacts.find((x) => x.id === d.contact_id);
              return (
                <li key={d.id} className="card p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{CHANNEL_LABELS[d.channel]}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-medium mt-1">{c?.full_name || "—"}</p>
                  {d.subject && <p className="text-sm mt-1">{d.subject}</p>}
                  <p className="text-sm text-slate-700 mt-2 line-clamp-4 whitespace-pre-wrap">{d.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
