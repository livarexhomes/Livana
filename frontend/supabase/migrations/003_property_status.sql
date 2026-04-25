-- Extend property status to support richer availability labels
-- Old values: available | unavailable | pending
-- New values: available | taken | coming_soon | under_negotiation

-- Drop the old check constraint and add the new one
alter table public.properties
  drop constraint if exists properties_status_check;

alter table public.properties
  add constraint properties_status_check
  check (status in ('available', 'taken', 'coming_soon', 'under_negotiation'));

-- Migrate existing data
update public.properties set status = 'taken'            where status = 'unavailable';
update public.properties set status = 'under_negotiation' where status = 'pending';
