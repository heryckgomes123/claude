"use client";

import { CalendarPlus } from "lucide-react";
import { useCan } from "@/components/layout/app-context";
import { useQuickActions } from "@/components/layout/quick-actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { AppointmentPrefill } from "@/components/appointments/appointment-form-dialog";

export function NewAppointmentButton({
  prefill,
  label = "Novo agendamento",
  ...props
}: ButtonProps & { prefill?: AppointmentPrefill; label?: string }) {
  const can = useCan();
  const { newAppointment } = useQuickActions();
  if (!can("appointments.create")) return null;
  return (
    <Button onClick={() => newAppointment(prefill)} {...props}>
      <CalendarPlus /> {label}
    </Button>
  );
}
