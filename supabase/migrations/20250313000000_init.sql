-- diagrams: store user diagrams
create table if not exists public.diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  code text not null default 'flowchart LR\n  A --> B',
  is_public boolean not null default false,
  share_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagrams_user_id_idx on public.diagrams(user_id);
create index if not exists diagrams_share_id_idx on public.diagrams(share_id) where share_id is not null;

-- ai_settings: per-user AI API config (api_key stored server-side only in app, or encrypted)
create table if not exists public.ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  api_endpoint text,
  api_key_encrypted text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.diagrams enable row level security;
alter table public.ai_settings enable row level security;

-- diagrams: user can do everything on own rows; anyone can read when is_public = true
create policy "Users can manage own diagrams"
  on public.diagrams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public diagrams are readable by anyone"
  on public.diagrams for select
  using (is_public = true);

-- ai_settings: only owner
create policy "Users can manage own ai_settings"
  on public.ai_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger diagrams_updated_at
  before update on public.diagrams
  for each row execute function public.set_updated_at();

create trigger ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();
