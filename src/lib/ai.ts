import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MODEL = "claude-haiku-4-5-20251001";

async function complete(system: string, user: string, max = 600): Promise<string> {
  if (!client) {
    return "[AI not configured. Add ANTHROPIC_API_KEY to enable generation.]";
  }
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: max,
    system,
    messages: [{ role: "user", content: user }],
  });
  const part = res.content.find((c) => c.type === "text");
  return part && part.type === "text" ? part.text.trim() : "";
}

type ProfileInput = {
  school?: string | null;
  year?: string | null;
  major?: string | null;
  minor?: string | null;
  city?: string | null;
  target_industries?: string[];
  target_roles?: string[];
  experience?: string | null;
  skills?: string[];
  story?: string | null;
  goal?: string | null;
  tone?: string | null;
  comfort?: string | null;
  linkedin_paste?: string | null;
};

export async function generateSummary(p: ProfileInput) {
  return complete(
    "You write concise, warm, professional student profile summaries. 3-4 sentences. Active voice. No fluff.",
    `Summarize this student in 3-4 sentences for the top of their networking profile. Highlight strengths, direction, and what makes them distinctive. Avoid generic phrases.\n\n${JSON.stringify(p)}`,
    400
  );
}

export async function generateStrategy(p: ProfileInput) {
  return complete(
    "You are a calm, sharp career coach. Output a short, scannable strategy snapshot in markdown.",
    `Write a 'Your networking strategy' snapshot for this student. Include exactly these markdown sections:\n\n**Where to focus**\n- 2-3 bullets on the right industries/roles to chase given their goal.\n\n**Who to talk to first**\n- 3 bullets describing types of people (role + industry + reason).\n\n**Your angle**\n- 2 sentences on the unique angle they bring.\n\n**This week**\n- 3 small, specific actions.\n\nKeep it warm but tight. No filler.\n\nStudent:\n${JSON.stringify(p)}`,
    700
  );
}

export type DraftInput = {
  channel: "linkedin_dm" | "intro_email" | "follow_up" | "thank_you";
  goal?:
    | "informational_interview"
    | "mentorship_ask"
    | "internship_interest"
    | "alumni_outreach"
    | "follow_up_no_reply"
    | "thank_you_after_meeting"
    | null;
  length?: "short" | "medium" | "long";
  confidence?: "humble" | "balanced" | "confident";
  ask_type?: "15_min_chat" | "advice_only" | "referral" | "review_resume" | "no_ask";
  student: ProfileInput & { full_name?: string };
  contact: {
    full_name: string;
    title?: string | null;
    company?: string | null;
    school?: string | null;
    bio?: string | null;
  };
  notes?: string;
  prior_messages?: { channel: string; body: string; sent_at: string }[];
};

const channelDirective = {
  linkedin_dm: "LinkedIn DM.",
  intro_email: "Cold intro email with subject + body.",
  follow_up: "Polite follow-up after no reply. Reference prior message briefly.",
  thank_you: "Thank-you note after a chat. Include a specific takeaway + next step.",
} as const;

const lengthDirective = {
  short: "Keep it tight: LinkedIn DM ≤ 220 chars; email 80–110 words.",
  medium: "LinkedIn DM ≤ 280 chars; email 120–160 words.",
  long: "LinkedIn DM ≤ 320 chars; email 180–220 words.",
};

const confidenceDirective = {
  humble: "Humble and respectful. Acknowledge their time.",
  balanced: "Warm, confident, not apologetic.",
  confident: "Direct and self-assured. No hedging.",
};

const askDirective = {
  "15_min_chat": "Ask for a 15 min chat.",
  advice_only: "Ask only for a short piece of written advice.",
  referral: "Gently ask if they'd refer you to a relevant person on their team.",
  review_resume: "Ask if they'd be willing to glance at a 1-page resume.",
  no_ask: "Make no ask — only a meaningful intro.",
};

export async function generateDraft(d: DraftInput) {
  const wantsSubject = d.channel === "intro_email";
  const goal = d.goal ? `\nGoal: ${d.goal.replace(/_/g, " ")}.` : "";
  const length = lengthDirective[d.length || "medium"];
  const conf = confidenceDirective[d.confidence || "balanced"];
  const ask = askDirective[d.ask_type || "15_min_chat"];
  const prior =
    d.prior_messages && d.prior_messages.length
      ? `\nPrior messages sent (do not repeat them verbatim):\n${d.prior_messages
          .slice(0, 3)
          .map((m) => `- [${m.channel}] ${m.body.slice(0, 240)}`)
          .join("\n")}`
      : "";

  const sys = `You write personalized, human, non-cringe student outreach. Match the requested tone. Never invent facts. Avoid "I hope this email finds you well." ${wantsSubject ? "Return JSON with keys 'subject' and 'body'." : "Return JSON with key 'body' only."}`;

  const user = `${channelDirective[d.channel]}${goal}
Tone: ${d.student.tone || "warm-professional"}.
Length: ${length}
Confidence: ${conf}
Ask: ${ask}
Comfort: ${d.student.comfort || "medium"}.${prior}

Student:
${JSON.stringify(d.student)}

Contact:
${JSON.stringify(d.contact)}

Notes from student:
${d.notes || "(none)"}

Return only valid JSON.`;

  const raw = await complete(sys, user, 700);
  try {
    const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return {
      subject: typeof json.subject === "string" ? json.subject : null,
      body: typeof json.body === "string" ? json.body : raw,
    };
  } catch {
    return { subject: null, body: raw };
  }
}
