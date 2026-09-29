-- Warrantyly: initial schema.
-- Paste into Supabase Dashboard → SQL Editor → Run. Safe to run once on a new project.

------------------------------------------------------------
-- Products
------------------------------------------------------------
create table public.products (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 200),
  brand          text not null default '',
  model          text,
  category       text not null,
  store          text not null default '',
  purchase_date  date not null,
  warranty_months integer not null check (warranty_months between 1 and 240),
  price          numeric(12, 2),
  currency       text not null default 'TND',
  serial         text,
  photo_path     text,
  receipt_path   text,
  reminder_days  integer not null default 14 check (reminder_days between 0 and 365),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_user_id_idx on public.products (user_id);

alter table public.products enable row level security;

create policy "Users read their own products"
  on public.products for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own products"
  on public.products for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own products"
  on public.products for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own products"
  on public.products for delete to authenticated
  using ((select auth.uid()) = user_id);

------------------------------------------------------------
-- Claims
------------------------------------------------------------
create table public.claims (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  issue       text not null check (char_length(issue) between 1 and 5000),
  status      text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at  timestamptz not null default now()
);

create index claims_user_id_idx on public.claims (user_id);
create index claims_product_id_idx on public.claims (product_id);

alter table public.claims enable row level security;

create policy "Users read their own claims"
  on public.claims for select to authenticated
  using ((select auth.uid()) = user_id);

-- A claim must belong to the user AND point at one of the user's own products.
create policy "Users add claims on their own products"
  on public.claims for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.products p where p.id = product_id and p.user_id = (select auth.uid()))
  );

create policy "Users update their own claims"
  on public.claims for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own claims"
  on public.claims for delete to authenticated
  using ((select auth.uid()) = user_id);

------------------------------------------------------------
-- Receipt & product photos: private bucket, one folder per user (<user_id>/...)
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Users read their own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users replace their own files"
  on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

------------------------------------------------------------
-- Account deletion (required by the App Store).
-- The app removes the user's files first, then calls this. Products and claims
-- are removed by the ON DELETE CASCADE above.
------------------------------------------------------------
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
