ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.gateway_devices ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.sms_transactions ADD COLUMN IF NOT EXISTS owner_id uuid;

UPDATE public.merchants SET owner_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.api_keys k SET owner_id = COALESCE((SELECT m.owner_id FROM public.merchants m WHERE m.id = k.merchant_id), (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)) WHERE owner_id IS NULL;
UPDATE public.gateway_devices d SET owner_id = (SELECT k.owner_id FROM public.api_keys k WHERE k.id = d.api_key_id) WHERE owner_id IS NULL;
UPDATE public.sms_transactions s SET owner_id = (SELECT d.owner_id FROM public.gateway_devices d WHERE d.device_id = s.device_id) WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS merchants_owner_idx ON public.merchants(owner_id);
CREATE INDEX IF NOT EXISTS api_keys_owner_idx ON public.api_keys(owner_id);
CREATE INDEX IF NOT EXISTS gateway_devices_owner_idx ON public.gateway_devices(owner_id);
CREATE INDEX IF NOT EXISTS sms_owner_received_idx ON public.sms_transactions(owner_id, received_at DESC);

CREATE OR REPLACE FUNCTION public.set_device_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.owner_id := (SELECT owner_id FROM public.api_keys WHERE id = NEW.api_key_id);
  RETURN NEW;
END $$;
CREATE TRIGGER gateway_devices_owner BEFORE INSERT OR UPDATE OF api_key_id ON public.gateway_devices FOR EACH ROW EXECUTE FUNCTION public.set_device_owner();

CREATE OR REPLACE FUNCTION public.set_sms_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := (SELECT owner_id FROM public.gateway_devices WHERE device_id = NEW.device_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sms_transactions_owner BEFORE INSERT ON public.sms_transactions FOR EACH ROW EXECUTE FUNCTION public.set_sms_owner();

CREATE OR REPLACE FUNCTION public.owns_merchant(_merchant uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.merchants WHERE id = _merchant AND owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS "admins manage" ON public.merchants;
DROP POLICY IF EXISTS "admins manage" ON public.merchant_accounts;
DROP POLICY IF EXISTS "admins manage" ON public.payments;
DROP POLICY IF EXISTS "admins manage" ON public.api_keys;
DROP POLICY IF EXISTS "admins manage" ON public.gateway_devices;
DROP POLICY IF EXISTS "admins manage" ON public.sms_transactions;

CREATE POLICY "owner manages" ON public.merchants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "owner manages" ON public.merchant_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.owns_merchant(merchant_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.owns_merchant(merchant_id));
CREATE POLICY "owner manages" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND public.owns_merchant(merchant_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.owns_merchant(merchant_id));
CREATE POLICY "owner manages" ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid() AND (merchant_id IS NULL OR public.owns_merchant(merchant_id)));
CREATE POLICY "owner manages" ON public.gateway_devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());
CREATE POLICY "owner manages" ON public.sms_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.purge_unmatched_sms() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.sms_transactions WHERE matched_payment_id IS NULL AND received_at < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.purge_unmatched_sms() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_unmatched_sms() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('purge-unmatched-sms', '15 * * * *', 'SELECT public.purge_unmatched_sms()');