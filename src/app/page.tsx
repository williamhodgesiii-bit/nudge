import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/sign-in" className="btn-ghost">Sign in</Link>
          <Link href="/sign-in" className="btn-primary">Get started</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="chip mb-5">Beta · Chicago</p>
          <h1 className="h-display text-5xl md:text-6xl leading-[1.05]">
            Networking that feels<br />less like a chore.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl">
            Nudge helps students find the right people, write outreach they'd
            actually send, and keep the conversation going — without the spam
            energy.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/sign-in" className="btn-primary">Start onboarding</Link>
            <Link href="#how" className="btn-secondary">How it works</Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Free for students. Premium unlocks higher AI limits and unlimited contacts.
          </p>
        </div>

        <div className="card p-6">
          <div className="rounded-xl border border-stone-200 bg-stone-100 p-5 mb-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Your strategy</p>
            <p className="mt-2 text-slate-800 leading-relaxed">
              Focus on Chicago product roles. Start with three Northwestern alums
              at consumer-tech companies. Lead with your fintech hackathon.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Suggested</p>
              <p className="font-medium mt-1">Maya Patel</p>
              <p className="text-sm text-slate-600">Sr. PM · Google</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Draft ready</p>
              <p className="font-medium mt-1">LinkedIn DM</p>
              <p className="text-sm text-slate-600">280 chars · warm tone</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { t: "Tell us about you", d: "School, goals, what you've built. Two minutes." },
          { t: "Get a strategy", d: "A short, real plan — not a generic template." },
          { t: "Reach out, your way", d: "Editable drafts, manual tracker. No automation, no spam." },
        ].map((x) => (
          <div key={x.t} className="card p-6">
            <p className="font-serif text-xl text-slate-900">{x.t}</p>
            <p className="mt-2 text-slate-600 text-sm">{x.d}</p>
          </div>
        ))}
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-slate-500 flex items-center justify-between border-t border-stone-200">
        <Logo />
        <p>© {new Date().getFullYear()} Nudge</p>
      </footer>
    </main>
  );
}
