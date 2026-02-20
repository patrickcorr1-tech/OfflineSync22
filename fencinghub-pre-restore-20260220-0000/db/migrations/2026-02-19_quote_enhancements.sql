-- Quote enhancements: versioning, pin/archive, internal notes, viewed timestamp, customer email

alter table if exists public.projects
  add column if not exists customer_email text;

alter table if exists public.quotes
  add column if not exists version integer not null default 1,
  add column if not exists internal_notes text,
  add column if not exists pinned boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists viewed_at timestamptz;

create or replace function public.set_quote_version()
returns trigger as $$
begin
  if new.version is null or new.version < 1 then
    select coalesce(max(version), 0) + 1 into new.version
    from public.quotes
    where project_id = new.project_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_quote_version on public.quotes;
create trigger set_quote_version
before insert on public.quotes
for each row execute function public.set_quote_version();
