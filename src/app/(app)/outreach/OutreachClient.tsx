"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CHANNEL_LABELS,
  GOAL_LABELS,
  type Channel,
  type Contact,
  type DraftState,
  type Goal,
  type OutreachDraft,
  type SentMessage,
  type StudentProfile,
  type Template,
} from "@/lib/types";
import { BUILTIN_TEMPLATES, templateForGoal } from "@/lib/outreach-templates";

const FREE_DRAFT_LIMIT = 5;
const STATE_LABELS: Record<DraftState, string> = {
  draft: "Draft",
  ready: "Ready to send",
  sent: "Sent",
};

export default function OutreachClient({
  profile,
  contacts,
  drafts,
  sent,
  templates,
  initialContactId,
  initialGoal,
  plan,
  fullName,
}: {
  profile: StudentProfile;
  contacts: Contact[];
  drafts: OutreachDraft[];
  sent: SentMessage[];
  templates: Template[];
  initialContactId: string | null;
  initialGoal: string | null;
  plan: string;
  fullName: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isPremium = plan === "premium";

  const [contactId, setContactId] = useState<string | null>(initialContactId || contacts[0]?.id || null);
  const [goal, setGoal] = useState<Goal>(
    (initialGoal as Goal) || "informational_interview"
  );
  const [channel, setChannel] = useState<Channel>(
    templateForGoal((initialGoal as Goal) || "informational_interview")?.suggested_channel || "linkedin_dm"
  );
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [confidence, setConfidence] = useState<"humble" | "balanced" | "confident">("balanced");
  const [askType, setAskType] = useState<"15_min_chat" | "advice_only" | "referral" | "review_resume" | "no_ask">("15_min_chat");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<DraftState>("draft");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const contact = contacts.find((c) => c.id === contactId) || null;
  const sentCount = drafts.filter((d) => d.state === "sent").length;
  const activeDraftCount = drafts.filter((d) => d.state !== "sent").length;
  const atDraftLimit = !isPremium && activeDraftCount >= FREE_DRAFT_LIMIT && !draftId;

  const priorToContact = contactId
    ? sent.filter((m) => m.contact_id === contactId).slice(0, 3)
    : [];

  function loadTemplate(t: Template) {
    setChannel(t.channel);
    if (t.goal) setGoal(t.goal);
    setSubject(t.subject || "");
    setBody(t.body);
    setState("draft");
    setDraftId(null);
    setTemplatePickerOpen(false);
  }

  function loadDraft(d: OutreachDraft) {
    setContactId(d.contact_id);
    setChannel(d.channel);
    if (d.goal) setGoal(d.goal);
    setSubject(d.subject || "");
    setBody(d.body);
    setState(d.state);
    setDraftId(d.id);
  }

  async function generate() {
    if (!contact) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        body: JSON.stringify({
          channel,
          goal,
          length,
          confidence,
          ask_type: askType,
          notes,
          student: { ...profile, full_name: fullName },
          contact: {
            full_name: contact.full_name,
            title: contact.title,
            company: contact.company,
            school: contact.school,
            bio: contact.bio,
          },
          prior_messages: priorToContact.map((m) => ({
            channel: m.channel,
            body: m.body,
            sent_at: m.sent_at,
          })),
        }),
      });
      const j = await res.json();
      setSubject(j.subject || "");
      setBody(j.body || "");
      setState("draft");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft(nextState: DraftState = state) {
    if (!contact || !body.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      user_id: user.id,
      contact_id: contact.id,
      channel,
      goal,
      subject: channel === "intro_email" ? subject : null,
      body,
      edited: true,
      state: nextState,
    };
    if (draftId) {
      await supabase.from("outreach_drafts").update(payload).eq("id", draftId);
    } else {
      const { data } = await supabase.from("outreach_drafts").insert(payload).select("id").single();
      if (data) setDraftId(data.id);
    }
    // ensure relationship entry exists
    await supabase.from("relationship_entries").upsert(
      { user_id: user.id, contact_id: contact.id, status: nextState === "ready" ? "ready" : "saved" },
      { onConflict: "user_id,contact_id" }
    );
    setState(nextState);
    setSaving(false);
    setFlash("Saved");
    setTimeout(() => setFlash(null), 1500);
    router.refresh();
  }

  async function markAsSent() {
    if (!contact || !body.trim()) return;
    setSending(true);
    const res = await fetch("/api/outreach/send", {
      method: "POST",
      body: JSON.stringify({
        draft_id: draftId,
        contact_id: contact.id,
        channel,
        goal,
        subject: channel === "intro_email" ? subject : null,
        body,
      }),
    });
    const j = await res.json();
    setSending(false);
    if (j.ok) {
      setState("sent");
      setFlash("Marked as sent");
      setTimeout(() => setFlash(null), 1800);
      router.refresh();
    } else {
      alert(j.error || "Could not mark as sent.");
    }
  }

  async function saveAsTemplate() {
    if (!body.trim()) return;
    const name = prompt("Template name?");
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("template_library").insert({
      user_id: user.id,
      name,
      goal,
      channel,
      subject: channel === "intro_email" ? subject : null,
      body,
    });
    setFlash("Saved as template");
    setTimeout(() => setFlash(null), 1500);
    router.refresh();
  }

  function copyAll() {
    const t = (channel === "intro_email" && subject ? `Subject: ${subject}\n\n` : "") + body;
    navigator.clipboard.writeText(t);
    setFlash("Copied");
    setTimeout(() => setFlash(null), 1200);
  }

  function newDraft() {
    setDraftId(null);
    setBody("");
    setSubject("");
    setState("draft");
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="chip">Compose</p>
          <h1 className="h-display text-3xl mt-3">Outreach</h1>
          <p className="text-slate-600 text-sm mt-1">Pick a goal and a person. Nudge drafts. You edit, then mark it sent.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setTemplatePickerOpen(true)}>Templates</button>
          <button className="btn-ghost" onClick={newDraft}>+ New draft</button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        <aside className="space-y-5">
          <div className="card p-5">
            <p className="label">Goal</p>
            <select className="input" value={goal} onChange={(e) => {
              const g = e.target.value as Goal;
              setGoal(g);
              const t = templateForGoal(g);
              if (t) setChannel(t.suggested_channel);
            }}>
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <option key={g} value={g}>{GOAL_LABELS[g]}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">{templateForGoal(goal)?.description}</p>
          </div>

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

          <div className="card p-5 space-y-3">
            <p className="label">Personalization</p>
            <Row label="Length">
              <Segment value={length} onChange={setLength} options={[["short","Short"],["medium","Medium"],["long","Long"]]} />
            </Row>
            <Row label="Confidence">
              <Segment value={confidence} onChange={setConfidence} options={[["humble","Humble"],["balanced","Balanced"],["confident","Confident"]]} />
            </Row>
            <Row label="Ask">
              <select className="input py-1.5 text-sm" value={askType} onChange={(e) => setAskType(e.target.value as any)} disabled={!isPremium && askType !== "15_min_chat" && askType !== "no_ask"}>
                <option value="15_min_chat">15 min chat</option>
                <option value="advice_only">Advice only</option>
                <option value="no_ask">No ask</option>
                <option value="referral" disabled={!isPremium}>Referral {isPremium ? "" : "(Premium)"}</option>
                <option value="review_resume" disabled={!isPremium}>Resume review {isPremium ? "" : "(Premium)"}</option>
              </select>
            </Row>
          </div>

          <div className="card p-5">
            <p className="label">Anything to weave in?</p>
            <textarea className="input min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., reference their post on payments fraud." />
          </div>
        </aside>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl">Draft</h2>
              <StateBadge state={state} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="btn-secondary" onClick={generate} disabled={generating || !contact || atDraftLimit}>
                {generating ? "Generating…" : body ? "Regenerate" : "Generate"}
              </button>
              <button className="btn-ghost" onClick={copyAll} disabled={!body}>Copy</button>
              <button className="btn-ghost" onClick={saveAsTemplate} disabled={!body}>Save as template</button>
              {state !== "sent" && (
                <button className="btn-secondary" onClick={() => saveDraft(state === "ready" ? "draft" : "ready")} disabled={saving || !body}>
                  {state === "ready" ? "↶ Move to draft" : "Mark ready"}
                </button>
              )}
              {state !== "sent" ? (
                <button className="btn-primary" onClick={markAsSent} disabled={sending || !body}>
                  {sending ? "Logging…" : "Mark as sent"}
                </button>
              ) : (
                <span className="chip">Sent {drafts.find((d) => d.id === draftId)?.sent_at ? new Date(drafts.find((d) => d.id === draftId)!.sent_at!).toLocaleDateString() : ""}</span>
              )}
            </div>
          </div>

          {priorToContact.length > 0 && (
            <div className="mb-4 rounded-xl border border-stone-200 bg-stone-100 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700 mb-1">Already sent to this contact · {priorToContact.length}</p>
              <ul className="space-y-1">
                {priorToContact.map((m) => (
                  <li key={m.id} className="truncate">
                    <span className="capitalize">{m.channel.replace(/_/g, " ")}</span> · {new Date(m.sent_at).toLocaleDateString()} — {m.subject || m.body.slice(0, 80)}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            onChange={(e) => { setBody(e.target.value); if (state === "sent") setState("draft"); }}
            placeholder="Generated draft will appear here. Always editable. Nudge never sends for you."
          />

          {atDraftLimit && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-100 p-4 flex items-center justify-between">
              <p className="text-sm text-slate-700">Free plan includes {FREE_DRAFT_LIMIT} active drafts. Upgrade for unlimited.</p>
              <a href="/settings#plan" className="btn-primary">Upgrade</a>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <p>No auto-send. Copy when ready, send from your own account, then click "Mark as sent".</p>
            {flash && <span className="text-slate-700">{flash}</span>}
          </div>
        </section>
      </div>

      {/* Drafts grid: tabs by state */}
      <section className="mt-10">
        <h2 className="font-serif text-xl mb-3">Your drafts</h2>
        <DraftList drafts={drafts} contacts={contacts} onOpen={loadDraft} />
        {!isPremium && sentCount > 20 && (
          <p className="text-xs text-slate-500 mt-3">Free plan shows the most recent history. Upgrade for unlimited.</p>
        )}
      </section>

      {templatePickerOpen && (
        <TemplatePicker
          builtIn={BUILTIN_TEMPLATES}
          mine={templates}
          onClose={() => setTemplatePickerOpen(false)}
          onPick={(body, subject, ch, g) => {
            setBody(body);
            setSubject(subject || "");
            setChannel(ch);
            if (g) setGoal(g);
            setState("draft");
            setDraftId(null);
            setTemplatePickerOpen(false);
          }}
          onPickMine={loadTemplate}
        />
      )}
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500 w-24">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-full bg-stone-100 border border-stone-200 p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={
            "px-2.5 py-1 text-xs rounded-full transition " +
            (value === v ? "bg-slate-900 text-stone-50" : "text-slate-600 hover:text-slate-900")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StateBadge({ state }: { state: DraftState }) {
  const map: Record<DraftState, string> = {
    draft: "bg-stone-100 text-slate-700 border-stone-200",
    ready: "bg-stone-100 text-slate-900 border-slate-900",
    sent: "bg-slate-900 text-stone-50 border-slate-900",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${map[state]}`}>{STATE_LABELS[state]}</span>
  );
}

function DraftList({
  drafts,
  contacts,
  onOpen,
}: {
  drafts: OutreachDraft[];
  contacts: Contact[];
  onOpen: (d: OutreachDraft) => void;
}) {
  const [tab, setTab] = useState<DraftState | "all">("all");
  const list = tab === "all" ? drafts : drafts.filter((d) => d.state === tab);
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["all", "draft", "ready", "sent"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={
              "text-xs rounded-full border px-3 py-1 transition " +
              (tab === k ? "bg-slate-900 text-stone-50 border-slate-900" : "bg-stone-50 border-stone-200 text-slate-700")
            }
          >
            {k === "all" ? "All" : STATE_LABELS[k]} ({k === "all" ? drafts.length : drafts.filter((d) => d.state === k).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">Nothing here.</div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {list.map((d) => {
            const c = contacts.find((x) => x.id === d.contact_id);
            return (
              <li key={d.id}>
                <button onClick={() => onOpen(d)} className="card-lift w-full text-left p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">{CHANNEL_LABELS[d.channel]}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-medium">{c?.full_name || "—"}</p>
                    <StateBadge state={d.state} />
                  </div>
                  {d.subject && <p className="text-sm mt-1">{d.subject}</p>}
                  <p className="text-sm text-slate-700 mt-2 line-clamp-3 whitespace-pre-wrap">{d.body}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TemplatePicker({
  builtIn,
  mine,
  onClose,
  onPick,
  onPickMine,
}: {
  builtIn: typeof BUILTIN_TEMPLATES;
  mine: Template[];
  onClose: () => void;
  onPick: (body: string, subject: string | null, channel: Channel, goal: Goal) => void;
  onPickMine: (t: Template) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl">Templates</h3>
          <button className="btn-ghost text-xs" onClick={onClose}>Close</button>
        </div>

        <p className="label">Built-in by goal</p>
        <ul className="grid sm:grid-cols-2 gap-3 mb-6">
          {builtIn.map((t) => (
            <li key={t.goal}>
              <button
                onClick={() => onPick(t.scaffold, null, t.suggested_channel, t.goal)}
                className="w-full text-left rounded-xl border border-stone-200 bg-stone-50 p-4 hover:border-slate-900 transition"
              >
                <p className="font-medium">{t.label}</p>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
              </button>
            </li>
          ))}
        </ul>

        <p className="label">Your saved templates</p>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-500">Save a draft from the composer to reuse it later.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((t) => (
              <li key={t.id}>
                <button onClick={() => onPickMine(t)} className="w-full text-left rounded-xl border border-stone-200 bg-stone-50 p-3 hover:border-slate-900 transition">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{t.name}</p>
                    <span className="text-xs text-slate-500">{CHANNEL_LABELS[t.channel]}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.body}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
