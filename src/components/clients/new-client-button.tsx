"use client";

import { UserPlus } from "lucide-react";
import { useCan } from "@/components/layout/app-context";
import { useQuickActions } from "@/components/layout/quick-actions";
import { Button } from "@/components/ui/button";

export function NewClientButton() {
  const can = useCan();
  const { newClient } = useQuickActions();
  if (!can("clients.create")) return null;
  return (
    <Button onClick={newClient}>
      <UserPlus /> Nova cliente
    </Button>
  );
}
