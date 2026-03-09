-- Create storage bucket for learning files
INSERT INTO storage.buckets (id, name, public) VALUES ('learning-files', 'learning-files', false);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own learning files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'learning-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own files
CREATE POLICY "Users can view own learning files" ON storage.objects FOR SELECT USING (bucket_id = 'learning-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "Users can delete own learning files" ON storage.objects FOR DELETE USING (bucket_id = 'learning-files' AND auth.uid()::text = (storage.foldername(name))[1]);