-- Phase 1: Database Schema Enhancement

-- Create storage buckets for video thumbnails and videos
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('video-thumbnails', 'video-thumbnails', true),
  ('videos', 'videos', false);

-- Create videos table to store video information
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration REAL,
  file_path TEXT,
  thumbnail_url TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on videos table
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for videos
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all videos" 
ON public.videos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create video_metadata table to store generated metadata for each platform
CREATE TABLE public.video_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'youtube', 'instagram', 'tiktok'
  title TEXT,
  description TEXT,
  hashtags TEXT[],
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, platform)
);

-- Enable RLS on video_metadata table
ALTER TABLE public.video_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_metadata (inherit from videos table)
CREATE POLICY "Users can view metadata for their videos" 
ON public.video_metadata 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_metadata.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create metadata for their videos" 
ON public.video_metadata 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_metadata.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update metadata for their videos" 
ON public.video_metadata 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_metadata.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete metadata for their videos" 
ON public.video_metadata 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = video_metadata.video_id 
    AND videos.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all video metadata" 
ON public.video_metadata 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update generations table to properly link to videos
ALTER TABLE public.generations 
ADD COLUMN video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
ADD COLUMN metadata_generated JSONB,
ADD COLUMN processing_duration INTEGER; -- in seconds

-- Create indexes for better performance
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_processing_status ON public.videos(processing_status);
CREATE INDEX idx_video_metadata_video_id ON public.video_metadata(video_id);
CREATE INDEX idx_video_metadata_platform ON public.video_metadata(platform);
CREATE INDEX idx_generations_video_id ON public.generations(video_id);

-- Create trigger for video updated_at
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for video_metadata updated_at
CREATE TRIGGER update_video_metadata_updated_at
BEFORE UPDATE ON public.video_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage policies for video thumbnails
CREATE POLICY "Thumbnail images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Users can upload their own thumbnails" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own thumbnails" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own thumbnails" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for videos (private)
CREATE POLICY "Users can view their own videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create database functions for video management
CREATE OR REPLACE FUNCTION public.get_user_videos(_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  original_filename TEXT,
  file_size BIGINT,
  duration REAL,
  thumbnail_url TEXT,
  processing_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata_count BIGINT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.name,
    v.original_filename,
    v.file_size,
    v.duration,
    v.thumbnail_url,
    v.processing_status,
    v.created_at,
    COUNT(vm.id) as metadata_count
  FROM public.videos v
  LEFT JOIN public.video_metadata vm ON v.id = vm.video_id
  WHERE v.user_id = _user_id
  GROUP BY v.id, v.name, v.original_filename, v.file_size, v.duration, v.thumbnail_url, v.processing_status, v.created_at
  ORDER BY v.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_video_metadata(_video_id UUID)
RETURNS TABLE (
  platform TEXT,
  title TEXT,
  description TEXT,
  hashtags TEXT[],
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    platform,
    title,
    description,
    hashtags,
    additional_data,
    created_at
  FROM public.video_metadata
  WHERE video_id = _video_id
  ORDER BY created_at DESC;
$$;