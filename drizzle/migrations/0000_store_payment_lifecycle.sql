ALTER TABLE public.merchants ADD COLUMN website_origin text, ADD COLUMN callback_url text, ADD COLUMN success_url text, ADD COLUMN callback_api_key text;
ALTER TABLE public.api_keys ADD COLUMN merchant_id uuid REFERENCES public.merchants(id), ADD COLUMN scope text NOT NULL DEFAULT 'ingest';
ALTER TABLE public.payments ADD COLUMN customer_user_id text, ADD COLUMN store_trx text, ADD COLUMN gateway_trx uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN user_verify_trx text, ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'), ADD COLUMN deleted_at timestamptz, ADD COLUMN callback_api_key text;
UPDATE public.payments SET expires_at = created_at + interval '1 hour';
CREATE UNIQUE INDEX payments_gateway_trx_unique ON public.payments(gateway_trx);
CREATE UNIQUE INDEX payments_store_reference_unique ON public.payments(merchant_id,store_trx) WHERE store_trx IS NOT NULL;
CREATE INDEX payments_pending_expiry ON public.payments(expires_at) WHERE status='pending';
CREATE OR REPLACE FUNCTION public.enforce_payment_lifecycle() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.expires_at := NEW.created_at + interval '1 hour'; END IF;
 IF TG_OP='UPDATE' THEN
  NEW.expires_at := OLD.expires_at;
  NEW.gateway_trx := OLD.gateway_trx;
  IF OLD.status IN ('complete','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Terminal payments cannot change status'; END IF;
 END IF;
 IF NEW.status='complete' AND NEW.expires_at <= now() THEN RAISE EXCEPTION 'Payment expired'; END IF;
 IF NEW.status='pending' AND NEW.expires_at <= now() THEN NEW.status := 'cancelled'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_payment_lifecycle BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_lifecycle();
CREATE OR REPLACE FUNCTION public.expire_payments() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN UPDATE public.payments SET status='cancelled',updated_at=now() WHERE status='pending' AND expires_at <= now(); GET DIAGNOSTICS affected = ROW_COUNT; RETURN affected; END $$;
REVOKE ALL ON FUNCTION public.expire_payments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_payments() TO service_role;
CREATE OR REPLACE FUNCTION public.claim_payment_sms(p_payment uuid,p_sms uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pay public.payments; sms public.sms_transactions; acct public.merchant_accounts;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 SELECT * INTO sms FROM public.sms_transactions WHERE id=p_sms FOR UPDATE;
 IF pay.id IS NULL OR sms.id IS NULL THEN RETURN false; END IF;
 IF pay.status <> 'pending' OR pay.deleted_at IS NOT NULL OR pay.expires_at <= now() OR sms.matched_payment_id IS NOT NULL OR NOT sms.is_credit THEN RETURN false; END IF;
 IF sms.trx_id IS NULL OR sms.amount IS NULL OR abs(sms.amount-pay.amount)>0.005 OR sms.account_number IS NULL OR sms.provider IS NULL THEN RETURN false; END IF;
 IF pay.user_verify_trx IS NOT NULL AND pay.user_verify_trx <> sms.trx_id THEN RETURN false; END IF;
 IF pay.provider IS NOT NULL AND pay.provider <> sms.provider THEN RETURN false; END IF;
 SELECT * INTO acct FROM public.merchant_accounts a WHERE a.merchant_id=pay.merchant_id AND a.is_active AND a.provider=sms.provider AND regexp_replace(a.account_number,'\D','','g')=regexp_replace(sms.account_number,'\D','','g') AND (pay.account_number IS NULL OR pay.account_number=a.account_number) AND (sms.account_type IS NULL OR sms.account_type=a.account_type) LIMIT 1;
 IF acct.id IS NULL THEN RETURN false; END IF;
 UPDATE public.sms_transactions SET matched_payment_id=pay.id WHERE id=sms.id;
 UPDATE public.payments SET status='complete',trx_id=sms.trx_id,verified_at=now(),updated_at=now(),provider=sms.provider,account_number=acct.account_number,account_type=acct.account_type WHERE id=pay.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_payment_sms(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_sms(uuid,uuid) TO service_role;