import type { Metadata } from "next";
import EnquiryClient from "./EnquiryClient";

export const metadata: Metadata = {
  title: "Book an Artist — Raise an Enquiry",
  description:
    "Tell us about your event and get a curated proposal within hours. Verified singers, DJs, comedians, anchors, and performers across India — no upfront fee.",
  alternates: { canonical: "/enquiry" },
  openGraph: {
    url: "/enquiry",
    title: "Book an Artist — Raise an Enquiry | BookMyEventStar",
    description: "Tell us about your event and get a curated proposal within hours.",
  },
};

export default function Page() {
  return <EnquiryClient />;
}
