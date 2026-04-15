# Nudge

A student networking app that helps you onboard, define your goals, discover relevant professionals, generate personalized outreach drafts, and track conversations manually.

This is the **Phase 1 MVP** — Chicago-only, free + premium-gated UI, no automation, no scraping.

## Stack

- **Next.js 15** (App Router, RSC, Server Actions)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — Auth (magic link), Postgres, Storage (resumes), RLS
- **Anthropic Claude** — profile summary, strategy snapshot, outreach drafts

## Setup

```bash
# 1. Install
npm install

# 2. Env
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# 3. Supabase
# In your Supabase project SQL editor, run in order:
#   supabase/schema.sql
#   supabase/seed.sql

# 4. Dev
npm run dev
# open http://localhost:3000
```

In Supabase Auth settings, set the site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a redirect.

## Tabs

- **Home** — strategy, summary, today's nudges, status counts
- **Discover** — curated Chicago professionals, scored against your profile
- **Outreach** — pick contact + channel (LinkedIn DM / Intro email / Follow-up / Thank-you), AI draft, edit, copy
- **Tracker** — Kanban CRM (saved → ready → contacted → replied → follow-up due → meeting scheduled → completed → closed)
- **Settings** — edit profile, regenerate strategy, switch free/premium (UI gating)

## Mocked vs Real

| Area | Status |
| --- | --- |
| Auth (magic link) | **Real** — Supabase |
| Database + RLS | **Real** — Supabase |
| Resume upload | **Real** — Supabase Storage (`resumes` bucket, owner-only) |
| AI summary / strategy / drafts | **Real** — Anthropic Claude (Haiku) |
| Chicago professional contacts | **Mocked** — seeded in `supabase/seed.sql` |
| LinkedIn import | **Manual paste / URL only** — no scraping |
| Sending outreach | **Disabled by design** — copy & send from your own account |
| Premium plan | **UI gating only** — no payment integration |
| Multi-city | Schema supports it; only Chicago is `active` in `src/lib/cities.ts` |

## Architecture notes

- `src/middleware.ts` enforces auth on everything except `/`, `/sign-in`, `/auth/*`, `/api/*`.
- `(app)` route group requires onboarding complete; `/onboarding` is the only authed route outside it.
- All AI calls live in `src/lib/ai.ts` and are exposed as thin API routes under `src/app/api/ai/*` so prompts and model choice can be tuned in one place.
- Keep prompts short (already done). Switch models by editing `MODEL` in `src/lib/ai.ts`.

## Extending to new cities (Phase 2 hint)

1. Flip `active: true` for the city in `src/lib/cities.ts`.
2. Insert seeded contacts with that `city` in `supabase/seed.sql`.
3. Discover query already filters by city — swap `eq("city", "Chicago")` for the user's city in `src/app/(app)/discover/page.tsx`.

## Roadmap (not built)

- Real LinkedIn import (OAuth or manual import wizard)
- Email send integration (Gmail OAuth) once safety/UX is right
- Reminders/cron for follow-ups
- Payments (Stripe) for premium
- Inviting trusted reviewers / founder mentors
