"use client";

import { AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Exige um motivo (ex.: cancelamento). */
  reasonLabel?: string;
  onConfirm: (reason?: string) => Promise<boolean | void> | boolean | void;
};

/** Confirmação obrigatória para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive,
  reasonLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setReason("");
        onOpenChange(value);
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          {destructive && (
            <span className="mb-2 grid size-10 place-items-center rounded-xl bg-[#f6e1de] text-destructive">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
          )}
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {reasonLabel && (
          <div className="space-y-1.5 px-6 pb-4">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Voltar
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            loading={pending}
            disabled={Boolean(reasonLabel) && reason.trim().length < 3}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm(reason.trim() || undefined);
                if (result !== false) {
                  setReason("");
                  onOpenChange(false);
                }
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
