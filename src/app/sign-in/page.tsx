"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e.message || "Could not send link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-md card p-8">
        <Link href="/"><Logo className="mb-6" /></Link>
        <h1 className="h-display text-3xl">Welcome to Nudge</h1>
        <p className="text-slate-600 mt-2 text-sm">
          Sign in with your school email. We'll send a magic link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-100 p-4 text-sm text-slate-700">
            Check <strong>{email}</strong> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {err && <p className="text-sm text-red-700">{err}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500">
          By continuing you agree to keep outreach human and respectful.
        </p>
      </div>
    </main>
  );
}
