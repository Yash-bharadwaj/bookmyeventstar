import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your BookMyEventStar account to manage bookings, enquiries, and your artist profile.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <LoginClient />;
}
