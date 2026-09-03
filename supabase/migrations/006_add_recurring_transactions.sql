CREATE TABLE public.recurring_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    note TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    next_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring transactions" 
ON public.recurring_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring transactions" 
ON public.recurring_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions" 
ON public.recurring_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions" 
ON public.recurring_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.transactions
ADD COLUMN recurring_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;
