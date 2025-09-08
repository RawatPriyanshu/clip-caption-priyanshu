import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
  overlay?: boolean;
}

export function LoadingScreen({ 
  message = "Loading...", 
  className,
  overlay = false 
}: LoadingScreenProps) {
  const containerClasses = overlay 
    ? "fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
    : "min-h-screen";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      containerClasses,
      className
    )}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{message}</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Please wait while we process your request...
          </p>
        </div>
      </div>
    </div>
  );
}