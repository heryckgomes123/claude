"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/utils/cn";

/** Drawer lateral (desktop) / inferior (mobile). */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "right" | "left" | "bottom" }) {
  const position = {
    right:
      "inset-y-0 right-0 h-full w-full sm:max-w-md border-l data-[state=open]:animate-[slide-in-right_220ms_cubic-bezier(0.16,1,0.3,1)]",
    left: "inset-y-0 left-0 h-full w-[86%] max-w-xs border-r data-[state=open]:animate-[slide-in-left_220ms_cubic-bezier(0.16,1,0.3,1)]",
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t data-[state=open]:animate-slide-up",
  }[side];
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content className={cn("fixed z-50 flex flex-col bg-card shadow-lifted outline-none", position, className)} {...props}>
        {children}
        <SheetPrimitive.Close
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 space-y-1 border-b border-border/70 px-6 pt-5 pb-4 pr-12", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("font-display text-2xl font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-6 py-5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("pb-safe flex shrink-0 flex-wrap gap-2 border-t border-border/70 bg-muted/40 px-6 py-4", className)} {...props} />
  );
}

export { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
