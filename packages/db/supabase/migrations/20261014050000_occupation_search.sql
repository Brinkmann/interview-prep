-- Shared reference: O*NET and ESCO occupations for "typical for this role" (Screen 4).
alter table public.occupations add column description text;
alter table public.occupations add column search tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) stored;
create index occupations_search_idx on public.occupations using gin (search);

-- Finds candidate occupations for a job title (any word may match, best first);
-- the model then picks the best fit.
create or replace function public.match_occupations(query text, max_results int default 10)
returns table (id uuid, scheme text, code text, title text, rank real)
language sql stable set search_path = '' as $$
  with q as (select replace(plainto_tsquery('english', query)::text, '&', '|')::tsquery as tsq)
  select o.id, o.scheme, o.code, o.title, ts_rank(o.search, q.tsq) as rank
  from public.occupations o, q
  where o.search @@ q.tsq
  order by rank desc
  limit max_results
$$;
grant execute on function public.match_occupations(text, int) to authenticated, service_role;
