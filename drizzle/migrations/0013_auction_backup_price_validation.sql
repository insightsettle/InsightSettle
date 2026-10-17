DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.record_auction_winner(uuid,uuid,jsonb)'::regprocedure) INTO def;
 def:=replace(def,'FOR item IN SELECT value FROM jsonb_array_elements(_bidders) LOOP', 'FOR item IN SELECT value FROM jsonb_array_elements(_bidders) LOOP IF (item->>''price'')::numeric IS NULL OR (item->>''price'')::numeric<=0 OR (item->>''price'')::numeric<>round((item->>''price'')::numeric,CASE WHEN a.currency IN (''BHD'',''KWD'',''OMR'') THEN 3 ELSE 2 END) THEN RAISE EXCEPTION ''Every bidder price must use currency minor units''; END IF;');
 EXECUTE def;
END $$;