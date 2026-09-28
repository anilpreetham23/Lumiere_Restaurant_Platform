begin;

-- Make table_id optional on dining_sessions to support takeaway, delivery & online orders
alter table public.dining_sessions alter column table_id drop not null;

commit;
