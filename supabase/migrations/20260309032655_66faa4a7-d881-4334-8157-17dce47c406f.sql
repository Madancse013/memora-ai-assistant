
-- Database indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON public.memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_items_user_created ON public.learning_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_created ON public.habits(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_habit ON public.habit_logs(user_id, habit_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_user_created ON public.decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON public.conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_type_period ON public.usage_counters(user_id, counter_type, period);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON public.api_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_files_item ON public.learning_files(learning_item_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_created ON public.voice_sessions(user_id, created_at DESC);

-- Add unique constraint to prevent duplicate learning items
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_items_no_dup ON public.learning_items(user_id, title, category) WHERE content IS NOT NULL;

-- Add token_usage column to usage_counters for token-level tracking
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS token_count integer DEFAULT 0;
