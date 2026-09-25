import * as React from "react";
import { cn } from "@/utils/cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-[0.8rem] font-semibold text-secondary-foreground", className)} {...props} />;
}

export { Label };
