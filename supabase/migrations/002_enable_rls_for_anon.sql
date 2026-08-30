-- Enable RLS for all anonymous users (for local testing/prototype without auth)
CREATE POLICY "Enable all for anon on categories" 
ON "public"."categories" 
FOR ALL TO anon 
USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on transactions" 
ON "public"."transactions" 
FOR ALL TO anon 
USING (true) WITH CHECK (true);
