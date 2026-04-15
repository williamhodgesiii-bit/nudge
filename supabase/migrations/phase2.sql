-- Phase 2 migration. Additive and idempotent. Safe to run on existing Phase 1 DB.

-- Extend contacts with seniority
alter table public.contacts
  add column if not exists seniority text check (seniority in ('student','entry','mid','senior','executive'));

-- Extend relationship_entries with tags and touch dates
alter table public.relationship_entries
  add column if not exists tags text[] default '{}',
  add column if not exists last_touch_at timestamptz,
  add column if not exists campaign_id uuid;

-- Extend outreach_drafts with state + goal + campaign
do $$ begin
  alter table public.outreach_drafts add column state text not null default 'draft';
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.outreach_drafts
    add constraint outreach_drafts_state_check check (state in ('draft','ready','sent'));
exception when duplicate_object then null; end $$;

alter table public.outreach_drafts
  add column if not exists goal text,
  add column if not exists campaign_id uuid,
  add column if not exists sent_at timestamptz;

-- Campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  goal text,
  created_at timestamptz not null default now()
);

-- Reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  due_at timestamptz not null,
  kind text not null default 'follow_up' check (kind in ('follow_up','meeting_prep','thank_you','custom')),
  note text,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sent messages (immutable record of what user actually sent)
create table if not exists public.sent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  draft_id uuid references public.outreach_drafts(id) on delete set null,
  channel text not null check (channel in ('linkedin_dm','intro_email','follow_up','thank_you')),
  goal text,
  subject text,
  body text not null,
  sent_at timestamptz not null default now()
);

-- Contact notes (general + meeting notes)
create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind text not null default 'general' check (kind in ('general','meeting')),
  note text not null,
  created_at timestamptz not null default now()
);

-- User-saved template library
create table if not exists public.template_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  goal text,
  channel text not null check (channel in ('linkedin_dm','intro_email','follow_up','thank_you')),
  subject text,
  body text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.campaigns enable row level security;
alter table public.reminders enable row level security;
alter table public.sent_messages enable row level security;
alter table public.contact_notes enable row level security;
alter table public.template_library enable row level security;

drop policy if exists "campaigns owner" on public.campaigns;
create policy "campaigns owner" on public.campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders owner" on public.reminders;
create policy "reminders owner" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sent_messages owner" on public.sent_messages;
create policy "sent_messages owner" on public.sent_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "contact_notes owner" on public.contact_notes;
create policy "contact_notes owner" on public.contact_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "templates owner" on public.template_library;
create policy "templates owner" on public.template_library for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_sent_messages_contact on public.sent_messages(user_id, contact_id, sent_at desc);
create index if not exists idx_notes_contact on public.contact_notes(user_id, contact_id, created_at desc);
create index if not exists idx_reminders_due on public.reminders(user_id, due_at) where dismissed_at is null;
create index if not exists idx_rels_touch on public.relationship_entries(user_id, last_touch_at desc nulls last);

-- Backfill seniority on existing seeded contacts (best-effort by title)
update public.contacts set seniority = case
  when title ilike '%partner%' or title ilike '%chief%' or title ilike '%vp%' or title ilike '%head of%' then 'executive'
  when title ilike '%senior%' or title ilike '%lead%' or title ilike '%principal%' or title ilike '%manager%' then 'senior'
  when title ilike '%associate%' or title ilike '%analyst%' or title ilike '%ii%' then 'mid'
  when title ilike '%intern%' then 'student'
  else 'entry'
end
where seniority is null;
