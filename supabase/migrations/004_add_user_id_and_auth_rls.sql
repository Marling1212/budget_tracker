-- 1. Clear existing public data to ensure data integrity with the new NOT NULL constraint
DELETE FROM public.transactions;
DELETE FROM public.categories;

-- 2. Drop the old anonymous RLS policies
DROP POLICY IF EXISTS "Enable all for anon on categories" ON "public"."categories";
DROP POLICY IF EXISTS "Enable all for anon on transactions" ON "public"."transactions";

-- 3. Add user_id column
ALTER TABLE public.categories 
ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE public.transactions 
ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid();

-- 4. Enable RLS (just to be safe, though it should already be enabled)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. Create new RLS policies for authenticated users
-- Categories
CREATE POLICY "Users can view their own categories" 
ON public.categories FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" 
ON public.categories FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions FOR DELETE TO authenticated 
USING (auth.uid() = user_id);
