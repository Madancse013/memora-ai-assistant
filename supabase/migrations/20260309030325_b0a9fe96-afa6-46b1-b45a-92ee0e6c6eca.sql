-- Fix overly permissive api_logs insert policy
DROP POLICY "System can insert api logs" ON public.api_logs;
CREATE POLICY "Authenticated users can insert api logs" ON public.api_logs FOR INSERT WITH CHECK (auth.uid() = user_id);