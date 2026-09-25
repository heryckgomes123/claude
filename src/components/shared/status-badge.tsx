import { Badge, type BadgeTone } from "@/components/ui/badge";
import { APPOINTMENT_STATUS_LABELS, ATTENDANCE_STATUS_LABELS, type AppointmentStatus, type AttendanceStatus } from "@/config/domain";

export const APPOINTMENT_STATUS_TONES: Record<AppointmentStatus, BadgeTone> = {
  SCHEDULED: "neutral",
  CONFIRMED: "bronze",
  ARRIVED: "teal",
  IN_SERVICE: "terracotta",
  COMPLETED: "sage",
  CANCELLED: "danger",
  NO_SHOW: "muted",
};

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  IN_PROGRESS: "terracotta",
  AWAITING_PAYMENT: "bronze",
  PAID: "sage",
  CANCELLED: "danger",
};

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-stone-400",
  bronze: "bg-bronze-500",
  teal: "bg-teal-soft-700",
  terracotta: "bg-terracotta-500 animate-pulse",
  sage: "bg-sage-500",
  danger: "bg-[#b0433a]",
  muted: "bg-stone-400",
  plum: "bg-plum-700",
  dark: "bg-cream",
  outline: "bg-stone-400",
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const tone = APPOINTMENT_STATUS_TONES[status];
  return (
    <Badge tone={tone} className={className}>
      <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function AttendanceBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const tone = ATTENDANCE_TONES[status];
  return (
    <Badge tone={tone} className={className}>
      <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
      {ATTENDANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
