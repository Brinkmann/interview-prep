-- Step 4 answers become "Yes, I have", "Partly" and "No, I haven't" (D-38). "unsure" stays
-- valid for answers already given; the skip guard still stores a skipped question as unanswered.
alter table public.expectations drop constraint expectations_answer_check;
alter table public.expectations add constraint expectations_answer_check
  check (answer in ('yes', 'partly', 'no', 'unsure', 'unanswered'));
