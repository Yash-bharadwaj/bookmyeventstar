import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your free BookMyEventStar account as a client to book artists, or as a performer to get discovered and booked for events.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <RegisterClient />;
}
