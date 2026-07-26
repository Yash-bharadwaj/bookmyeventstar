export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotifyPayload {
  title: string;
  message: string;
  type?: NotificationType;
  /** In-app path the notification links to when clicked, e.g. "/coordinator/bookings/abc123" */
  link?: string;
}
