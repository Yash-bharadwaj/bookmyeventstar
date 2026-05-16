"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { User, UserRole } from "@/types";

interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ user, children, title }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar role={user.role as UserRole} userName={user.name} avatarUrl={user.avatar_url} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar user={user} title={title} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav role={user.role as UserRole} />
    </div>
  );
}
