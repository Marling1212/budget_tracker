-- Add icon and color columns to categories
ALTER TABLE public.categories 
ADD COLUMN icon TEXT NOT NULL DEFAULT 'Tag',
ADD COLUMN color TEXT NOT NULL DEFAULT '#6366f1';
