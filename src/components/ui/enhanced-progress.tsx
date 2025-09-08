import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface EnhancedProgressProps 
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  label?: string;
  showValue?: boolean;
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const variantStyles = {
  default: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500", 
  error: "bg-destructive"
};

const sizeStyles = {
  sm: "h-2",
  md: "h-4", 
  lg: "h-6"
};

const EnhancedProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  EnhancedProgressProps
>(({ 
  className, 
  value, 
  label, 
  showValue = false,
  variant = "default",
  size = "md",
  animated = true,
  ...props 
}, ref) => {
  const progressValue = Math.min(100, Math.max(0, value || 0));

  return (
    <div className="w-full space-y-2">
      {(label || showValue) && (
        <div className="flex justify-between items-center text-sm">
          {label && (
            <span className="font-medium text-foreground">{label}</span>
          )}
          {showValue && (
            <span className="text-muted-foreground">
              {Math.round(progressValue)}%
            </span>
          )}
        </div>
      )}
      
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-500 ease-out",
            variantStyles[variant],
            animated && "animate-pulse"
          )}
          style={{ transform: `translateX(-${100 - progressValue}%)` }}
        />
        
        {animated && progressValue > 0 && progressValue < 100 && (
          <div 
            className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{
              left: `${progressValue - 8}%`,
              transition: 'left 0.5s ease-out'
            }}
          />
        )}
      </ProgressPrimitive.Root>
    </div>
  );
});

EnhancedProgress.displayName = "EnhancedProgress";

export { EnhancedProgress };