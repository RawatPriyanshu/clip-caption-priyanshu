import { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Eye, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedProgress } from '@/components/ui/enhanced-progress';
import { formatDistanceToNow } from 'date-fns';
import { BatchJob } from '@/hooks/useBatchProcessing';

interface BatchJobCardProps {
  job: BatchJob;
  onStart?: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
  onViewDetails?: (jobId: string) => void;
}

const statusIcons = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertCircle
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

export function BatchJobCard({ 
  job, 
  onStart, 
  onPause, 
  onCancel, 
  onRetry, 
  onViewDetails 
}: BatchJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const StatusIcon = statusIcons[job.status];
  const canStart = job.status === 'pending' || job.status === 'failed';
  const canPause = job.status === 'processing';
  const canCancel = job.status === 'pending' || job.status === 'processing';
  const canRetry = job.status === 'failed' && job.failed_items > 0;

  const getProgressVariant = () => {
    if (job.status === 'completed') return 'success';
    if (job.status === 'failed') return 'error';
    if (job.failed_items > 0) return 'warning';
    return 'default';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <StatusIcon 
                className={`h-5 w-5 ${job.status === 'processing' ? 'animate-spin' : ''}`} 
              />
              {job.name}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </div>
              {job.started_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Started {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          
          <Badge className={statusColors[job.status]}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {job.completed_items + job.failed_items}/{job.total_items} items
            </span>
          </div>
          
          <EnhancedProgress 
            value={job.progress} 
            variant={getProgressVariant()}
            animated={job.status === 'processing'}
            className="w-full"
          />
          
          {/* Stats Row */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>✅ {job.completed_items} completed</span>
            {job.failed_items > 0 && (
              <span className="text-destructive">❌ {job.failed_items} failed</span>
            )}
            <span>⏳ {job.total_items - job.completed_items - job.failed_items} remaining</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canStart && onStart && (
            <Button 
              size="sm" 
              onClick={() => onStart(job.id)}
              className="flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Start
            </Button>
          )}
          
          {canPause && onPause && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onPause(job.id)}
              className="flex items-center gap-1"
            >
              <Pause className="h-3 w-3" />
              Pause
            </Button>
          )}
          
          {canCancel && onCancel && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onCancel(job.id)}
              className="flex items-center gap-1"
            >
              <Square className="h-3 w-3" />
              Cancel
            </Button>
          )}
          
          {canRetry && onRetry && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRetry(job.id)}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retry Failed
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onViewDetails(job.id)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Details
            </Button>
          )}
        </div>

        {/* Extended Info */}
        {isExpanded && (
          <div className="pt-3 border-t space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Job Type:</span>
                <br />
                <span className="text-muted-foreground">{job.job_type}</span>
              </div>
              <div>
                <span className="font-medium">Total Items:</span>
                <br />
                <span className="text-muted-foreground">{job.total_items}</span>
              </div>
            </div>
            
            {job.completed_at && (
              <div>
                <span className="font-medium">Completed:</span>
                <br />
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Toggle Details */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </Button>
      </CardContent>
    </Card>
  );
}