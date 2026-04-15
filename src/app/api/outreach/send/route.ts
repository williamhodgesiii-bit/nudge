import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mark a draft as sent. Does NOT send externally. It:
// 1. updates the draft row (state=sent, sent_at, final body/subject)
// 2. inserts an immutable sent_messages row
// 3. upserts relationship_entries (status=contacted, last_touch_at=now)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { draft_id, contact_id, channel, goal, subject, body } = await req.json();
  if (!contact_id || !body || !channel) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Persist the final text on the draft (or create one if none)
  let finalDraftId = draft_id as string | null;
  if (finalDraftId) {
    await supabase
      .from("outreach_drafts")
      .update({ state: "sent", sent_at: now, subject, body, goal: goal ?? null, edited: true })
      .eq("id", finalDraftId)
      .eq("user_id", user.id);
  } else {
    const { data } = await supabase
      .from("outreach_drafts")
      .insert({
        user_id: user.id,
        contact_id,
        channel,
        goal: goal ?? null,
        subject,
        body,
        edited: true,
        state: "sent",
        sent_at: now,
      })
      .select("id")
      .single();
    finalDraftId = data?.id ?? null;
  }

  // Immutable sent record
  await supabase.from("sent_messages").insert({
    user_id: user.id,
    contact_id,
    draft_id: finalDraftId,
    channel,
    goal: goal ?? null,
    subject: subject ?? null,
    body,
    sent_at: now,
  });

  // Advance relationship entry
  const { data: existing } = await supabase
    .from("relationship_entries")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("contact_id", contact_id)
    .maybeSingle();

  const shouldAdvance = !existing || ["saved", "ready"].includes(existing.status);
  const nextStatus = shouldAdvance ? "contacted" : existing?.status || "contacted";

  // Default follow-up 5 days out (only when advancing to contacted)
  const nextFollowUp =
    shouldAdvance ? new Date(Date.now() + 5 * 86400000).toISOString() : undefined;

  await supabase.from("relationship_entries").upsert(
    {
      user_id: user.id,
      contact_id,
      status: nextStatus,
      last_touch_at: now,
      ...(nextFollowUp ? { next_action_at: nextFollowUp } : {}),
      updated_at: now,
    },
    { onConflict: "user_id,contact_id" }
  );

  return NextResponse.json({ ok: true, sent_at: now });
}
