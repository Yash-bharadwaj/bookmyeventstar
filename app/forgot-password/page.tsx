import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset the password for your BookMyEventStar account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ForgotPasswordClient />;
}
