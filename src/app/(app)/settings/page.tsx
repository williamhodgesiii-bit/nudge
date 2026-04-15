import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: me }] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("users").select("*").eq("id", user!.id).maybeSingle(),
  ]);
  return <SettingsClient profile={profile!} me={me!} />;
}
