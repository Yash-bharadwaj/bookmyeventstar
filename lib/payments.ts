import type { Payment } from "@/types";

export interface PaymentSummary {
  /** Sum of paid advance + final payments — actual money collected from the client. */
  paidTotal: number;
  /** total_amount minus paidTotal, floored at 0. */
  pendingBalance: number;
  /** At least one paid "advance" payment exists. */
  advancePaid: boolean;
  /** At least one paid "final" payment exists. */
  finalPaid: boolean;
}

/**
 * Derives the real payment state of a booking from its `payments`
 * subcollection instead of trusting `booking.advance_amount`/`balance_amount`
 * — those are only the original quote captured at booking creation and are
 * never updated as payments actually come in.
 */
export function summarizePayments(
  totalAmount: number,
  payments: Pick<Payment, "type" | "amount" | "status">[]
): PaymentSummary {
  const clientPayments = payments.filter((p) => p.type === "advance" || p.type === "final");
  const paidTotal = clientPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    paidTotal,
    pendingBalance: Math.max(0, totalAmount - paidTotal),
    advancePaid: clientPayments.some((p) => p.type === "advance" && p.status === "paid"),
    finalPaid: clientPayments.some((p) => p.type === "final" && p.status === "paid"),
  };
}
