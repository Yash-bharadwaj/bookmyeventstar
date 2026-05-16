"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
  UserCircle,
  Wallet,
  Music,
  BarChart3,
  Home,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";

const mobileNavConfig: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Home", href: "/admin", icon: LayoutDashboard },
    { label: "Enquiries", href: "/admin/enquiries", icon: FileText },
    { label: "Artists", href: "/admin/artists", icon: Music },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: UserCircle },
  ],
  coordinator: [
    { label: "Home", href: "/coordinator", icon: LayoutDashboard },
    { label: "Enquiries", href: "/coordinator/enquiries", icon: FileText },
    { label: "Proposals", href: "/coordinator/proposals", icon: ClipboardList },
    { label: "Calendar", href: "/coordinator/calendar", icon: Calendar },
    { label: "Artists", href: "/coordinator/artists", icon: Music },
  ],
  artist: [
    { label: "Home", href: "/artist", icon: LayoutDashboard },
    { label: "Bookings", href: "/artist/bookings", icon: ClipboardList },
    { label: "Calendar", href: "/artist/availability", icon: Calendar },
    { label: "Earnings", href: "/artist/earnings", icon: Wallet },
    { label: "Profile", href: "/artist/profile", icon: UserCircle },
  ],
  client: [
    { label: "Home", href: "/client", icon: Home },
    { label: "Enquiries", href: "/client/enquiries", icon: FileText },
    { label: "Proposals", href: "/client/proposals", icon: ClipboardList },
    { label: "Events", href: "/client/events", icon: Calendar },
    { label: "Messages", href: "/client/messages", icon: MessageSquare },
  ],
};

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const items = mobileNavConfig[role];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 px-2 relative"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-xl transition-all",
                  isActive ? "gold-gradient shadow-md shadow-gold-500/30" : ""
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-navy-900" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-gold-600" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
