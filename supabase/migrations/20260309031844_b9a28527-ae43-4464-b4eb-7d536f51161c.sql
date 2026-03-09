
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions;

-- Add category column to habits for AI classification
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Add risk_score column to decisions for risk analytics
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS risk_score integer;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS pros jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS cons jsonb DEFAULT '[]'::jsonb;
