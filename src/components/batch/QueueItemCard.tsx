import { 
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Play
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedProgress } from '@/components/ui/enhanced-progress';
import { formatDistanceToNow } from 'date-fns';
import { QueueItem } from '@/hooks/useBatchProcessing';

interface QueueItemCardProps {
  item: QueueItem;
  onRetry?: (itemId: string) => void;
}

const statusIcons = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: AlertTriangle,
  retrying: RotateCcw
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  retrying: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};

export function QueueItemCard({ item, onRetry }: QueueItemCardProps) {
  const StatusIcon = statusIcons[item.status];
  const isAnimated = item.status === 'processing' || item.status === 'retrying';

  const getProgressVariant = () => {
    if (item.status === 'completed') return 'success';
    if (item.status === 'failed') return 'error';
    if (item.status === 'retrying') return 'warning';
    return 'default';
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    const end = endTime ? new Date(endTime) : new Date();
    const start = new Date(startTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon 
                className={`h-4 w-4 flex-shrink-0 ${isAnimated ? 'animate-spin' : ''}`} 
              />
              <h4 className="font-medium text-sm truncate">
                {item.video_name || `Item ${item.id.slice(0, 8)}`}
              </h4>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Priority: {item.priority}</span>
              {item.started_at && (
                <span>
                  Duration: {formatDuration(item.started_at, item.completed_at)}
                </span>
              )}
            </div>
          </div>
          
          <Badge className={statusColors[item.status]} variant="secondary">
            {item.status}
          </Badge>
        </div>

        {/* Progress */}
        {(item.status === 'processing' || item.status === 'retrying' || item.progress > 0) && (
          <div className="mb-3">
            {item.processing_stage && (
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-muted-foreground">{item.processing_stage}</span>
                <span className="text-muted-foreground">{Math.round(item.progress)}%</span>
              </div>
            )}
            
            <EnhancedProgress 
              value={item.progress} 
              variant={getProgressVariant()}
              size="sm"
              animated={isAnimated}
            />
          </div>
        )}

        {/* Error Message */}
        {item.error_message && item.status === 'failed' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-3">
            <p className="text-xs text-destructive font-medium mb-1">Error:</p>
            <p className="text-xs text-destructive/80">{item.error_message}</p>
            {item.retry_count > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Retried {item.retry_count}/{item.max_retries} times
              </p>
            )}
          </div>
        )}

        {/* Retry Info */}
        {item.status === 'retrying' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-2 mb-3">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Retry {item.retry_count}/{item.max_retries} in progress...
            </p>
          </div>
        )}

        {/* Metadata */}
        {item.metadata && (
          <div className="text-xs text-muted-foreground space-y-1">
            {item.metadata.originalFileName && (
              <div>File: {item.metadata.originalFileName}</div>
            )}
            {item.metadata.fileSize && (
              <div>Size: {Math.round(item.metadata.fileSize / 1024 / 1024)}MB</div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>
            Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          
          {item.status === 'failed' && onRetry && item.retry_count < item.max_retries && (
            <button
              onClick={() => onRetry(item.id)}
              className="text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}