import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { BatchJobCard } from '@/components/batch/BatchJobCard';
import { QueueItemCard } from '@/components/batch/QueueItemCard';
import { useBatchProcessing } from '@/hooks/useBatchProcessing';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queueManager } from '@/services/queueManager';

export default function BatchProcessing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    batchJobs,
    queueItems,
    loading,
    processingStats,
    createBatchJob,
    fetchBatchJobs,
    fetchQueueItems,
    cancelBatchJob,
    retryFailedItems
  } = useBatchProcessing();

  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createJobForm, setCreateJobForm] = useState({
    name: '',
    description: '',
    files: [] as File[]
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  // Set up queue manager processors
  useEffect(() => {
    // Register video processing processor
    queueManager.registerProcessor('video_processing', async (item, updateProgress) => {
      try {
        await updateProgress(10, 'Initializing');
        
        // Simulate video processing steps
        await new Promise(resolve => setTimeout(resolve, 1000));
        await updateProgress(30, 'Extracting audio');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        await updateProgress(60, 'Generating transcription');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        await updateProgress(80, 'Creating metadata');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await updateProgress(100, 'Complete');
        
      } catch (error) {
        console.error('Processing error:', error);
        throw error;
      }
    });
  }, []);

  const handleCreateJob = async () => {
    if (!createJobForm.name.trim() || createJobForm.files.length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please provide a job name and select files.",
        variant: "destructive",
      });
      return;
    }

    const jobId = await createBatchJob(createJobForm.files, {
      name: createJobForm.name,
      jobType: 'video_processing',
      maxRetries: 3,
      priority: 1,
      jobConfig: {
        description: createJobForm.description
      }
    });

    if (jobId) {
      setShowCreateDialog(false);
      setCreateJobForm({ name: '', description: '', files: [] });
      
      // Start processing the job
      setTimeout(() => {
        queueManager.startProcessing(jobId);
      }, 1000);
    }
  };

  const handleStartJob = async (jobId: string) => {
    try {
      await queueManager.startProcessing(jobId);
      toast({
        title: "Job Started",
        description: "Batch processing has been started.",
      });
    } catch (error) {
      toast({
        title: "Start Failed",
        description: "Failed to start the batch job.",
        variant: "destructive",
      });
    }
  };

  const handlePauseJob = async (jobId: string) => {
    try {
      await queueManager.pauseBatchJob(jobId);
      toast({
        title: "Job Paused",
        description: "Batch processing has been paused.",
      });
    } catch (error) {
      toast({
        title: "Pause Failed",
        description: "Failed to pause the batch job.",
        variant: "destructive",
      });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    await cancelBatchJob(jobId);
  };

  const handleRetryJob = async (jobId: string) => {
    await retryFailedItems(jobId);
  };

  const handleViewDetails = (jobId: string) => {
    setSelectedJob(jobId);
    fetchQueueItems(jobId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCreateJobForm(prev => ({ ...prev, files }));
  };

  if (!user) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (loading && batchJobs.length === 0) {
    return <LoadingScreen message="Loading batch jobs..." />;
  }

  return (
    <ErrorBoundary>
      <ResponsiveContainer size="xl" className="py-responsive">
        <div className="space-responsive">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-responsive-2xl font-bold">Batch Processing</h1>
              <p className="text-responsive-base text-muted-foreground">
                Manage and monitor your batch video processing jobs
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Batch Job
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Batch Job</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="job-name">Job Name</Label>
                      <Input
                        id="job-name"
                        value={createJobForm.name}
                        onChange={(e) => setCreateJobForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter job name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="job-description">Description (Optional)</Label>
                      <Textarea
                        id="job-description"
                        value={createJobForm.description}
                        onChange={(e) => setCreateJobForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this batch job"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="job-files">Video Files</Label>
                      <Input
                        id="job-files"
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handleFileChange}
                      />
                      {createJobForm.files.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {createJobForm.files.length} files selected
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateJob}>
                        Create Job
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={fetchBatchJobs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{processingStats.totalJobs}</p>
                  </div>
                  <Badge variant="secondary">{processingStats.totalJobs}</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{processingStats.activeJobs}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{processingStats.activeJobs}</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{processingStats.completedJobs}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{processingStats.completedJobs}</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold">{processingStats.failedJobs}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">{processingStats.failedJobs}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Batch Jobs List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold">Batch Jobs</h2>
              
              {batchJobs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No batch jobs found.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first batch job to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {batchJobs.map((job) => (
                    <BatchJobCard
                      key={job.id}
                      job={job}
                      onStart={handleStartJob}
                      onPause={handlePauseJob}
                      onCancel={handleCancelJob}
                      onRetry={handleRetryJob}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Queue Items Panel */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Queue Details</h2>
              
              {selectedJob ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Queue Items</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedJob(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {queueItems.length === 0 ? (
                    <Card>
                      <CardContent className="p-4 text-center text-sm text-muted-foreground">
                        No queue items found
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {queueItems.map((item) => (
                        <QueueItemCard
                          key={item.id}
                          item={item}
                          onRetry={(itemId) => {
                            // Handle individual item retry
                            console.log('Retry item:', itemId);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      Select a batch job to view queue details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </ErrorBoundary>
  );
}