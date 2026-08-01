import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const metadata: Metadata = {
  title: "My Dashboard",
  robots: { index: false, follow: false },
};

export default async function ClientSectionLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/login");

  return <DashboardLayout user={serialize(user)}>{children}</DashboardLayout>;
}
