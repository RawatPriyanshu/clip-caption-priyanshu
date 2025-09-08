import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface BatchJob {
  id: string;
  name: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  job_type: string;
  job_config: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  progress: number;
}

export interface QueueItem {
  id: string;
  video_id?: string;
  video_name?: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  retry_count: number;
  max_retries: number;
  error_message?: string;
  progress: number;
  processing_stage?: string;
  stage_progress: number;
  metadata?: any;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface BatchProcessingOptions {
  name: string;
  jobType?: string;
  maxRetries?: number;
  concurrency?: number;
  priority?: number;
  jobConfig?: any;
}

export const useBatchProcessing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  });

  const realtimeChannelRef = useRef<any>(null);
  const processingQueueRef = useRef<Map<string, boolean>>(new Map());

  // Fetch batch jobs
  const fetchBatchJobs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_batch_jobs', {
        _user_id: user.id
      });

      if (error) throw error;

      setBatchJobs((data || []) as BatchJob[]);
      
      // Update stats
      const stats = (data || []).reduce((acc, job) => {
        acc.totalJobs++;
        if (job.status === 'processing') acc.activeJobs++;
        if (job.status === 'completed') acc.completedJobs++;
        if (job.status === 'failed') acc.failedJobs++;
        return acc;
      }, { totalJobs: 0, activeJobs: 0, completedJobs: 0, failedJobs: 0 });
      
      setProcessingStats(stats);
    } catch (error) {
      console.error('Error fetching batch jobs:', error);
      toast({
        title: "Error loading batch jobs",
        description: "Failed to load your batch processing history.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Fetch queue items for a specific batch job
  const fetchQueueItems = useCallback(async (batchJobId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_batch_queue_items', {
        _batch_job_id: batchJobId
      });

      if (error) throw error;
      setQueueItems((data || []) as QueueItem[]);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      toast({
        title: "Error loading queue items",
        description: "Failed to load queue details.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create a new batch job
  const createBatchJob = useCallback(async (
    videoFiles: File[],
    options: BatchProcessingOptions
  ): Promise<string | null> => {
    if (!user) return null;

    setLoading(true);
    try {
      // Create batch job
      const { data: batchJob, error: jobError } = await supabase
        .from('batch_jobs')
        .insert({
          user_id: user.id,
          name: options.name,
          total_items: videoFiles.length,
          job_type: options.jobType || 'video_processing',
          job_config: options.jobConfig || {}
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Upload videos and create queue items
      const queueItemPromises = videoFiles.map(async (file, index) => {
        try {
          // Upload video file
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Create video record
          const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .insert({
              user_id: user.id,
              name: file.name,
              original_filename: file.name,
              file_size: file.size,
              file_path: uploadData.path,
              processing_status: 'pending'
            })
            .select()
            .single();

          if (videoError) throw videoError;

          // Create queue item
          const { error: queueError } = await supabase
            .from('queue_items')
            .insert({
              batch_job_id: batchJob.id,
              video_id: videoData.id,
              priority: options.priority || index,
              max_retries: options.maxRetries || 3,
              metadata: {
                originalFileName: file.name,
                fileSize: file.size
              }
            });

          if (queueError) throw queueError;

          return { success: true, videoId: videoData.id };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return { success: false, error: error.message, fileName: file.name };
        }
      });

      const results = await Promise.all(queueItemPromises);
      const failedUploads = results.filter(r => !r.success);

      if (failedUploads.length > 0) {
        toast({
          title: "Partial Upload Success",
          description: `${results.length - failedUploads.length}/${results.length} files uploaded successfully.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Batch Job Created",
          description: `Successfully created batch job with ${videoFiles.length} items.`,
        });
      }

      // Update batch job progress
      await supabase.rpc('update_batch_job_progress', {
        _batch_job_id: batchJob.id
      });

      await fetchBatchJobs();
      return batchJob.id;

    } catch (error) {
      console.error('Error creating batch job:', error);
      toast({
        title: "Batch Job Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchBatchJobs]);

  // Process queue items with error recovery
  const processQueueItem = useCallback(async (
    queueItemId: string,
    processor: (item: QueueItem) => Promise<void>
  ) => {
    if (processingQueueRef.current.has(queueItemId)) return;

    processingQueueRef.current.set(queueItemId, true);

    try {
      // Get current queue item
      const { data: item, error: itemError } = await supabase
        .from('queue_items')
        .select('*')
        .eq('id', queueItemId)
        .single();

      if (itemError || !item) throw new Error('Queue item not found');

      // Update status to processing
      await supabase
        .from('queue_items')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', queueItemId);

      // Process the item
      await processor(item as QueueItem);

      // Mark as completed
      await supabase
        .from('queue_items')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItemId);

    } catch (error) {
      console.error(`Error processing queue item ${queueItemId}:`, error);
      
      // Get current retry count
      const { data: currentItem } = await supabase
        .from('queue_items')
        .select('retry_count, max_retries')
        .eq('id', queueItemId)
        .single();

      const retryCount = (currentItem?.retry_count || 0) + 1;
      const maxRetries = currentItem?.max_retries || 3;

      if (retryCount <= maxRetries) {
        // Schedule retry
        await supabase
          .from('queue_items')
          .update({
            status: 'retrying',
            retry_count: retryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', queueItemId);

        // Retry after a delay
        setTimeout(() => {
          processingQueueRef.current.delete(queueItemId);
          processQueueItem(queueItemId, processor);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        // Mark as failed
        await supabase
          .from('queue_items')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', queueItemId);
      }
    } finally {
      // Update batch job progress
      const queueItem = await supabase
        .from('queue_items')
        .select('batch_job_id')
        .eq('id', queueItemId)
        .single();

      if (queueItem.data) {
        await supabase.rpc('update_batch_job_progress', {
          _batch_job_id: queueItem.data.batch_job_id
        });
      }

      processingQueueRef.current.delete(queueItemId);
    }
  }, []);

  // Cancel batch job
  const cancelBatchJob = useCallback(async (batchJobId: string) => {
    try {
      // Update batch job status
      await supabase
        .from('batch_jobs')
        .update({ status: 'cancelled' })
        .eq('id', batchJobId);

      // Cancel pending queue items
      await supabase
        .from('queue_items')
        .update({ status: 'cancelled' })
        .eq('batch_job_id', batchJobId)
        .in('status', ['pending', 'retrying']);

      toast({
        title: "Batch Job Cancelled",
        description: "The batch job has been cancelled successfully.",
      });

      await fetchBatchJobs();
    } catch (error) {
      console.error('Error cancelling batch job:', error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel the batch job.",
        variant: "destructive",
      });
    }
  }, [toast, fetchBatchJobs]);

  // Retry failed items
  const retryFailedItems = useCallback(async (batchJobId: string) => {
    try {
      await supabase
        .from('queue_items')
        .update({
          status: 'pending',
          retry_count: 0,
          error_message: null
        })
        .eq('batch_job_id', batchJobId)
        .eq('status', 'failed');

      toast({
        title: "Retry Initiated",
        description: "Failed items have been queued for retry.",
      });

      await fetchQueueItems(batchJobId);
    } catch (error) {
      console.error('Error retrying failed items:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry the items.",
        variant: "destructive",
      });
    }
  }, [toast, fetchQueueItems]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('batch-processing')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Batch job update:', payload);
          fetchBatchJobs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_items'
        },
        (payload) => {
          console.log('Queue item update:', payload);
          // Update current queue items if viewing a specific batch
          if (queueItems.length > 0) {
            const currentBatchId = queueItems[0]?.id;
            if (currentBatchId) {
              fetchQueueItems(currentBatchId);
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBatchJobs, fetchQueueItems, queueItems.length]);

  // Initial load
  useEffect(() => {
    fetchBatchJobs();
  }, [fetchBatchJobs]);

  return {
    // State
    batchJobs,
    queueItems,
    loading,
    processingStats,

    // Actions
    createBatchJob,
    fetchBatchJobs,
    fetchQueueItems,
    processQueueItem,
    cancelBatchJob,
    retryFailedItems
  };
};