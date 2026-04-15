import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dueFollowUps, nextBestAction } from "@/lib/followups";
import type { RelationshipEntry, SentMessage, Status } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: rels },
    { data: drafts },
    { data: sent },
    { data: me },
  ] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("relationship_entries").select("*").eq("user_id", user!.id),
    supabase
      .from("outreach_drafts")
      .select("id, state, created_at, contact_id, channel, subject, body")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sent_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("sent_at", { ascending: false }),
    supabase.from("users").select("plan").eq("id", user!.id).maybeSingle(),
  ]);

  const typedRels = (rels || []) as RelationshipEntry[];
  const typedSent = (sent || []) as SentMessage[];

  const counts: Partial<Record<Status, number>> = {};
  typedRels.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  const sentByContact = new Map<string, SentMessage[]>();
  typedSent.forEach((m) => {
    const arr = sentByContact.get(m.contact_id) || [];
    arr.push(m);
    sentByContact.set(m.contact_id, arr);
  });

  const due = dueFollowUps(typedRels, sentByContact);

  const metrics = [
    { label: "Saved", val: counts.saved || 0 },
    { label: "Contacted", val: counts.contacted || 0 },
    { label: "Replies", val: counts.replied || 0 },
    { label: "Meetings", val: counts.meeting_scheduled || 0 },
    { label: "Follow-ups due", val: due.length },
  ];

  const draftsReady = (drafts || []).filter((d) => d.state !== "sent").length;

  const action = nextBestAction(counts, due.length, draftsReady, counts.saved || 0);

  // Simple weekly action list: top 3 cards by urgency
  const weekList: { title: string; sub: string; href: string }[] = [];
  if (due.length) weekList.push({ title: `${due.length} follow-up${due.length === 1 ? "" : "s"} due`, sub: "Send a light nudge", href: "/tracker?filter=follow_up_due" });
  if (draftsReady > 0) weekList.push({ title: `${draftsReady} draft${draftsReady === 1 ? "" : "s"} to review`, sub: "Edit and mark as sent", href: "/outreach" });
  if ((counts.saved || 0) > 0) weekList.push({ title: `${counts.saved} saved, no outreach yet`, sub: "Draft your first message", href: "/outreach" });
  if ((counts.replied || 0) > 0) weekList.push({ title: `${counts.replied} replied`, sub: "Book a time or send thank-you", href: "/tracker" });
  if (weekList.length === 0) weekList.push({ title: "Find 3 new people today", sub: "10 minutes in Discover", href: "/discover" });

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <section>
        <p className="chip">Your canvas</p>
        <h1 className="h-display text-4xl mt-3">Welcome back.</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          A calm place to plan, draft, and follow up. Here's where you stand.
        </p>
      </section>

      {/* Next best action */}
      <section className="card p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Next best action</p>
          <p className="font-serif text-2xl mt-1">{action.title}</p>
        </div>
        <Link href={action.href} className="btn-primary">{action.cta} →</Link>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">{m.label}</p>
            <p className="font-serif text-3xl mt-1">{m.val}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        {/* Strategy */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Your strategy</h2>
            <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-900">Edit</Link>
          </div>
          <article className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
            {profile?.ai_strategy || "Your strategy snapshot will appear here."}
          </article>
        </div>

        {/* This week action list */}
        <div className="card p-6">
          <h2 className="font-serif text-xl mb-3">This week</h2>
          <ul className="divide-y divide-stone-200">
            {weekList.map((w, i) => (
              <li key={i} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 truncate">{w.title}</p>
                  <p className="text-xs text-slate-500 truncate">{w.sub}</p>
                </div>
                <Link href={w.href} className="text-sm text-slate-900 hover:underline shrink-0">Go →</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        {/* Follow-up queue */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Follow-up queue</h2>
            <Link href="/tracker?filter=follow_up_due" className="text-xs text-slate-500 hover:text-slate-900">All →</Link>
          </div>
          {due.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing due. Breathe.</p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {due.slice(0, 5).map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-900">Contact · {r.last_touch_at ? `last touch ${new Date(r.last_touch_at).toLocaleDateString()}` : "no touch yet"}</p>
                    <p className="text-xs text-slate-500">Status: {r.status.replace(/_/g, " ")}</p>
                  </div>
                  <Link href={`/outreach?contact=${r.contact_id}&goal=follow_up_no_reply`} className="btn-secondary text-xs">Generate follow-up</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent sent */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Recently sent</h2>
            <span className="text-xs text-slate-500">{typedSent.length} total</span>
          </div>
          {typedSent.length === 0 ? (
            <p className="text-sm text-slate-500">Mark a draft as sent and it appears here.</p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {typedSent.slice(0, 5).map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">{m.channel.replace(/_/g, " ")}</span>
                    <span>{new Date(m.sent_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1 line-clamp-2">{m.subject || m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick analytics preview */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl">Outreach signal</h2>
          <span className={me?.plan === "premium" ? "pill-active" : "chip"}>
            {me?.plan === "premium" ? "Premium" : "Free"}
          </span>
        </div>
        <AnalyticsPreview sent={typedSent} rels={typedRels} premium={me?.plan === "premium"} />
      </section>
    </main>
  );
}

function AnalyticsPreview({
  sent,
  rels,
  premium,
}: {
  sent: SentMessage[];
  rels: RelationshipEntry[];
  premium: boolean;
}) {
  const total = sent.length;
  const replied = rels.filter((r) => ["replied", "meeting_scheduled", "completed"].includes(r.status)).length;
  const meetings = rels.filter((r) => r.status === "meeting_scheduled" || r.status === "completed").length;
  const replyRate = total ? Math.round((replied / total) * 100) : 0;

  // By channel
  const byChannel = new Map<string, { sent: number; replied: Set<string> }>();
  sent.forEach((m) => {
    const b = byChannel.get(m.channel) || { sent: 0, replied: new Set<string>() };
    b.sent += 1;
    byChannel.set(m.channel, b);
  });
  rels.forEach((r) => {
    if (!["replied", "meeting_scheduled", "completed"].includes(r.status)) return;
    // Credit first channel sent to that contact
    const first = sent.find((m) => m.contact_id === r.contact_id);
    if (!first) return;
    const b = byChannel.get(first.channel);
    if (b) b.replied.add(r.contact_id);
  });

  const rows = Array.from(byChannel.entries()).map(([channel, b]) => ({
    channel,
    sent: b.sent,
    rate: b.sent ? Math.round((b.replied.size / b.sent) * 100) : 0,
  }));

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <Stat label="Outreach sent" val={total} />
      <Stat label="Reply rate" val={`${replyRate}%`} />
      <Stat label="Meetings booked" val={meetings} />

      <div className="md:col-span-3">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Reply rate by channel</p>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.channel} className="flex items-center gap-3">
                <span className="text-sm w-32 capitalize">{r.channel.replace(/_/g, " ")}</span>
                <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div className="h-full bg-slate-900" style={{ width: `${r.rate}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">{r.rate}% · {r.sent} sent</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!premium && (
        <div className="md:col-span-3 mt-2 rounded-xl border border-stone-200 bg-stone-100 p-4 flex items-center justify-between">
          <p className="text-sm text-slate-700">Unlock reply rate by industry, timing insights, and unlimited history.</p>
          <Link href="/settings#plan" className="btn-primary">Upgrade</Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string | number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-100 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-serif text-3xl mt-1">{val}</p>
    </div>
  );
}
