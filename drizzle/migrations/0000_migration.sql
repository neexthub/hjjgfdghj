CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nagad_number text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'nagad',
  account_number text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  callback_secret text DEFAULT encode(gen_random_bytes(32),'hex'),
  website_origin text, callback_url text, success_url text, callback_api_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.merchant_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_number text NOT NULL,
  account_type text NOT NULL DEFAULT 'personal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'ingest',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gateway_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  label text, phone_number text, last_ip text, last_seen_at timestamptz,
  platform text NOT NULL DEFAULT 'android',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  order_id text, customer_name text, customer_phone text, customer_user_id text,
  provider text, account_number text, account_type text,
  trx_id text, user_verify_trx text, store_trx text,
  gateway_trx uuid NOT NULL DEFAULT gen_random_uuid(),
  redirect_url text, callback_url text, callback_api_key text,
  callback_status text, callback_sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz, deleted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_gateway_trx_unique ON public.payments(gateway_trx);
CREATE UNIQUE INDEX payments_store_reference_unique ON public.payments(merchant_id,store_trx) WHERE store_trx IS NOT NULL;
CREATE INDEX payments_pending_expiry ON public.payments(expires_at) WHERE status='pending';

CREATE TABLE public.sms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  body text NOT NULL,
  provider text, account_type text, account_number text,
  amount numeric(12,2), trx_id text,
  is_credit boolean NOT NULL DEFAULT false,
  device_id text,
  matched_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sms_trx_idx ON public.sms_transactions(trx_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['merchants','merchant_accounts','api_keys','gateway_devices','payments','sms_transactions'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "admins manage" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

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