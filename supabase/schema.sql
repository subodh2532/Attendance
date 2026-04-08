create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  in_time timestamptz not null,
  out_time timestamptz,
  created_at timestamptz not null default now(),
  constraint one_checkin_per_student_per_day unique (student_id, attendance_date)
);

create index if not exists students_clerk_user_id_idx
  on public.students (clerk_user_id);

create index if not exists attendance_records_clerk_user_id_idx
  on public.attendance_records (clerk_user_id);

create index if not exists attendance_records_student_id_idx
  on public.attendance_records (student_id);
