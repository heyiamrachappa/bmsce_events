import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm ring-offset-background transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50 focus-visible:bg-card/80 disabled:cursor-not-allowed disabled:opacity-50 hover:border-border/80 hover:bg-accent/60 font-medium",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
