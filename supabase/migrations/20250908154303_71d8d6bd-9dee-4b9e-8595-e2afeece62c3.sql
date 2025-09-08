-- Create batch processing tables
CREATE TABLE public.batch_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  job_type TEXT NOT NULL DEFAULT 'video_processing',
  job_config JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.queue_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_job_id UUID NOT NULL REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  progress REAL NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
  processing_stage TEXT,
  stage_progress REAL NOT NULL DEFAULT 0.0,
  metadata JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_jobs
CREATE POLICY "Users can create their own batch jobs" 
ON public.batch_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own batch jobs" 
ON public.batch_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch jobs" 
ON public.batch_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batch jobs" 
ON public.batch_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all batch jobs" 
ON public.batch_jobs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for queue_items
CREATE POLICY "Users can view queue items for their batch jobs" 
ON public.queue_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.batch_jobs 
  WHERE id = queue_items.batch_job_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create queue items for their batch jobs" 
ON public.queue_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.batch_jobs 
  WHERE id = queue_items.batch_job_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can update queue items for their batch jobs" 
ON public.queue_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.batch_jobs 
  WHERE id = queue_items.batch_job_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can delete queue items for their batch jobs" 
ON public.queue_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.batch_jobs 
  WHERE id = queue_items.batch_job_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Admins can manage all queue items" 
ON public.queue_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_batch_jobs_user_id ON public.batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON public.batch_jobs(created_at DESC);

CREATE INDEX idx_queue_items_batch_job_id ON public.queue_items(batch_job_id);
CREATE INDEX idx_queue_items_status ON public.queue_items(status);
CREATE INDEX idx_queue_items_priority ON public.queue_items(priority DESC);
CREATE INDEX idx_queue_items_created_at ON public.queue_items(created_at);

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_batch_jobs_updated_at
  BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_queue_items_updated_at
  BEFORE UPDATE ON public.queue_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Database functions for batch processing
CREATE OR REPLACE FUNCTION public.get_user_batch_jobs(_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  total_items INTEGER,
  completed_items INTEGER,
  failed_items INTEGER,
  status TEXT,
  job_type TEXT,
  job_config JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  progress REAL
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    bj.id,
    bj.name,
    bj.total_items,
    bj.completed_items,
    bj.failed_items,
    bj.status,
    bj.job_type,
    bj.job_config,
    bj.started_at,
    bj.completed_at,
    bj.created_at,
    CASE 
      WHEN bj.total_items = 0 THEN 0.0
      ELSE (bj.completed_items::REAL / bj.total_items::REAL) * 100.0
    END as progress
  FROM public.batch_jobs bj
  WHERE bj.user_id = _user_id
  ORDER BY bj.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_batch_queue_items(_batch_job_id UUID)
RETURNS TABLE(
  id UUID,
  video_id UUID,
  video_name TEXT,
  priority INTEGER,
  status TEXT,
  retry_count INTEGER,
  max_retries INTEGER,
  error_message TEXT,
  progress REAL,
  processing_stage TEXT,
  stage_progress REAL,
  metadata JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    qi.id,
    qi.video_id,
    v.name as video_name,
    qi.priority,
    qi.status,
    qi.retry_count,
    qi.max_retries,
    qi.error_message,
    qi.progress,
    qi.processing_stage,
    qi.stage_progress,
    qi.metadata,
    qi.started_at,
    qi.completed_at,
    qi.created_at
  FROM public.queue_items qi
  LEFT JOIN public.videos v ON qi.video_id = v.id
  WHERE qi.batch_job_id = _batch_job_id
  ORDER BY qi.priority DESC, qi.created_at ASC;
$function$;

CREATE OR REPLACE FUNCTION public.update_batch_job_progress(_batch_job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total_items INTEGER;
  _completed_items INTEGER;
  _failed_items INTEGER;
  _job_status TEXT;
BEGIN
  -- Get current counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO _total_items, _completed_items, _failed_items
  FROM public.queue_items 
  WHERE batch_job_id = _batch_job_id;

  -- Determine job status
  IF _completed_items + _failed_items = _total_items AND _total_items > 0 THEN
    IF _failed_items = 0 THEN
      _job_status := 'completed';
    ELSE
      _job_status := 'failed';
    END IF;
  ELSIF _completed_items > 0 OR _failed_items > 0 THEN
    _job_status := 'processing';
  ELSE
    _job_status := 'pending';
  END IF;

  -- Update batch job
  UPDATE public.batch_jobs 
  SET 
    total_items = _total_items,
    completed_items = _completed_items,
    failed_items = _failed_items,
    status = _job_status,
    started_at = CASE 
      WHEN started_at IS NULL AND _job_status = 'processing' THEN now()
      ELSE started_at
    END,
    completed_at = CASE 
      WHEN _job_status IN ('completed', 'failed') THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = _batch_job_id;
END;
$function$;

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_items;