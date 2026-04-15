export type Plan = "free" | "premium";

export type Channel = "linkedin_dm" | "intro_email" | "follow_up" | "thank_you";

export type Status =
  | "saved"
  | "ready"
  | "contacted"
  | "replied"
  | "follow_up_due"
  | "meeting_scheduled"
  | "completed"
  | "closed";

export const STATUS_COLUMNS: { key: Status; label: string }[] = [
  { key: "saved", label: "Saved" },
  { key: "ready", label: "Ready" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "follow_up_due", label: "Follow-up due" },
  { key: "meeting_scheduled", label: "Meeting scheduled" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin_dm: "LinkedIn DM",
  intro_email: "Intro email",
  follow_up: "Follow-up",
  thank_you: "Thank-you note",
};

export type StudentProfile = {
  id: string;
  user_id: string;
  school: string | null;
  year: string | null;
  major: string | null;
  minor: string | null;
  target_industries: string[];
  target_roles: string[];
  city: string | null;
  experience: string | null;
  skills: string[];
  story: string | null;
  goal: string | null;
  tone: string | null;
  comfort: string | null;
  linkedin_url: string | null;
  linkedin_paste: string | null;
  ai_summary: string | null;
  ai_strategy: string | null;
  onboarding_complete: boolean;
};

export type Contact = {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  industry: string | null;
  city: string | null;
  school: string | null;
  linkedin_url: string | null;
  email: string | null;
  bio: string | null;
  tags: string[];
};

export type RelationshipEntry = {
  id: string;
  user_id: string;
  contact_id: string;
  status: Status;
  notes: string | null;
  next_action_at: string | null;
  updated_at: string;
};

export type OutreachDraft = {
  id: string;
  user_id: string;
  contact_id: string | null;
  channel: Channel;
  subject: string | null;
  body: string;
  edited: boolean;
  created_at: string;
};
