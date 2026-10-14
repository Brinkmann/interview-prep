-- Phase 1 revision 2 (D-30, D-33).
-- Each rating carries the card's two coaching lines, model-written and checked by the
-- tone and number guards before they are stored.
alter table public.scores add column strength text;
alter table public.scores add column next_step text;

-- The story builds in Situation, Action and Result form from the candidate's own words.
alter table public.evidence add column situation text;
alter table public.evidence add column action text;
alter table public.evidence add column result text;

-- A story is complete when the coach has nothing more to ask, four questions have been
-- asked (D-32), or the candidate finishes it.
alter table public.evidence add column complete boolean not null default false;
