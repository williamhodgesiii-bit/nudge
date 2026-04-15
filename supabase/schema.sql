-- Nudge MVP schema
-- Run in Supabase SQL editor. Assumes auth.users exists.

-- Extensions
create extension if not exists "pgcrypto";

-- USERS profile (1:1 with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  plan text not null default 'free' check (plan in ('free','premium')),
  city text default 'Chicago',
  created_at timestamptz not null default now()
);

-- STUDENT PROFILES
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school text,
  year text,
  major text,
  minor text,
  target_industries text[] default '{}',
  target_roles text[] default '{}',
  city text default 'Chicago',
  experience text,        -- clubs/projects/internships/research/leadership (free text)
  skills text[] default '{}',
  story text,
  goal text,              -- networking goal
  tone text default 'warm-professional',
  comfort text default 'medium', -- low | medium | high
  linkedin_url text,
  linkedin_paste text,
  ai_summary text,
  ai_strategy text,
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- RESUMES
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_path text not null,    -- supabase storage path
  file_name text,
  uploaded_at timestamptz not null default now()
);

-- CONTACTS (seeded Chicago professionals + user-saved)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  company text,
  industry text,
  city text default 'Chicago',
  school text,
  linkedin_url text,
  email text,
  bio text,
  tags text[] default '{}',
  seeded boolean not null default true,
  created_at timestamptz not null default now()
);

-- OUTREACH DRAFTS
create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  channel text not null check (channel in ('linkedin_dm','intro_email','follow_up','thank_you')),
  subject text,
  body text not null,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

-- RELATIONSHIP ENTRIES (CRM tracker)
create table if not exists public.relationship_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'saved' check (status in (
    'saved','ready','contacted','replied','follow_up_due','meeting_scheduled','completed','closed'
  )),
  notes text,
  next_action_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, contact_id)
);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.contacts enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.relationship_entries enable row level security;

-- users: self read/write
drop policy if exists "users self" on public.users;
create policy "users self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- student_profiles: owner only
drop policy if exists "sp owner" on public.student_profiles;
create policy "sp owner" on public.student_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- resumes: owner only
drop policy if exists "resumes owner" on public.resumes;
create policy "resumes owner" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- contacts: read for all signed-in, write only seeded via service role
drop policy if exists "contacts read" on public.contacts;
create policy "contacts read" on public.contacts
  for select using (auth.role() = 'authenticated');

-- outreach_drafts: owner only
drop policy if exists "drafts owner" on public.outreach_drafts;
create policy "drafts owner" on public.outreach_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- relationship_entries: owner only
drop policy if exists "rel owner" on public.relationship_entries;
create policy "rel owner" on public.relationship_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger: auto-create public.users row when auth user created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for resumes (run in dashboard or via SQL)
insert into storage.buckets (id, name, public)
values ('resumes','resumes', false)
on conflict (id) do nothing;

-- Storage policies: owner only
drop policy if exists "resume read own" on storage.objects;
create policy "resume read own" on storage.objects
  for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "resume write own" on storage.objects;
create policy "resume write own" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
