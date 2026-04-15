"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CHANNEL_LABELS,
  STATUS_COLUMNS,
  type Contact,
  type ContactNote,
  type RelationshipEntry,
  type SentMessage,
  type Status,
} from "@/lib/types";
import { dueFollowUps } from "@/lib/followups";

export default function TrackerClient({
  rels,
  contacts,
  sent,
  notes,
  initialFilter,
}: {
  rels: RelationshipEntry[];
  contacts: Contact[];
  sent: SentMessage[];
  notes: ContactNote[];
  initialFilter: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(rels);
  const [allNotes, setAllNotes] = useState(notes);
  const [dragId, setDragId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(initialFilter);

  const byContact = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const sentByContact = useMemo(() => {
    const m = new Map<string, SentMessage[]>();
    sent.forEach((s) => {
      const arr = m.get(s.contact_id) || [];
      arr.push(s);
      m.set(s.contact_id, arr);
    });
    return m;
  }, [sent]);
  const notesByContact = useMemo(() => {
    const m = new Map<string, ContactNote[]>();
    allNotes.forEach((n) => {
      const arr = m.get(n.contact_id) || [];
      arr.push(n);
      m.set(n.contact_id, arr);
    });
    return m;
  }, [allNotes]);

  const due = useMemo(() => new Set(dueFollowUps(items, sentByContact).map((r) => r.id)), [items, sentByContact]);

  const visibleItems = useMemo(() => {
    if (filter === "follow_up_due") return items.filter((r) => due.has(r.id));
    return items;
  }, [items, due, filter]);

  async function move(id: string, status: Status) {
    setItems((arr) => arr.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("relationship_entries").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function remove(id: string) {
    setItems((arr) => arr.filter((r) => r.id !== id));
    await supabase.from("relationship_entries").delete().eq("id", id);
  }

  async function updateRel(id: string, patch: Partial<RelationshipEntry>) {
    setItems((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.from("relationship_entries").update(patch).eq("id", id);
  }

  async function addNote(contactId: string, kind: "general" | "meeting", note: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !note.trim()) return;
    const { data } = await supabase.from("contact_notes").insert({
      user_id: user.id, contact_id: contactId, kind, note,
    }).select("*").single();
    if (data) setAllNotes((arr) => [data, ...arr]);
  }

  const openRel = openId ? items.find((r) => r.id === openId) : null;
  const openContact = openRel ? byContact.get(openRel.contact_id) : null;

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="chip">CRM</p>
          <h1 className="h-display text-3xl mt-3">Tracker</h1>
          <p className="text-slate-600 text-sm mt-1">Drag people forward. Click a card to open their timeline.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === "follow_up_due" ? null : "follow_up_due")}
            className={
              "btn " +
              (filter === "follow_up_due"
                ? "bg-slate-900 text-stone-50"
                : "btn-secondary")
            }
          >
            {filter === "follow_up_due" ? "Showing follow-ups due" : `Follow-ups due (${due.size})`}
          </button>
        </div>
      </header>

      {visibleItems.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-xl">{filter === "follow_up_due" ? "No follow-ups due." : "Nothing here yet."}</p>
          <p className="text-slate-600 text-sm mt-1">
            {filter === "follow_up_due" ? "Breathe." : "Save someone in Discover to start tracking."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUS_COLUMNS.map((col) => {
              const cards = visibleItems.filter((r) => r.status === col.key);
              return (
                <div
                  key={col.key}
                  className="w-72 shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId) { move(dragId, col.key); setDragId(null); } }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">{col.label}</p>
                    <span className="text-xs text-slate-500">{cards.length}</span>
                  </div>
                  <div className="space-y-3 min-h-[120px] rounded-2xl border border-dashed border-stone-200 p-2">
                    {cards.map((r) => {
                      const c = byContact.get(r.contact_id);
                      if (!c) return null;
                      const isDue = due.has(r.id);
                      const sentCount = sentByContact.get(c.id)?.length || 0;
                      return (
                        <article
                          key={r.id}
                          draggable
                          onDragStart={() => setDragId(r.id)}
                          onClick={() => setOpenId(r.id)}
                          className={
                            "card p-4 cursor-pointer active:cursor-grabbing " +
                            (isDue ? "ring-1 ring-slate-900" : "")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium leading-tight truncate">{c.full_name}</p>
                              <p className="text-xs text-slate-600 truncate">{c.title} · {c.company}</p>
                            </div>
                            <button className="text-slate-400 hover:text-slate-700 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); remove(r.id); }} aria-label="Remove">×</button>
                          </div>
                          {(r.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {r.tags.slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              {r.last_touch_at ? `Last touch ${daysAgo(r.last_touch_at)}` : "No touch yet"}
                              {sentCount > 0 && ` · ${sentCount} sent`}
                            </span>
                            {isDue && <span className="chip">Due</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openRel && openContact && (
        <ContactDrawer
          rel={openRel}
          contact={openContact}
          sent={sentByContact.get(openContact.id) || []}
          notes={notesByContact.get(openContact.id) || []}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => updateRel(openRel.id, patch)}
          onAddNote={(kind, n) => addNote(openContact.id, kind, n)}
          onMove={(s) => move(openRel.id, s)}
        />
      )}
    </main>
  );
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function ContactDrawer({
  rel,
  contact,
  sent,
  notes,
  onClose,
  onUpdate,
  onAddNote,
  onMove,
}: {
  rel: RelationshipEntry;
  contact: Contact;
  sent: SentMessage[];
  notes: ContactNote[];
  onClose: () => void;
  onUpdate: (p: Partial<RelationshipEntry>) => void;
  onAddNote: (kind: "general" | "meeting", n: string) => void;
  onMove: (s: Status) => void;
}) {
  const [tags, setTags] = useState<string[]>(rel.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [nextAction, setNextAction] = useState(rel.next_action_at ? rel.next_action_at.slice(0, 10) : "");
  const [noteDraft, setNoteDraft] = useState("");
  const [meetingDraft, setMeetingDraft] = useState("");

  function addTag() {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagDraft("");
    onUpdate({ tags: next });
  }
  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    onUpdate({ tags: next });
  }

  // Merge timeline: sent messages + notes + status-equivalent milestones
  const timeline = useMemo(() => {
    const items: { at: string; kind: "sent" | "note" | "meeting"; data: any }[] = [];
    sent.forEach((m) => items.push({ at: m.sent_at, kind: "sent", data: m }));
    notes.forEach((n) => items.push({ at: n.created_at, kind: n.kind === "meeting" ? "meeting" : "note", data: n }));
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [sent, notes]);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-stone-50 border-l border-stone-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-200 sticky top-0 bg-stone-50/90 backdrop-blur z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-2xl">{contact.full_name}</p>
              <p className="text-sm text-slate-600">{contact.title} · {contact.company}</p>
              {contact.school && <p className="text-xs text-slate-500 mt-1">{contact.school}{contact.city ? ` · ${contact.city}` : ""}</p>}
            </div>
            <button className="btn-ghost text-xs" onClick={onClose}>Close</button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <select
              className="text-xs rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5"
              value={rel.status}
              onChange={(e) => onMove(e.target.value as Status)}
            >
              {STATUS_COLUMNS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <Link href={`/outreach?contact=${contact.id}&goal=informational_interview`} className="btn-secondary text-xs">Draft outreach</Link>
            <Link href={`/outreach?contact=${contact.id}&goal=follow_up_no_reply`} className="btn-secondary text-xs">Generate follow-up</Link>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <p className="label">Tags</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                  <button className="text-slate-400 hover:text-slate-700" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add an industry / campaign / city tag"
              />
              <button className="btn-secondary" onClick={addTag}>Add</button>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="label">Last touch</p>
              <p className="text-sm text-slate-700">{rel.last_touch_at ? new Date(rel.last_touch_at).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <p className="label">Next follow-up</p>
              <input
                type="date"
                className="input"
                value={nextAction}
                onChange={(e) => { setNextAction(e.target.value); onUpdate({ next_action_at: e.target.value || null }); }}
              />
            </div>
          </section>

          <section>
            <p className="label">Add note</p>
            <textarea className="input min-h-[80px]" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Quick note — something they mentioned, a link they shared, etc." />
            <button className="btn-secondary mt-2" onClick={() => { if (noteDraft.trim()) { onAddNote("general", noteDraft); setNoteDraft(""); } }}>Save note</button>
          </section>

          <section>
            <p className="label">Add meeting notes</p>
            <textarea className="input min-h-[100px]" value={meetingDraft} onChange={(e) => setMeetingDraft(e.target.value)} placeholder="What did you cover? Key takeaway? Next step?" />
            <button className="btn-secondary mt-2" onClick={() => { if (meetingDraft.trim()) { onAddNote("meeting", meetingDraft); setMeetingDraft(""); } }}>Save meeting notes</button>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="label mb-0">Timeline</p>
              <span className="text-xs text-slate-500">{timeline.length} events</span>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet. Draft outreach in the Outreach tab.</p>
            ) : (
              <ol className="relative border-l border-stone-200 pl-5 space-y-5">
                {timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-stone-50" />
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{new Date(t.at).toLocaleString()}</span>
                      <span className="chip">
                        {t.kind === "sent" ? `Sent · ${CHANNEL_LABELS[(t.data as SentMessage).channel]}` : t.kind === "meeting" ? "Meeting" : "Note"}
                      </span>
                    </div>
                    {t.kind === "sent" ? (
                      <div className="mt-1">
                        {(t.data as SentMessage).subject && <p className="text-sm font-medium">{(t.data as SentMessage).subject}</p>}
                        <p className="text-sm text-slate-800 whitespace-pre-wrap mt-1">{(t.data as SentMessage).body}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap mt-1">{(t.data as ContactNote).note}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
