import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { NavTabs } from "@/components/NavTabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { data: me } = await supabase
    .from("users")
    .select("plan, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-stone-50/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/home"><Logo /></Link>
          <NavTabs />
          <div className="flex items-center gap-3">
            <span className={me?.plan === "premium" ? "pill-active" : "chip"}>
              {me?.plan === "premium" ? "Premium" : "Free"}
            </span>
            <form action="/auth/sign-out" method="post">
              <button className="btn-ghost text-xs">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
