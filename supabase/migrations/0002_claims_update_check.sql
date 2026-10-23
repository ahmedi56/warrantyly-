-- Warrantyly: tighten who can edit a claim.
-- The update rule in 0001 only checked that the claim belongs to the user. It did not re-check that
-- the product it points at belongs to the user too (the insert rule does). Run once in the
-- Supabase Dashboard -> SQL Editor.

drop policy if exists "Users update their own claims" on public.claims;

create policy "Users update their own claims"
  on public.claims for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.products p where p.id = product_id and p.user_id = (select auth.uid()))
  );
