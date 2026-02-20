-- WhatsApp approval flow tokens

alter table if exists public.approvals
  add column if not exists approval_token text,
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists approved_via text;

create unique index if not exists approvals_approval_token_key
  on public.approvals (approval_token);
