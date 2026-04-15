import type { Goal, Channel } from "./types";

// Built-in goal → recommended channel + scaffold. These prime the AI prompt.
export const BUILTIN_TEMPLATES: {
  goal: Goal;
  label: string;
  suggested_channel: Channel;
  description: string;
  scaffold: string; // shown when AI key is missing; also used as seed hint in prompt
}[] = [
  {
    goal: "informational_interview",
    label: "Informational interview",
    suggested_channel: "intro_email",
    description: "Ask for 15–20 min to learn about their path and work.",
    scaffold:
      "Hi {first}, I'm a {year} at {school} studying {major} and exploring {industry}. I loved your work at {company}, especially {hook}. Would you be open to a 15–20 min chat in the next couple weeks? Happy to work around your calendar.",
  },
  {
    goal: "mentorship_ask",
    label: "Mentorship ask",
    suggested_channel: "linkedin_dm",
    description: "Low-pressure ask to stay in touch and learn over time.",
    scaffold:
      "Hi {first}, your journey from {prev} to {company} is one I'm trying to learn from. I'm a {year} at {school}. Would you be open to occasional short check-ins as I figure out my own path?",
  },
  {
    goal: "internship_interest",
    label: "Internship interest",
    suggested_channel: "intro_email",
    description: "Express specific interest in an internship + offer value.",
    scaffold:
      "Hi {first}, I'm applying for {company}'s {role} role and wanted to reach out directly. Here's the 10-second version of me: {snapshot}. Would love your perspective on what makes candidates stand out there.",
  },
  {
    goal: "alumni_outreach",
    label: "Alumni outreach",
    suggested_channel: "linkedin_dm",
    description: "Lead with shared school; ask for 15 min.",
    scaffold:
      "Hi {first}, fellow {school} {year_range}. I'm a {year} thinking about {industry} and your path at {company} stood out. Open to a quick 15 min chat?",
  },
  {
    goal: "follow_up_no_reply",
    label: "Follow-up after no reply",
    suggested_channel: "follow_up",
    description: "Light, no guilt. Reference the prior message.",
    scaffold:
      "Hi {first}, bumping this in case it got buried. Still hoping to learn from your experience at {company} — no worries if the timing's off.",
  },
  {
    goal: "thank_you_after_meeting",
    label: "Thank-you after meeting",
    suggested_channel: "thank_you",
    description: "Specific, concise, mention one takeaway + next step.",
    scaffold:
      "Hi {first}, thanks again for the time today. The point about {takeaway} really stuck with me — I'm going to {next_step}. I'll keep you posted.",
  },
];

export function templateForGoal(goal: Goal) {
  return BUILTIN_TEMPLATES.find((t) => t.goal === goal);
}
