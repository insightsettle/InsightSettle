CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, pdpl_consent_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone',
          NULLIF(NEW.raw_user_meta_data->>'pdpl_consent_at','')::timestamptz)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;