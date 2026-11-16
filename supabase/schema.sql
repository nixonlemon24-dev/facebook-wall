create table posts (
  id bigint generated always as identity primary key,
  author text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
create policy "anyone can read" on posts for select using (true);
create policy "anyone can post" on posts for insert with check (true);

-- enable Realtime
alter publication supabase_realtime add table posts;
