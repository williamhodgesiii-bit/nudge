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

export type DraftState = "draft" | "ready" | "sent";

export type Goal =
  | "informational_interview"
  | "mentorship_ask"
  | "internship_interest"
  | "alumni_outreach"
  | "follow_up_no_reply"
  | "thank_you_after_meeting";

export type Seniority = "student" | "entry" | "mid" | "senior" | "executive";

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

export const GOAL_LABELS: Record<Goal, string> = {
  informational_interview: "Informational interview",
  mentorship_ask: "Mentorship ask",
  internship_interest: "Internship interest",
  alumni_outreach: "Alumni outreach",
  follow_up_no_reply: "Follow-up after no reply",
  thank_you_after_meeting: "Thank-you after meeting",
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  student: "Student",
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  executive: "Executive",
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
  seniority: Seniority | null;
};

export type RelationshipEntry = {
  id: string;
  user_id: string;
  contact_id: string;
  status: Status;
  notes: string | null;
  next_action_at: string | null;
  last_touch_at: string | null;
  tags: string[];
  campaign_id: string | null;
  updated_at: string;
};

export type OutreachDraft = {
  id: string;
  user_id: string;
  contact_id: string | null;
  channel: Channel;
  goal: Goal | null;
  subject: string | null;
  body: string;
  edited: boolean;
  state: DraftState;
  sent_at: string | null;
  campaign_id: string | null;
  created_at: string;
};

export type SentMessage = {
  id: string;
  user_id: string;
  contact_id: string;
  draft_id: string | null;
  channel: Channel;
  goal: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
};

export type ContactNote = {
  id: string;
  user_id: string;
  contact_id: string;
  kind: "general" | "meeting";
  note: string;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  contact_id: string | null;
  due_at: string;
  kind: "follow_up" | "meeting_prep" | "thank_you" | "custom";
  note: string | null;
  dismissed_at: string | null;
  created_at: string;
};

export type Template = {
  id: string;
  user_id: string;
  name: string;
  goal: Goal | null;
  channel: Channel;
  subject: string | null;
  body: string;
  created_at: string;
};
