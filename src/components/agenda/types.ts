import type { AppointmentItem } from "@/components/appointments/appointment-actions";

export type AgendaBlock = {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
};

export type AgendaColumn = {
  id: string;
  name: string;
  color: string;
  title: string;
  schedules: { weekday: number; startMinute: number; endMinute: number; breakStartMinute: number | null; breakEndMinute: number | null }[];
};

export type AgendaHours = {
  weekday: number;
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
};

export type AgendaPayload = {
  date: string;
  view: "day" | "week";
  from: string;
  to: string;
  professionalId: string | null;
  appointments: AppointmentItem[];
  blocks: AgendaBlock[];
  hours: AgendaHours[];
  columns: AgendaColumn[];
  allProfessionals: { id: string; name: string; color: string }[];
};
