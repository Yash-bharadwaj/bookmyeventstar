// Page titles used to live as a `title` prop each page.tsx passed to
// DashboardLayout — but that meant every page rendered its own
// DashboardLayout (Sidebar/TopBar/BottomNav), so navigating between pages
// unmounted and remounted the whole shell instead of just the content area.
// Now that the shell lives once per role in layout.tsx, TopBar derives the
// title from the route instead.
const EXACT_TITLES: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/enquiries": "All Enquiries",
  "/admin/coordinators": "Coordinators",
  "/admin/artists": "Artists",
  "/admin/reports": "Reports & Analytics",
  "/admin/settings": "System Settings",
  "/admin/profile": "My Profile",

  "/artist": "My Dashboard",
  "/artist/bookings": "My Bookings",
  "/artist/availability": "Availability Calendar",
  "/artist/profile": "My Profile",
  "/artist/earnings": "My Earnings",
  "/artist/documents": "My Documents",
  "/artist/settings": "Settings",

  "/coordinator": "My Dashboard",
  "/coordinator/enquiries": "My Enquiries",
  "/coordinator/proposals": "My Proposals",
  "/coordinator/bookings": "My Bookings",
  "/coordinator/calendar": "Event Calendar",
  "/coordinator/artists": "Artist Search",
  "/coordinator/messages": "Messages",
  "/coordinator/profile": "My Profile",
  "/coordinator/settings": "Settings",

  "/client": "My Dashboard",
  "/client/enquiries": "My Enquiries",
  "/client/proposals": "My Proposals",
  "/client/events": "My Events",
  "/client/payments": "Payments & Invoices",
  "/client/messages": "Messages",
  "/client/profile": "My Profile",
  "/client/settings": "Settings",
};

// Dynamic [id] detail routes — matched by prefix since the id isn't known here.
const DETAIL_TITLES: [string, string][] = [
  ["/admin/enquiries/", "Enquiry Detail"],
  ["/coordinator/enquiries/", "Enquiry Details"],
  ["/coordinator/bookings/", "Booking Details"],
  ["/client/enquiries/", "Enquiry Details"],
];

export function getPageTitle(pathname: string): string {
  if (EXACT_TITLES[pathname]) return EXACT_TITLES[pathname];
  for (const [prefix, title] of DETAIL_TITLES) {
    if (pathname.startsWith(prefix) && pathname.length > prefix.length) return title;
  }
  return "Dashboard";
}
