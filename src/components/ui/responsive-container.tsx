import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full"
};

const paddingStyles = {
  none: "",
  sm: "px-4 sm:px-6",
  md: "px-4 sm:px-6 lg:px-8", 
  lg: "px-4 sm:px-6 lg:px-8 xl:px-12"
};

export function ResponsiveContainer({ 
  children, 
  className,
  size = "lg",
  padding = "md"
}: ResponsiveContainerProps) {
  return (
    <div className={cn(
      "mx-auto w-full",
      sizeStyles[size],
      paddingStyles[padding],
      className
    )}>
      {children}
    </div>
  );
}