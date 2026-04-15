"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STATUS_COLUMNS, type Contact, type RelationshipEntry, type Status } from "@/lib/types";

export default function TrackerClient({
  rels,
  contacts,
}: {
  rels: RelationshipEntry[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(rels);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RelationshipEntry | null>(null);

  const byContact = useMemo(() => {
    const m = new Map(contacts.map((c) => [c.id, c]));
    return m;
  }, [contacts]);

  async function move(id: string, status: Status) {
    setItems((arr) => arr.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("relationship_entries").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function saveNotes(rel: RelationshipEntry, notes: string, next: string) {
    setItems((arr) => arr.map((r) => (r.id === rel.id ? { ...r, notes, next_action_at: next || null } : r)));
    await supabase.from("relationship_entries").update({ notes, next_action_at: next || null }).eq("id", rel.id);
    setEditing(null);
  }

  async function remove(id: string) {
    setItems((arr) => arr.filter((r) => r.id !== id));
    await supabase.from("relationship_entries").delete().eq("id", id);
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="mb-6">
        <p className="chip">CRM</p>
        <h1 className="h-display text-3xl mt-3">Tracker</h1>
        <p className="text-slate-600 text-sm mt-1">Drag people forward as conversations move. Add notes when you remember a detail.</p>
      </header>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-xl">Nothing here yet.</p>
          <p className="text-slate-600 text-sm mt-1">Save someone in Discover to start tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUS_COLUMNS.map((col) => {
              const cards = items.filter((r) => r.status === col.key);
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
                      return (
                        <article
                          key={r.id}
                          draggable
                          onDragStart={() => setDragId(r.id)}
                          className="card p-4 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-tight">{c.full_name}</p>
                              <p className="text-xs text-slate-600">{c.title} · {c.company}</p>
                            </div>
                            <button className="text-slate-400 hover:text-slate-700 text-xs" onClick={() => remove(r.id)} aria-label="Remove">×</button>
                          </div>
                          {r.notes && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{r.notes}</p>}
                          {r.next_action_at && (
                            <p className="text-[11px] text-slate-500 mt-2">Next: {new Date(r.next_action_at).toLocaleDateString()}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <select
                              className="text-xs rounded-full border border-stone-200 bg-stone-100 px-2 py-1"
                              value={r.status}
                              onChange={(e) => move(r.id, e.target.value as Status)}
                            >
                              {STATUS_COLUMNS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                            <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => setEditing(r)}>Notes</button>
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

      {editing && (
        <NotesModal
          rel={editing}
          contact={byContact.get(editing.contact_id) || null}
          onClose={() => setEditing(null)}
          onSave={saveNotes}
        />
      )}
    </main>
  );
}

function NotesModal({
  rel,
  contact,
  onClose,
  onSave,
}: {
  rel: RelationshipEntry;
  contact: Contact | null;
  onClose: () => void;
  onSave: (r: RelationshipEntry, notes: string, next: string) => void;
}) {
  const [notes, setNotes] = useState(rel.notes || "");
  const [next, setNext] = useState(rel.next_action_at ? rel.next_action_at.slice(0, 10) : "");
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-serif text-xl">{contact?.full_name}</p>
        <p className="text-xs text-slate-500 mb-4">{contact?.title} · {contact?.company}</p>
        <label className="label">Notes</label>
        <textarea className="input min-h-[140px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you talk about? What did they suggest?" />
        <label className="label mt-3">Next action</label>
        <input className="input" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(rel, notes, next)}>Save</button>
        </div>
      </div>
    </div>
  );
}
