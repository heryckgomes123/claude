"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAction } from "@/lib/action";
import { addItemInput, discountInput, paymentInput, updateItemInput, walkInInput } from "@/schemas/attendance";
import { id } from "@/schemas/common";
import {
  addAttendanceItem,
  finishAttendance,
  removeAttendanceItem,
  reopenAttendance,
  setAttendanceDiscount,
  startAttendance,
  startWalkIn,
  updateAttendanceItem,
} from "@/services/attendance";
import { registerPayment } from "@/services/payments";

function refresh() {
  revalidatePath("/painel", "layout");
}

export const startAttendanceAction = createAction(
  { permission: "attendance.create", schema: z.object({ appointmentId: id }) },
  async ({ appointmentId }, actor) => {
    const result = await startAttendance(actor, appointmentId);
    refresh();
    return result;
  },
);

export const startWalkInAction = createAction({ permission: "attendance.create", schema: walkInInput }, async (input, actor) => {
  const result = await startWalkIn(actor, input);
  refresh();
  return result;
});

export const addItemAction = createAction({ permission: "attendance.create", schema: addItemInput }, async (input, actor) => {
  await addAttendanceItem(actor, input);
  refresh();
  return null;
});

export const updateItemAction = createAction({ permission: "attendance.create", schema: updateItemInput }, async (input, actor) => {
  await updateAttendanceItem(actor, input);
  refresh();
  return null;
});

export const removeItemAction = createAction(
  { permission: "attendance.create", schema: z.object({ itemId: id }) },
  async ({ itemId }, actor) => {
    await removeAttendanceItem(actor, itemId);
    refresh();
    return null;
  },
);

export const setDiscountAction = createAction({ permission: "attendance.discount", schema: discountInput }, async (input, actor) => {
  await setAttendanceDiscount(actor, input.attendanceId, input.discountCents);
  refresh();
  return null;
});

export const finishAttendanceAction = createAction(
  { permission: "attendance.finish", schema: z.object({ attendanceId: id }) },
  async ({ attendanceId }, actor) => {
    await finishAttendance(actor, attendanceId);
    refresh();
    return null;
  },
);

export const reopenAttendanceAction = createAction(
  { permission: "attendance.view_all", schema: z.object({ attendanceId: id }) },
  async ({ attendanceId }, actor) => {
    await reopenAttendance(actor, attendanceId);
    refresh();
    return null;
  },
);

export const registerPaymentAction = createAction({ permission: "payments.create", schema: paymentInput }, async (input, actor) => {
  const result = await registerPayment(actor, input);
  refresh();
  return result;
});
