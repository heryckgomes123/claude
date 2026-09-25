"use client";

import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-border !bg-card !text-foreground !shadow-lifted !font-sans",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-sage-500",
          error: "[&_[data-icon]]:!text-destructive",
        },
      }}
    />
  );
}

export { Toaster };
