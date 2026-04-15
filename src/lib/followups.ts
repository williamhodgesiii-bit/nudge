import type { RelationshipEntry, SentMessage, Status } from "./types";

export const FOLLOWUP_AFTER_DAYS = 5;

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

/**
 * A follow-up is "due" when the contact was marked `contacted`,
 * hasn't replied yet, and last touch was >= 5 days ago.
 * We also treat any entry with next_action_at in the past as due.
 */
export function dueFollowUps(
  rels: RelationshipEntry[],
  sentByContact: Map<string, SentMessage[]> = new Map()
): RelationshipEntry[] {
  const now = new Date();
  return rels.filter((r) => {
    if (r.status === "replied" || r.status === "meeting_scheduled" || r.status === "completed" || r.status === "closed") {
      return false;
    }
    if (r.next_action_at && new Date(r.next_action_at) <= now) return true;
    if (r.status === "contacted" && r.last_touch_at) {
      return daysBetween(new Date(r.last_touch_at), now) >= FOLLOWUP_AFTER_DAYS;
    }
    // If sent_messages exist but no last_touch for some reason, use last sent.
    const sent = sentByContact.get(r.contact_id);
    if (r.status === "contacted" && sent && sent.length > 0) {
      const last = new Date(sent[0].sent_at);
      return daysBetween(last, now) >= FOLLOWUP_AFTER_DAYS;
    }
    return false;
  });
}

export function nextBestAction(
  counts: Partial<Record<Status, number>>,
  dueCount: number,
  draftCount: number,
  savedCount: number
): { title: string; cta: string; href: string } {
  if (dueCount > 0) {
    return {
      title: `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due`,
      cta: "Open follow-up queue",
      href: "/tracker?filter=follow_up_due",
    };
  }
  if (draftCount > 0) {
    return {
      title: `${draftCount} draft${draftCount === 1 ? "" : "s"} waiting`,
      cta: "Review & send",
      href: "/outreach",
    };
  }
  if (savedCount > 0) {
    return {
      title: `${savedCount} saved, no draft yet`,
      cta: "Draft outreach",
      href: "/outreach",
    };
  }
  return {
    title: "Find your first contact",
    cta: "Open Discover",
    href: "/discover",
  };
}
