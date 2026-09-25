"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { appointmentInput, availabilityQuery, rescheduleInput, scheduleBlockInput, statusChangeInput } from "@/schemas/appointment";
import { id } from "@/schemas/common";
import {
  changeAppointmentStatus,
  createAppointment,
  createScheduleBlock,
  deleteScheduleBlock,
  getAppointment,
  getAvailability,
  rescheduleAppointment,
} from "@/services/appointments";

function refresh() {
  revalidatePath("/painel", "layout");
}

export const availabilityAction = createAction(
  { permission: ["appointments.create", "appointments.edit"], schema: availabilityQuery },
  async (input, actor) => getAvailability(actor, input),
);

export const createAppointmentAction = createAction(
  { permission: "appointments.create", schema: appointmentInput },
  async (input, actor) => {
    const created = await createAppointment(actor, input);
    refresh();
    return created;
  },
);

export const rescheduleAppointmentAction = createAction(
  { permission: "appointments.edit", schema: rescheduleInput },
  async (input, actor) => {
    const result = await rescheduleAppointment(actor, input);
    refresh();
    return result;
  },
);

export const changeAppointmentStatusAction = createAction(
  { permission: ["appointments.status", "appointments.cancel"], schema: statusChangeInput },
  async (input, actor) => {
    const result = await changeAppointmentStatus(actor, input);
    refresh();
    return result;
  },
);

export const getAppointmentAction = createAction(
  { permission: "appointments.view", schema: z.object({ appointmentId: id }) },
  async ({ appointmentId }, actor) => getAppointment(actor, appointmentId),
);

export const createScheduleBlockAction = createAction(
  { permission: "schedule_blocks.manage", schema: scheduleBlockInput },
  async (input, actor) => {
    const created = await createScheduleBlock(actor, input);
    refresh();
    return created;
  },
);

export const deleteScheduleBlockAction = createAction(
  { permission: "schedule_blocks.manage", schema: z.object({ blockId: id }) },
  async ({ blockId }, actor) => {
    await deleteScheduleBlock(actor, blockId);
    refresh();
    return null;
  },
);
