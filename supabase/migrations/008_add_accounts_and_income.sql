-- Create Accounts table
CREATE TABLE public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'CREDIT')),
    balance NUMERIC NOT NULL DEFAULT 0,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
    ON public.accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
    ON public.accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
    ON public.accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
    ON public.accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Add account_id and type to transactions
ALTER TABLE public.transactions
ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER'));

-- Add account_id and type to recurring_transactions
ALTER TABLE public.recurring_transactions
ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER'));

-- Create Trigger to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'EXPENSE' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'INCOME' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.type = 'EXPENSE' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'INCOME' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert old amount
        IF OLD.type = 'EXPENSE' THEN
            UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'INCOME' THEN
            UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
        
        -- Apply new amount
        IF NEW.type = 'EXPENSE' THEN
            UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'INCOME' THEN
            UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();
