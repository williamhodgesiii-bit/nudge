# Nudge

A student networking app that helps you onboard, define your goals, discover relevant professionals, generate personalized outreach drafts, and track conversations manually.

Phase 2 MVP — richer tracking, reminders, manual send logging, analytics. Still Chicago-only, no automation, no scraping.

## Stack

- **Next.js 15** (App Router, RSC)
- **TypeScript**, **Tailwind CSS**
- **Supabase** — Auth (magic link), Postgres, Storage (resumes), RLS
- **Anthropic Claude Haiku** — summary, strategy, outreach drafts
- **Vercel** — hosting (recommended)

---

## Quick deploy (Vercel)

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. SQL Editor → paste and run `supabase/schema.sql`.
3. SQL Editor → paste and run `supabase/migrations/phase2.sql` (adds campaigns, reminders, sent_messages, contact_notes, template_library, seniority, etc.).
4. SQL Editor → paste and run `supabase/seed.sql`.
5. **Project Settings → API**: copy **Project URL**, **anon public key**, **service_role key**.

### 2. Get an AI key
- Easiest: [console.anthropic.com](https://console.anthropic.com) → $5 free credit, works out of the box.
- See the bottom of this README for free alternatives (Gemini, Groq).

### 3. Push this repo to GitHub (if not already)
```bash
git remote add origin https://github.com/<you>/nudge.git
git push -u origin main
```

### 4. Import to Vercel
1. [vercel.com/new](https://vercel.com/new) → pick the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Add environment variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (keep secret) |
   | `ANTHROPIC_API_KEY` | from Anthropic |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` (update after first deploy) |

4. Click **Deploy**. First build takes ~1 minute.

### 5. Wire Supabase to the deployed URL
After Vercel gives you a URL (e.g. `https://nudge-xyz.vercel.app`):

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://nudge-xyz.vercel.app`
   - **Redirect URLs** (add both):
     - `https://nudge-xyz.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (for local dev)
2. Back in Vercel, update `NEXT_PUBLIC_SITE_URL` to the actual URL → redeploy.

### 6. Done
Visit your Vercel URL → sign in with a magic link → onboard.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the same vars as Vercel
npm run dev                  # http://localhost:3000
```

- `npm run build` — production build (verified green)
- `npm run start` — run the production build locally

---

## Tabs

- **Home** — strategy, summary, status counts, recent drafts
- **Discover** — curated Chicago professionals, scored against your profile
- **Outreach** — pick contact + channel (LinkedIn DM / Intro email / Follow-up / Thank-you), AI draft, edit, copy
- **Tracker** — Kanban CRM (saved → ready → contacted → replied → follow-up due → meeting scheduled → completed → closed), drag-and-drop + notes
- **Settings** — edit profile, regenerate strategy, switch free/premium

---

## Mocked vs Real

| Area | Status |
|---|---|
| Auth (magic link) | **Real** — Supabase |
| Database + RLS | **Real** — Supabase |
| Resume upload | **Real** — Supabase Storage (`resumes` bucket, owner-only) |
| AI summary / strategy / drafts | **Real** — Anthropic Claude (Haiku) |
| Chicago professional contacts | **Mocked** — seeded in `supabase/seed.sql` |
| LinkedIn import | **Manual paste / URL only** — no scraping |
| Sending outreach | **Disabled by design** — copy, send from your account |
| Premium plan | **UI gating only** — no payment integration |
| Multi-city | Schema + `src/lib/cities.ts` ready; only Chicago is active |

---

## Architecture notes

- `src/middleware.ts` enforces auth on everything except `/`, `/sign-in`, `/auth/*`, `/api/*`.
- `(app)` route group requires onboarding complete; `/onboarding` is the only authed route outside it.
- All AI calls live in `src/lib/ai.ts` behind thin API routes under `src/app/api/ai/*`.
- All pages using Supabase cookies are dynamic — no build-time env required beyond placeholders.

---

## Extending to new cities (Phase 2 hint)

1. Flip `active: true` for the city in `src/lib/cities.ts`.
2. Insert seeded contacts with that `city` in `supabase/seed.sql`.
3. `Discover` query already filters by city — swap `eq("city", "Chicago")` for the user's city in `src/app/(app)/discover/page.tsx`.

---

## Free AI key alternatives

The app is wired for Anthropic. To swap providers, edit `src/lib/ai.ts`:

- **Google Gemini** (free: 15 rpm, 1M tokens/day) — [aistudio.google.com](https://aistudio.google.com)
- **Groq** (free: fast Llama 3.3 70B) — [console.groq.com](https://console.groq.com)
- **OpenRouter** free models (`:free` suffix) — [openrouter.ai](https://openrouter.ai)

All three have OpenAI-compatible APIs; the swap is ~20 lines. Ask and I'll do it.

---

## Phase 2 additions

**New tables** (see `supabase/migrations/phase2.sql`): `campaigns`, `reminders`, `sent_messages`, `contact_notes`, `template_library`. Plus new columns: `contacts.seniority`, `relationship_entries.tags/last_touch_at/campaign_id`, `outreach_drafts.state/goal/campaign_id/sent_at`.

**Home dashboard** — 5 key metrics (saved, contacted, replies, meetings, follow-ups due), next-best-action card, this-week action list, follow-up queue with one-click "Generate follow-up", recently sent, and a basic analytics block (outreach count, reply rate, meetings, reply rate by channel). Premium unlocks industry-level analytics.

**Discover** — filters added for city, industry, role, seniority, and "alumni of my school only". Still Chicago-seeded, structured for future real ingestion.

**Outreach** — goal picker (informational interview / mentorship ask / internship interest / alumni outreach / follow-up / thank-you), personalization controls (length, confidence, ask type), built-in + user-saved templates, draft state machine (`draft → ready → sent`). **Mark as sent** writes an immutable `sent_messages` row, timestamps the action, advances the contact's status to `contacted`, sets `last_touch_at`, and schedules a 5-day follow-up date. Nothing is ever sent externally.

**Tracker** — click any card to open a contact drawer with:
- Status dropdown + Kanban drag-and-drop
- Tags (industry / campaign / city)
- Last touch + editable next follow-up date
- Separate note and meeting-note inputs
- Chronological timeline merging sent messages + notes + meeting notes — the exact sent text is preserved forever so you can always see what actually went out.
- Follow-up filter pill that isolates due items; cards glow when due.

**Reminder engine** — pure in-app, derived on page load from `last_touch_at` + `next_action_at` + status. No external notifications yet.

**Premium gating (UI only)** — free tier: 6 Discover matches, 5 active drafts, basic analytics, limited ask types. Premium: unlimited, advanced ask types (referral, resume review), industry-level analytics, unlimited history.

## Roadmap (Phase 3)

- Real LinkedIn import wizard
- Email send integration (Gmail OAuth)
- Scheduled reminder emails / push
- Payments (Stripe) for premium
- Additional cities (data already keyed by `city`)
