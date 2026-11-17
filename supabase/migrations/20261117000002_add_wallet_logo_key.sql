-- Add logo_key column to wallets for preset bank/e-wallet WebP logos
alter table public.wallets
  add column if not exists logo_key text not null default '';
