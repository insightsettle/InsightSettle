CREATE FUNCTION public.staff_search_email(_actor uuid,_query text) RETURNS TABLE(id uuid,email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT (public.has_role(_actor,'admin') OR public.has_role(_actor,'staff')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _query IS NULL OR length(trim(_query))<2 OR length(_query)>120 THEN RAISE EXCEPTION 'Invalid search'; END IF;
 RETURN QUERY SELECT u.id,u.email::text FROM auth.users u WHERE position(lower(_query) in lower(u.email))>0 ORDER BY u.email LIMIT 20;
END $$;
REVOKE ALL ON FUNCTION public.staff_search_email(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_search_email(uuid,text) TO service_role;