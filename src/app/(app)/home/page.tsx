import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_COLUMNS } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: rels }, { data: drafts }] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("relationship_entries").select("*").eq("user_id", user!.id),
    supabase.from("outreach_drafts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const counts: Record<string, number> = {};
  (rels || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  const firstName = (profile?.school || "").trim() ? profile?.school : "there";

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <section>
        <p className="chip">Your canvas</p>
        <h1 className="h-display text-4xl mt-3">Welcome back.</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          A calm place to plan, draft, and follow up. Pick something small for today.
        </p>
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl">Your strategy</h2>
            <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-900">Edit</Link>
          </div>
          <article className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
            {profile?.ai_strategy || "Your strategy snapshot will appear here."}
          </article>
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-serif text-xl mb-3">Profile summary</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{profile?.ai_summary || "Summary will appear here."}</p>
          </div>
          <div className="card p-6">
            <h2 className="font-serif text-xl mb-3">Today</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center justify-between">
                <span>Open Discover</span>
                <Link href="/discover" className="text-slate-900 hover:underline">Go →</Link>
              </li>
              <li className="flex items-center justify-between">
                <span>Draft one outreach</span>
                <Link href="/outreach" className="text-slate-900 hover:underline">Go →</Link>
              </li>
              <li className="flex items-center justify-between">
                <span>Move one card forward</span>
                <Link href="/tracker" className="text-slate-900 hover:underline">Go →</Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-3">
        {STATUS_COLUMNS.slice(0, 4).map((c) => (
          <div key={c.key} className="card p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className="font-serif text-3xl mt-1">{counts[c.key] || 0}</p>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl">Recent drafts</h2>
          <Link href="/outreach" className="text-xs text-slate-500 hover:text-slate-900">All →</Link>
        </div>
        {(drafts || []).length === 0 ? (
          <p className="text-sm text-slate-500">No drafts yet. Pick someone in Discover and Nudge will write a starter.</p>
        ) : (
          <ul className="divide-y divide-stone-200">
            {(drafts || []).map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700 line-clamp-1">{d.subject || d.body.slice(0, 80)}</p>
                  <p className="text-xs text-slate-500 capitalize">{d.channel.replace("_", " ")}</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
