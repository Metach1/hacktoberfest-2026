-- ============================================================================
-- 0008_qr_account_number.sql
-- Add the account_number field the QR manager uses. Additive + reversible.
-- ============================================================================
alter table public.qr_codes
  add column if not exists account_number text not null default '';

-- down:
-- alter table public.qr_codes drop column if exists account_number;
