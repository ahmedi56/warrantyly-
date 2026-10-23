-- Warrantyly: daily limits for receipt reading.
-- The extract-receipt Edge Function calls Gemini, which has a quota (and costs money on a paid plan),
-- so each person, and the app as a whole, gets a daily allowance. Run once in the
-- Supabase Dashboard -> SQL Editor.

create table public.receipt_reads (
  day    date not null default current_date,
  -- 'user:<id>' for signed-in people, 'ip:<hash>' for guests, '*' for the app-wide total.
  key    text not null,
  count  integer not null default 0,
  primary key (day, key)
);

-- Only the Edge Function (service role) touches this table: RLS on, and no policies, so nobody else can read it.
alter table public.receipt_reads enable row level security;

-- Counts one read and says whether it is allowed: 'ok', 'key_limit' (this person is over) or 'global_limit'.
-- One statement per counter, so two reads at the same moment can't both slip under the limit.
create function public.take_receipt_read(p_key text, p_key_limit integer, p_global_limit integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_key integer;
  used_all integer;
begin
  insert into public.receipt_reads as r (day, key, count) values (current_date, p_key, 1)
  on conflict (day, key) do update set count = r.count + 1
  returning r.count into used_key;
  if used_key > p_key_limit then
    return 'key_limit';
  end if;

  insert into public.receipt_reads as r (day, key, count) values (current_date, '*', 1)
  on conflict (day, key) do update set count = r.count + 1
  returning r.count into used_all;
  if used_all > p_global_limit then
    return 'global_limit';
  end if;

  -- Old days are never needed again; keep the table tiny.
  delete from public.receipt_reads where day < current_date - 7;
  return 'ok';
end;
$$;

revoke execute on function public.take_receipt_read(text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_receipt_read(text, integer, integer) to service_role;
