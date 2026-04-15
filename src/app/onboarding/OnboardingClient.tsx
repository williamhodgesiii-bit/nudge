"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { TagInput } from "@/components/TagInput";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CITY } from "@/lib/cities";
import type { StudentProfile } from "@/lib/types";

type Form = Omit<StudentProfile, "id" | "user_id" | "ai_summary" | "ai_strategy" | "onboarding_complete">;

const STEPS = [
  "Basics",
  "Goals",
  "What you've done",
  "Your story",
  "LinkedIn & resume",
  "Strategy",
] as const;

const INDUSTRY_SUGGESTIONS = ["Technology", "Finance", "Consulting", "CPG", "Healthcare", "Venture Capital", "Media", "Public Sector", "Aviation", "Legal"];
const ROLE_SUGGESTIONS = ["Product Manager", "Software Engineer", "Investment Banking", "Consultant", "Data Scientist", "UX Designer", "Strategy", "Marketing"];
const SKILL_SUGGESTIONS = ["Python", "SQL", "Figma", "Excel", "Public speaking", "Research", "Writing", "Leadership"];

export default function OnboardingClient({
  initial,
  userId,
}: {
  initial: StudentProfile | null;
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(null);

  const [form, setForm] = useState<Form>({
    school: initial?.school ?? "",
    year: initial?.year ?? "",
    major: initial?.major ?? "",
    minor: initial?.minor ?? "",
    target_industries: initial?.target_industries ?? [],
    target_roles: initial?.target_roles ?? [],
    city: initial?.city ?? DEFAULT_CITY,
    experience: initial?.experience ?? "",
    skills: initial?.skills ?? [],
    story: initial?.story ?? "",
    goal: initial?.goal ?? "",
    tone: initial?.tone ?? "warm-professional",
    comfort: initial?.comfort ?? "medium",
    linkedin_url: initial?.linkedin_url ?? "",
    linkedin_paste: initial?.linkedin_paste ?? "",
  });

  const [aiSummary, setAiSummary] = useState(initial?.ai_summary ?? "");
  const [aiStrategy, setAiStrategy] = useState(initial?.ai_strategy ?? "");

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveDraft() {
    setSaving(true);
    await supabase.from("student_profiles").upsert(
      { user_id: userId, ...form, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setSaving(false);
  }

  async function next() {
    await saveDraft();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  async function uploadResume(file: File) {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
    if (error) { alert(error.message); return; }
    await supabase.from("resumes").insert({ user_id: userId, file_path: path, file_name: file.name });
    setResumeName(file.name);
  }

  async function generate() {
    setGenerating(true);
    await saveDraft();
    try {
      const [s, st] = await Promise.all([
        fetch("/api/ai/summary", { method: "POST", body: JSON.stringify(form) }).then((r) => r.json()),
        fetch("/api/ai/strategy", { method: "POST", body: JSON.stringify(form) }).then((r) => r.json()),
      ]);
      setAiSummary(s.text || "");
      setAiStrategy(st.text || "");
      await supabase
        .from("student_profiles")
        .update({ ai_summary: s.text || "", ai_strategy: st.text || "" })
        .eq("user_id", userId);
    } finally {
      setGenerating(false);
    }
  }

  async function finish() {
    setSaving(true);
    await supabase
      .from("student_profiles")
      .update({
        ai_summary: aiSummary,
        ai_strategy: aiStrategy,
        onboarding_complete: true,
      })
      .eq("user_id", userId);
    setSaving(false);
    router.push("/home");
    router.refresh();
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <p className="text-xs text-slate-500">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
      </header>

      <div className="max-w-3xl mx-auto px-6">
        <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
          <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="card p-8">
          {step === 0 && (
            <Step title="Let's start with the basics" sub="A quick sketch of where you are.">
              <Grid>
                <Field label="School">
                  <input className="input" value={form.school ?? ""} onChange={(e) => update("school", e.target.value)} placeholder="Northwestern University" />
                </Field>
                <Field label="Year">
                  <select className="input" value={form.year ?? ""} onChange={(e) => update("year", e.target.value)}>
                    <option value="">Select…</option>
                    {["Freshman","Sophomore","Junior","Senior","Graduate","Recent grad"].map(y => <option key={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Major">
                  <input className="input" value={form.major ?? ""} onChange={(e) => update("major", e.target.value)} placeholder="Economics" />
                </Field>
                <Field label="Minor (optional)">
                  <input className="input" value={form.minor ?? ""} onChange={(e) => update("minor", e.target.value)} placeholder="Computer Science" />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city ?? ""} onChange={(e) => update("city", e.target.value)} placeholder="Chicago" />
                </Field>
              </Grid>
            </Step>
          )}

          {step === 1 && (
            <Step title="Where are you headed?" sub="Pick what fits — you can edit later.">
              <Field label="Target industries">
                <TagInput value={form.target_industries} onChange={(v) => update("target_industries", v)} placeholder="Add an industry and press enter" suggestions={INDUSTRY_SUGGESTIONS} />
              </Field>
              <Field label="Target roles">
                <TagInput value={form.target_roles} onChange={(v) => update("target_roles", v)} placeholder="Add a role and press enter" suggestions={ROLE_SUGGESTIONS} />
              </Field>
              <Field label="What's your networking goal?">
                <textarea className="input min-h-[88px]" value={form.goal ?? ""} onChange={(e) => update("goal", e.target.value)} placeholder="e.g., land a summer PM internship in Chicago consumer tech" />
              </Field>
            </Step>
          )}

          {step === 2 && (
            <Step title="What you've done so far" sub="Clubs, projects, internships, research, leadership.">
              <Field label="Experience (free text)">
                <textarea className="input min-h-[160px]" value={form.experience ?? ""} onChange={(e) => update("experience", e.target.value)} placeholder="Built a fintech side project for first-gen students. Treasurer of Finance Club. Research with Prof. Lee on…" />
              </Field>
              <Field label="Skills">
                <TagInput value={form.skills} onChange={(v) => update("skills", v)} placeholder="Type a skill and press enter" suggestions={SKILL_SUGGESTIONS} />
              </Field>
            </Step>
          )}

          {step === 3 && (
            <Step title="The story behind it" sub="Helps Nudge write outreach that sounds like you.">
              <Field label="Short personal story / motivation">
                <textarea className="input min-h-[140px]" value={form.story ?? ""} onChange={(e) => update("story", e.target.value)} placeholder="I grew up watching my mom run a small business. That's why I care about consumer products that help everyday people." />
              </Field>
              <Grid>
                <Field label="Preferred tone">
                  <select className="input" value={form.tone ?? "warm-professional"} onChange={(e) => update("tone", e.target.value)}>
                    <option value="warm-professional">Warm & professional</option>
                    <option value="casual-curious">Casual & curious</option>
                    <option value="direct-confident">Direct & confident</option>
                    <option value="humble-thoughtful">Humble & thoughtful</option>
                  </select>
                </Field>
                <Field label="Outreach comfort">
                  <select className="input" value={form.comfort ?? "medium"} onChange={(e) => update("comfort", e.target.value)}>
                    <option value="low">Just starting — make it easy</option>
                    <option value="medium">A little nervous, willing</option>
                    <option value="high">Confident, ready to send</option>
                  </select>
                </Field>
              </Grid>
            </Step>
          )}

          {step === 4 && (
            <Step title="Your LinkedIn & resume" sub="Optional but makes drafts much sharper.">
              <Field label="LinkedIn URL">
                <input className="input" value={form.linkedin_url ?? ""} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/yourhandle" />
              </Field>
              <Field label="Or paste your LinkedIn 'About' / experience">
                <textarea className="input min-h-[120px]" value={form.linkedin_paste ?? ""} onChange={(e) => update("linkedin_paste", e.target.value)} placeholder="Paste anything you'd want a recruiter to read." />
              </Field>
              <Field label="Resume (PDF)">
                <label className="flex items-center justify-between border border-dashed border-stone-300 rounded-xl px-4 py-6 cursor-pointer hover:border-slate-900 transition">
                  <span className="text-sm text-slate-600">
                    {resumeName ?? "Click to upload PDF (stays private to you)"}
                  </span>
                  <span className="btn-secondary">Upload</span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadResume(f);
                  }} />
                </label>
              </Field>
            </Step>
          )}

          {step === 5 && (
            <Step title="Your networking strategy" sub="Editable. This becomes your home base.">
              {!aiStrategy && !aiSummary ? (
                <div className="text-center py-10">
                  <p className="text-slate-600 mb-6">We'll generate a profile summary and a short strategy snapshot from what you shared.</p>
                  <button className="btn-primary" onClick={generate} disabled={generating}>
                    {generating ? "Generating…" : "Generate my strategy"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <Field label="Profile summary">
                    <textarea className="input min-h-[120px]" value={aiSummary} onChange={(e) => setAiSummary(e.target.value)} />
                  </Field>
                  <Field label="Strategy snapshot">
                    <textarea className="input min-h-[260px] font-mono text-[13px] leading-relaxed" value={aiStrategy} onChange={(e) => setAiStrategy(e.target.value)} />
                  </Field>
                  <button className="btn-ghost text-xs" onClick={generate} disabled={generating}>
                    {generating ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
              )}
            </Step>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button className="btn-ghost" onClick={back} disabled={step === 0}>← Back</button>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-slate-500">Saving…</span>}
              {step < STEPS.length - 1 ? (
                <button className="btn-primary" onClick={next}>Continue</button>
              ) : (
                <button className="btn-primary" onClick={finish} disabled={!aiStrategy}>Enter Nudge →</button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="h-display text-2xl">{title}</h2>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}
