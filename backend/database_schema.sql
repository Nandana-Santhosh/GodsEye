-- Database schema for GodsEye accident detection system

-- Enable RLS (Row Level Security)
alter table if exists public.accidents enable row level security;

-- Create accidents table
create table if not exists public.accidents (
  id text primary key,
  camera_name text not null,
  location text,
  location_address text,
  timestamp timestamptz not null default now(),
  images text[] default array[]::text[],
  status text not null default 'pending',
  description text,
  confidence real,
  source text default 'camera',
  pinata_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.accidents is 'Stores accident detection events';

-- Create accidents view for public access
create or replace view public.accidents_view as
  select
    id,
    camera_name,
    location,
    location_address,
    timestamp,
    images,
    status,
    description,
    confidence,
    source,
    pinata_hash,
    created_at,
    updated_at
  from public.accidents
  order by timestamp desc;

-- Create RLS policy for accidents table
create policy "Allow public read access"
  on public.accidents
  for select
  to anon
  using (true);

create policy "Allow public insert access"
  on public.accidents
  for insert
  to anon
  with check (true);

create policy "Allow public update access"
  on public.accidents
  for update
  to anon
  using (true);

-- Create statistics view for dashboard
create or replace view public.accident_statistics as
  with status_counts as (
    select
      count(*) as total,
      count(*) filter (where status = 'pending') as pending,
      count(*) filter (where status = 'acknowledged') as acknowledged,
      count(*) filter (where status = 'resolved') as resolved,
      count(*) filter (where status = 'rejected') as rejected
    from public.accidents
  ),
  camera_counts as (
    select
      camera_name,
      count(*) as count
    from public.accidents
    group by camera_name
    order by count desc
    limit 5
  ),
  time_of_day_counts as (
    select
      case
        when extract(hour from timestamp) between 5 and 11 then 'Morning'
        when extract(hour from timestamp) between 12 and 16 then 'Afternoon'
        when extract(hour from timestamp) between 17 and 20 then 'Evening'
        else 'Night'
      end as time_of_day,
      count(*) as count
    from public.accidents
    group by time_of_day
    order by count desc
  )
  select
    s.total,
    s.pending,
    s.acknowledged,
    s.resolved,
    s.rejected,
    jsonb_object_agg(c.camera_name, c.count) as by_camera,
    jsonb_object_agg(t.time_of_day, t.count) as by_time_of_day
  from
    status_counts s,
    lateral (select camera_name, count from camera_counts) c,
    lateral (select time_of_day, count from time_of_day_counts) t
  group by s.total, s.pending, s.acknowledged, s.resolved, s.rejected;

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger set_updated_at
before update on public.accidents
for each row
execute function public.handle_updated_at(); 