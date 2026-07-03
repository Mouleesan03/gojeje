create table if not exists public.manual_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  source text default 'GOjeje',
  category text default 'Sri Lanka',
  language text not null default 'Tamil' check (language in ('Tamil', 'English', 'Sinhala')),
  published_at timestamptz not null default now(),
  url text,
  image text,
  tone text default 'city',
  placement text not null default 'both' check (placement in ('post', 'story', 'both')),
  media_type text not null default 'news' check (media_type in ('news', 'image', 'video')),
  video_url text,
  created_at timestamptz not null default now()
);

create index if not exists manual_stories_published_at_idx
  on public.manual_stories (published_at desc);
