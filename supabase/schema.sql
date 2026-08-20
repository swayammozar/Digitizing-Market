-- Digitizing Market — database schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is written to be re-runnable: every object is created only if missing.
--
-- Design note: the product catalog is NOT in Postgres. It is generated from the
-- design files themselves by scripts/build-catalog.mjs and shipped as static
-- JSON, so sizes, stitch counts and formats can never drift from what is inside
-- the zip. Orders therefore reference a product by its slug rather than by a
-- foreign key. The trade-off is deliberate: a renamed slug must be migrated by
-- hand, which is far rarer than a catalog read.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- A profile row is created by trigger rather than by the client, so a signed-up
-- user can never exist without one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  gateway           text not null check (gateway in ('paypal', 'razorpay')),
  -- Unique so a webhook replayed by the gateway cannot create a second order
  -- and grant the files twice. This is the idempotency key.
  gateway_order_id  text not null unique,
  gateway_payment_id text,
  amount            numeric(10, 2) not null check (amount >= 0),
  currency          text not null check (currency in ('USD', 'INR')),
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

-- Read-only for the buyer. Every write happens server-side with the service
-- role after the gateway has been verified — the client is never trusted to
-- say what it paid.
drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders
  for select using (auth.uid() = user_id);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders on delete cascade,
  product_slug text not null,
  price        numeric(10, 2) not null check (price >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

drop policy if exists "read own order items" on public.order_items;
create policy "read own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Downloads — the buyer's permanent library
-- ---------------------------------------------------------------------------

create table if not exists public.downloads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  product_slug   text not null,
  order_id       uuid references public.orders on delete set null,
  granted_at     timestamptz not null default now(),
  download_count integer not null default 0,
  last_download  timestamptz,
  -- Buying the same design twice must not produce two library entries.
  unique (user_id, product_slug)
);

create index if not exists downloads_user_idx on public.downloads (user_id, granted_at desc);

alter table public.downloads enable row level security;

drop policy if exists "read own downloads" on public.downloads;
create policy "read own downloads" on public.downloads
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Custom digitizing requests
-- ---------------------------------------------------------------------------

create table if not exists public.custom_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete set null,
  email        text not null,
  artwork_path text,
  width_mm     integer,
  format       text,
  placement    text,
  notes        text,
  status       text not null default 'new'
                 check (status in ('new', 'quoted', 'accepted', 'declined', 'done')),
  created_at   timestamptz not null default now()
);

alter table public.custom_requests enable row level security;

-- Quotes are open to anyone, signed in or not — requiring an account before
-- you can ask a question would cost more enquiries than it prevents spam.
drop policy if exists "anyone may request a quote" on public.custom_requests;
create policy "anyone may request a quote" on public.custom_requests
  for insert with check (true);

drop policy if exists "read own requests" on public.custom_requests;
create policy "read own requests" on public.custom_requests
  for select using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

-- The paid product. Never public: access only through a short-lived signed URL
-- minted server-side after ownership has been checked. No RLS policy is added
-- for this bucket on purpose — with none, only the service role can reach it.
insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

drop policy if exists "public media is readable" on storage.objects;
create policy "public media is readable" on storage.objects
  for select using (bucket_id = 'public-media');

-- Artwork sent with a quote request.
insert into storage.buckets (id, name, public)
values ('custom-artwork', 'custom-artwork', false)
on conflict (id) do nothing;

drop policy if exists "anyone may upload artwork" on storage.objects;
create policy "anyone may upload artwork" on storage.objects
  for insert with check (bucket_id = 'custom-artwork');
