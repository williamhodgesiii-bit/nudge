import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const supabase = await createClient();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  // Decide redirect: onboarding vs home
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url));

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  const dest = profile?.onboarding_complete ? "/home" : "/onboarding";
  return NextResponse.redirect(new URL(dest, req.url));
}
