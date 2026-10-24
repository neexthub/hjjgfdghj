ALTER TABLE public.sms_transactions ADD COLUMN IF NOT EXISTS payer_number text;
COMMENT ON COLUMN public.sms_transactions.account_number IS 'Receiving (merchant) wallet number — the phone that got the SMS';
COMMENT ON COLUMN public.sms_transactions.payer_number IS 'Customer wallet number the money came from, parsed from the SMS body';