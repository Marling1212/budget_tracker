-- Add tags array to transactions
ALTER TABLE public.transactions
ADD COLUMN tags TEXT[] DEFAULT '{}'::TEXT[];

-- Ensure the column is indexed for better search performance in the future
CREATE INDEX idx_transactions_tags ON public.transactions USING GIN (tags);
