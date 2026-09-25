import { cn } from "@/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden {...props} />;
}

export { Skeleton };
