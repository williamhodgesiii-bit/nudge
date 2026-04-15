import { createClient } from "@/lib/supabase/server";
import DiscoverClient from "./DiscoverClient";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: contacts }, { data: rels }, { data: me }] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("contacts").select("*").order("full_name"),
    supabase.from("relationship_entries").select("contact_id, status").eq("user_id", user!.id),
    supabase.from("users").select("plan").eq("id", user!.id).maybeSingle(),
  ]);

  const scored = (contacts || []).map((c) => {
    let s = 0;
    const ind = (profile?.target_industries || []) as string[];
    const roles = (profile?.target_roles || []) as string[];
    if (c.industry && ind.includes(c.industry)) s += 3;
    if (roles.some((r) => (c.title || "").toLowerCase().includes(r.toLowerCase()))) s += 3;
    if (profile?.school && c.school && c.school.toLowerCase() === profile.school.toLowerCase()) s += 2;
    const skills = (profile?.skills || []) as string[];
    s += (c.tags || []).filter((t: string) => skills.includes(t)).length;
    return { ...c, _score: s };
  }).sort((a, b) => b._score - a._score);

  const savedIds = new Set((rels || []).map((r) => r.contact_id));

  return (
    <DiscoverClient
      contacts={scored}
      savedIds={Array.from(savedIds)}
      plan={me?.plan || "free"}
      profileSchool={profile?.school || null}
    />
  );
}
