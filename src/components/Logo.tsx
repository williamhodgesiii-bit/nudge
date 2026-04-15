export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid place-items-center w-7 h-7 rounded-lg bg-slate-900 text-stone-50 font-serif text-sm">
        n
      </span>
      <span className="font-serif text-lg tracking-tight text-slate-900">Nudge</span>
    </div>
  );
}
