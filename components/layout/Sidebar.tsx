"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Contact,
  Music,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  ClipboardList,
  Star,
  Wallet,
  UserCircle,
  Home,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { UserRole } from "@/types";

const navConfig: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Contact },
    { label: "Enquiries", href: "/admin/enquiries", icon: FileText },
    { label: "Coordinators", href: "/admin/coordinators", icon: Users },
    { label: "Artists", href: "/admin/artists", icon: Music },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  coordinator: [
    { label: "Dashboard", href: "/coordinator", icon: LayoutDashboard },
    { label: "My Enquiries", href: "/coordinator/enquiries", icon: FileText },
    { label: "Proposals", href: "/coordinator/proposals", icon: ClipboardList },
    { label: "Bookings", href: "/coordinator/bookings", icon: Star },
    { label: "Calendar", href: "/coordinator/calendar", icon: Calendar },
    { label: "Artists", href: "/coordinator/artists", icon: Music },
    { label: "Messages", href: "/coordinator/messages", icon: MessageSquare },
  ],
  artist: [
    { label: "Dashboard", href: "/artist", icon: LayoutDashboard },
    { label: "My Bookings", href: "/artist/bookings", icon: Star },
    { label: "Availability", href: "/artist/availability", icon: Calendar },
    { label: "My Profile", href: "/artist/profile", icon: UserCircle },
    { label: "Earnings", href: "/artist/earnings", icon: Wallet },
    { label: "Documents", href: "/artist/documents", icon: FileText },
  ],
  client: [
    { label: "Dashboard", href: "/client", icon: Home },
    { label: "My Enquiries", href: "/client/enquiries", icon: FileText },
    { label: "Proposals", href: "/client/proposals", icon: ClipboardList },
    { label: "My Events", href: "/client/events", icon: Calendar },
    { label: "Payments", href: "/client/payments", icon: Wallet },
    { label: "Messages", href: "/client/messages", icon: MessageSquare },
  ],
};

// Two-tone brand palette only (steel-blue "gold" + slate "navy") — each role
// gets a distinct shade from that same family rather than a different hue.
// All shades here are mid-to-dark, so every role uses white text.
const roleColors: Record<UserRole, string> = {
  admin: "from-gold-600 to-gold-800",
  coordinator: "from-navy-500 to-navy-700",
  artist: "from-navy-700 to-navy-900",
  client: "from-gold-400 to-gold-600",
};

const roleBadgeText: Record<UserRole, string> = {
  admin: "text-white",
  coordinator: "text-white",
  artist: "text-white",
  client: "text-white",
};

const roleActiveNav: Record<UserRole, string> = {
  admin: "bg-gradient-to-r from-gold-600 to-gold-800 text-white shadow-lg shadow-gold-500/25",
  coordinator: "bg-gradient-to-r from-navy-500 to-navy-700 text-white shadow-lg shadow-navy-500/25",
  artist: "bg-gradient-to-r from-navy-700 to-navy-900 text-white shadow-lg shadow-navy-800/25",
  client: "bg-gradient-to-r from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/25",
};

const roleAvatarBg: Record<UserRole, string> = {
  admin: "bg-gradient-to-br from-gold-600 to-gold-800",
  coordinator: "bg-gradient-to-br from-navy-500 to-navy-700",
  artist: "bg-gradient-to-br from-navy-700 to-navy-900",
  client: "bg-gradient-to-br from-gold-400 to-gold-600",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  coordinator: "Coordinator",
  artist: "Artist",
  client: "Customer",
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  userId?: string;
}

export function Sidebar({ role, userName, userId }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navItems = navConfig[role];

  useEffect(() => {
    if (!userId) return;
    // Unread-notifications badge — reads live from this user's own
    // `users/{uid}/notifications` subcollection (is_read == false).
    const q = query(collection(db, "users", userId, "notifications"), where("is_read", "==", false));
    const unsubscribe = onSnapshot(q, (snap) => setUnreadMessages(snap.size), () => setUnreadMessages(0));
    return () => unsubscribe();
  }, [userId]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative hidden md:flex flex-col h-screen bg-navy-900 border-r border-white/10 overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/10 py-4 ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}>
        <Link href="/" className="min-w-0 shrink flex justify-center">
          <BrandLogo
            size={collapsed ? "sm" : "lg"}
            frame={false}
            priority
            imgClassName={collapsed ? "!h-8 !max-w-[60px]" : undefined}
          />
        </Link>
      </div>

      {/* Role badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3"
          >
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r text-xs font-semibold", roleColors[role], roleBadgeText[role])}>
              <span className={cn("w-1.5 h-1.5 rounded-full", roleBadgeText[role] === "text-white" ? "bg-white/70" : "bg-navy-900/50")} />
              {roleLabels[role]} Panel
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const segments = item.href.split("/").filter(Boolean);
          const isRootDashboard = segments.length === 1;
          const isActive = pathname === item.href || (!isRootDashboard && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group relative",
                  isActive
                    ? roleActiveNav[role]
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {item.label === "Messages" && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium truncate flex-1"
                    >
                      {item.label}
                      {item.label === "Messages" && unreadMessages > 0 && !collapsed && (
                        <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-navy-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs", roleAvatarBg[role], roleBadgeText[role])}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white text-sm font-medium truncate">{userName}</p>
                <p className="text-white/40 text-xs truncate capitalize">{role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-navy-800 border border-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors z-10 shadow-lg"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
