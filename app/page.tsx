import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Artist Management & Event Booking",
  description:
    "India's premium artist booking and event management platform. Book verified singers, DJs, comedians, anchors, and performers for weddings, corporate events, and private parties — with a coordinator handling everything end to end.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "BookMyEventStar — Artist Management & Event Booking",
    description: "India's premium artist booking and event management platform.",
  },
};

export default function Page() {
  return <HomeClient />;
}
