import { createClient } from "@/lib/supabase/server";
import TrackerClient from "./TrackerClient";

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: rels }, { data: contacts }, { data: sent }, { data: notes }] = await Promise.all([
    supabase
      .from("relationship_entries")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false }),
    supabase.from("contacts").select("*"),
    supabase.from("sent_messages").select("*").eq("user_id", user!.id).order("sent_at", { ascending: false }),
    supabase.from("contact_notes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
  ]);

  return (
    <TrackerClient
      rels={rels || []}
      contacts={contacts || []}
      sent={sent || []}
      notes={notes || []}
      initialFilter={params.filter || null}
    />
  );
}
