import { createClient } from "@/lib/supabase/server";
import OutreachClient from "./OutreachClient";

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; goal?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: contacts }, { data: drafts }, { data: me }, { data: templates }, { data: sent }] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
    supabase.from("contacts").select("*").order("full_name"),
    supabase
      .from("outreach_drafts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.from("users").select("plan, full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("template_library").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("sent_messages").select("*").eq("user_id", user!.id).order("sent_at", { ascending: false }),
  ]);

  return (
    <OutreachClient
      profile={profile!}
      contacts={contacts || []}
      drafts={drafts || []}
      sent={sent || []}
      templates={templates || []}
      initialContactId={params.contact || null}
      initialGoal={params.goal || null}
      plan={me?.plan || "free"}
      fullName={me?.full_name || ""}
    />
  );
}
