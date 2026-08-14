-- Run after supabase/session-details.sql.
-- Splits each session's structured set breakdown by WARM-UP/MAIN SET/EVENTS/COOL-DOWN
-- category, and adds a free-text `content` field per row. training_sessions'
-- warmup/mainset/events/cooldown text columns are repurposed as each section's short
-- theme label — no schema change needed there, only a meaning change, so RLS is
-- untouched (it's table/row-scoped, not column-scoped).

-- Existing test rows are discarded intentionally so the new NOT NULL category column
-- can be added cleanly.
delete from public.training_session_details;

alter table public.training_session_details
  add column category text not null default 'mainset',
  add constraint training_session_details_category_check
    check (category in ('warmup', 'mainset', 'events', 'cooldown')),
  add column content text;

alter table public.training_session_details
  alter column category drop default;

-- distance: was "any positive integer" — now a fixed set of standard training distances.
alter table public.training_session_details
  drop constraint if exists training_session_details_distance_check,
  add constraint training_session_details_distance_check
    check (distance in (25, 50, 75, 100, 150, 200, 300, 400, 500, 800, 1000, 1500));

-- sets: the coach UI dropdown offers 0-10 (0 previously wasn't allowed).
alter table public.training_session_details
  drop constraint if exists training_session_details_sets_check,
  add constraint training_session_details_sets_check
    check (sets >= 0 and sets <= 10);

-- pace: "x:xx" -> "xx'xx'" notation, both parts exactly 2 digits, 00-99 each (no <60 cap
-- on the second pair — the UI treats both halves as plain 00-99 dropdowns).
alter table public.training_session_details
  drop constraint if exists training_session_details_pace_check,
  add constraint training_session_details_pace_check
    check (pace is null or pace ~ '^[0-9]{2}''[0-9]{2}"$');

create index if not exists training_session_details_category_idx
  on public.training_session_details (session_id, category, sort_order);
