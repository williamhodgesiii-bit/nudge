import { createClient } from "@/lib/supabase/server";
import TrackerClient from "./TrackerClient";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rels }, { data: contacts }] = await Promise.all([
    supabase.from("relationship_entries").select("*").eq("user_id", user!.id).order("updated_at", { ascending: false }),
    supabase.from("contacts").select("*"),
  ]);

  return <TrackerClient rels={rels || []} contacts={contacts || []} />;
}
