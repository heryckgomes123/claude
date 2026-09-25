"use client";

import { PlayCircle, Sparkles } from "lucide-react";
import type { AppointmentItem } from "@/components/appointments/appointment-actions";
import { useAppointmentActions } from "@/components/appointments/appointment-actions";
import { useCan } from "@/components/layout/app-context";
import { useQuickActions } from "@/components/layout/quick-actions";
import { Button } from "@/components/ui/button";

export function StartAttendanceButton({ appointment }: { appointment: AppointmentItem }) {
  const { start, pending } = useAppointmentActions();
  const can = useCan();
  if (!can("attendance.create")) return null;
  return (
    <Button size="sm" onClick={() => start(appointment)} disabled={pending}>
      <PlayCircle /> Iniciar
    </Button>
  );
}

export function WalkInButton() {
  const can = useCan();
  const { newWalkIn } = useQuickActions();
  if (!can("appointments.create") || !can("attendance.create")) return null;
  return (
    <Button onClick={() => newWalkIn()}>
      <Sparkles /> Novo atendimento
    </Button>
  );
}
