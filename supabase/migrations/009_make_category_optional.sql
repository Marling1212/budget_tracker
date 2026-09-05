ALTER TABLE public.transactions ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.recurring_transactions ALTER COLUMN category_id DROP NOT NULL;
