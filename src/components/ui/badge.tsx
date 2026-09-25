import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-stone-100 text-stone-700",
        terracotta: "bg-terracotta-100 text-terracotta-700",
        bronze: "bg-bronze-100 text-bronze-700",
        sage: "bg-sage-100 text-sage-700",
        teal: "bg-teal-soft-100 text-teal-soft-700",
        plum: "bg-plum-100 text-plum-700",
        danger: "bg-[#f6e1de] text-[#9e3b32]",
        muted: "bg-stone-200/70 text-stone-600",
        dark: "bg-charcoal text-cream",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
