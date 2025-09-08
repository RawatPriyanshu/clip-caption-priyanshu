import { supabase } from '@/integrations/supabase/client';

export interface QueueManagerOptions {
  concurrency: number;
  retryDelay: number;
  maxRetries: number;
}

export interface ProcessorFunction<T = any> {
  (item: T, updateProgress: (progress: number, stage?: string) => Promise<void>): Promise<void>;
}

export class QueueManager {
  private processing = new Map<string, boolean>();
  private processors = new Map<string, ProcessorFunction>();
  private options: QueueManagerOptions;

  constructor(options: Partial<QueueManagerOptions> = {}) {
    this.options = {
      concurrency: 3,
      retryDelay: 1000,
      maxRetries: 3,
      ...options
    };
  }

  // Register a processor for a specific job type
  registerProcessor<T = any>(jobType: string, processor: ProcessorFunction<T>) {
    this.processors.set(jobType, processor);
  }

  // Start processing queue items
  async startProcessing(batchJobId: string) {
    try {
      const { data: batchJob, error: batchError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', batchJobId)
        .single();

      if (batchError || !batchJob) {
        throw new Error('Batch job not found');
      }

      // Get pending queue items
      const { data: queueItems, error: queueError } = await supabase
        .from('queue_items')
        .select('*')
        .eq('batch_job_id', batchJobId)
        .in('status', ['pending', 'retrying'])
        .order('priority', { ascending: false })
        .order('created_at');

      if (queueError) throw queueError;

      if (!queueItems || queueItems.length === 0) {
        console.log('No items to process in queue');
        return;
      }

      // Update batch job to processing
      await supabase
        .from('batch_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', batchJobId);

      // Process items with concurrency control
      const semaphore = new Semaphore(this.options.concurrency);
      const processingPromises = queueItems.map(item =>
        semaphore.acquire().then(async (release) => {
          try {
            await this.processItem(item);
          } finally {
            release();
          }
        })
      );

      await Promise.allSettled(processingPromises);

      // Update final batch job status
      await supabase.rpc('update_batch_job_progress', {
        _batch_job_id: batchJobId
      });

    } catch (error) {
      console.error('Error in queue processing:', error);
      
      // Mark batch job as failed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', batchJobId);
    }
  }

  // Process individual queue item
  private async processItem(item: any) {
    if (this.processing.has(item.id)) {
      return; // Already processing
    }

    this.processing.set(item.id, true);

    try {
      // Update item status to processing
      await supabase
        .from('queue_items')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', item.id);

      // Get the appropriate processor
      const batchJob = await supabase
        .from('batch_jobs')
        .select('job_type')
        .eq('id', item.batch_job_id)
        .single();

      const jobType = batchJob.data?.job_type || 'default';
      const processor = this.processors.get(jobType);

      if (!processor) {
        throw new Error(`No processor registered for job type: ${jobType}`);
      }

      // Create progress update function
      const updateProgress = async (progress: number, stage?: string) => {
        await supabase
          .from('queue_items')
          .update({
            progress: Math.min(100, Math.max(0, progress)),
            processing_stage: stage,
            stage_progress: progress
          })
          .eq('id', item.id);
      };

      // Process the item
      await processor(item, updateProgress);

      // Mark as completed
      await supabase
        .from('queue_items')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id);

    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      await this.handleProcessingError(item, error);
    } finally {
      this.processing.delete(item.id);
    }
  }

  // Handle processing errors with retry logic
  private async handleProcessingError(item: any, error: any) {
    const retryCount = (item.retry_count || 0) + 1;
    const maxRetries = item.max_retries || this.options.maxRetries;

    if (retryCount <= maxRetries) {
      // Schedule retry with exponential backoff
      const delay = this.options.retryDelay * Math.pow(2, retryCount - 1);
      
      await supabase
        .from('queue_items')
        .update({
          status: 'retrying',
          retry_count: retryCount,
          error_message: error.message || 'Unknown error'
        })
        .eq('id', item.id);

      // Retry after delay
      setTimeout(async () => {
        await this.processItem({ ...item, retry_count: retryCount });
      }, delay);

    } else {
      // Mark as permanently failed
      await supabase
        .from('queue_items')
        .update({
          status: 'failed',
          error_message: error.message || 'Maximum retries exceeded',
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id);
    }
  }

  // Pause processing for a batch job
  async pauseBatchJob(batchJobId: string) {
    await supabase
      .from('batch_jobs')
      .update({ status: 'paused' })
      .eq('id', batchJobId);
  }

  // Resume processing for a batch job
  async resumeBatchJob(batchJobId: string) {
    await supabase
      .from('batch_jobs')
      .update({ status: 'processing' })
      .eq('id', batchJobId);
    
    await this.startProcessing(batchJobId);
  }

  // Cancel processing for a batch job
  async cancelBatchJob(batchJobId: string) {
    // Update batch job status
    await supabase
      .from('batch_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', batchJobId);

    // Cancel pending items
    await supabase
      .from('queue_items')
      .update({ status: 'cancelled' })
      .eq('batch_job_id', batchJobId)
      .in('status', ['pending', 'retrying']);
  }

  // Get queue statistics
  async getQueueStats(batchJobId: string) {
    const { data, error } = await supabase
      .from('queue_items')
      .select('status')
      .eq('batch_job_id', batchJobId);

    if (error) throw error;

    const stats = (data || []).reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data?.length || 0,
      pending: stats.pending || 0,
      processing: stats.processing || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      cancelled: stats.cancelled || 0,
      retrying: stats.retrying || 0
    };
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release() {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next?.();
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();