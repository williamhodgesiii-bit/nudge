"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TagInput } from "@/components/TagInput";
import type { StudentProfile } from "@/lib/types";

export default function SettingsClient({
  profile,
  me,
}: {
  profile: StudentProfile;
  me: { id: string; email: string; full_name: string | null; plan: "free" | "premium"; city: string | null };
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [p, setP] = useState(profile);
  const [name, setName] = useState(me.full_name || "");
  const [plan, setPlan] = useState<"free" | "premium">(me.plan);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function set<K extends keyof StudentProfile>(k: K, v: StudentProfile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    await Promise.all([
      supabase.from("student_profiles").update({
        school: p.school, year: p.year, major: p.major, minor: p.minor,
        target_industries: p.target_industries, target_roles: p.target_roles,
        city: p.city, experience: p.experience, skills: p.skills, story: p.story,
        goal: p.goal, tone: p.tone, comfort: p.comfort,
        linkedin_url: p.linkedin_url, ai_summary: p.ai_summary, ai_strategy: p.ai_strategy,
        updated_at: new Date().toISOString(),
      }).eq("user_id", me.id),
      supabase.from("users").update({ full_name: name, plan }).eq("id", me.id),
    ]);
    setSaving(false);
    setFlash("Saved");
    setTimeout(() => setFlash(null), 1500);
    router.refresh();
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <header>
        <p className="chip">Settings</p>
        <h1 className="h-display text-3xl mt-3">Your account & profile</h1>
      </header>

      <section id="plan" className="card p-6">
        <h2 className="font-serif text-xl mb-1">Plan</h2>
        <p className="text-sm text-slate-600 mb-4">UI-only gating for now. Choose what you want to test.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => setPlan("free")} className={"text-left rounded-2xl border p-5 transition " + (plan === "free" ? "border-slate-900 bg-stone-100" : "border-stone-200 hover:border-slate-900")}>
            <p className="font-serif text-lg">Free</p>
            <p className="text-xs text-slate-500 mt-1">6 Discover matches, 5 saved drafts, basic AI.</p>
          </button>
          <button onClick={() => setPlan("premium")} className={"text-left rounded-2xl border p-5 transition " + (plan === "premium" ? "border-slate-900 bg-stone-100" : "border-stone-200 hover:border-slate-900")}>
            <p className="font-serif text-lg">Premium</p>
            <p className="text-xs text-slate-500 mt-1">Unlimited matches & drafts, priority AI.</p>
          </button>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Account</h2>
        <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input className="input bg-stone-100" value={me.email} disabled /></Field>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="School"><input className="input" value={p.school || ""} onChange={(e) => set("school", e.target.value)} /></Field>
          <Field label="Year"><input className="input" value={p.year || ""} onChange={(e) => set("year", e.target.value)} /></Field>
          <Field label="Major"><input className="input" value={p.major || ""} onChange={(e) => set("major", e.target.value)} /></Field>
          <Field label="Minor"><input className="input" value={p.minor || ""} onChange={(e) => set("minor", e.target.value)} /></Field>
          <Field label="City"><input className="input" value={p.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Tone">
            <select className="input" value={p.tone || ""} onChange={(e) => set("tone", e.target.value)}>
              <option value="warm-professional">Warm & professional</option>
              <option value="casual-curious">Casual & curious</option>
              <option value="direct-confident">Direct & confident</option>
              <option value="humble-thoughtful">Humble & thoughtful</option>
            </select>
          </Field>
        </div>
        <Field label="Target industries"><TagInput value={p.target_industries || []} onChange={(v) => set("target_industries", v)} /></Field>
        <Field label="Target roles"><TagInput value={p.target_roles || []} onChange={(v) => set("target_roles", v)} /></Field>
        <Field label="Skills"><TagInput value={p.skills || []} onChange={(v) => set("skills", v)} /></Field>
        <Field label="Goal"><textarea className="input min-h-[80px]" value={p.goal || ""} onChange={(e) => set("goal", e.target.value)} /></Field>
        <Field label="Story"><textarea className="input min-h-[120px]" value={p.story || ""} onChange={(e) => set("story", e.target.value)} /></Field>
        <Field label="Experience"><textarea className="input min-h-[120px]" value={p.experience || ""} onChange={(e) => set("experience", e.target.value)} /></Field>
        <Field label="LinkedIn URL"><input className="input" value={p.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} /></Field>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Strategy</h2>
        <Field label="Profile summary"><textarea className="input min-h-[120px]" value={p.ai_summary || ""} onChange={(e) => set("ai_summary", e.target.value)} /></Field>
        <Field label="Strategy snapshot"><textarea className="input min-h-[260px] font-mono text-[13px] leading-relaxed" value={p.ai_strategy || ""} onChange={(e) => set("ai_strategy", e.target.value)} /></Field>
      </section>

      <div className="flex justify-end gap-3">
        {flash && <span className="text-xs text-slate-500 self-center">{flash}</span>}
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
