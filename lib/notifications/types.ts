export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotifyPayload {
  title: string;
  message: string;
  type?: NotificationType;
  /** In-app path the notification links to when clicked, e.g. "/coordinator/bookings/abc123" */
  link?: string;
}

/** Extra key/value rows shown in the email only (never stored on the bell
 * notification doc — that stays a short one-liner). Use for the handful of
 * "here's everything you need" emails, e.g. an enquiry assignment. */
export interface EmailDetail {
  label: string;
  value: string;
}
