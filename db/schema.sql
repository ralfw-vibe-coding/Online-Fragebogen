-- Online Fragebogen V1 schema for Neon / Postgres
-- Execute this file once in the Neon SQL editor.

begin;

create extension if not exists pgcrypto;

create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  recipient_email text not null,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  constraint surveys_slug_format_chk check (slug ~ '^[a-z0-9-]+$'),
  constraint surveys_recipient_email_chk check (position('@' in recipient_email) > 1),
  constraint surveys_definition_is_object_chk check (jsonb_typeof(definition) = 'object')
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint responses_answers_is_object_chk check (jsonb_typeof(answers) = 'object')
);

create index if not exists responses_survey_id_submitted_at_idx
  on responses (survey_id, submitted_at desc);

comment on table surveys is
  'Stores published survey definitions. Each survey definition is a JSONB document rendered by the app.';

comment on column surveys.definition is
  'Survey definition JSON with title, markdown texts and typed questions.';

comment on table responses is
  'Stores submitted answers for a survey as JSONB.';

comment on column responses.answers is
  'Answer payload keyed by question id.';

commit;
