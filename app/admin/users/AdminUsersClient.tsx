"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Search, Download, UserPlus, Pencil, Trash2, Loader2,
  ChevronLeft, ChevronRight, ShieldCheck, ShieldOff, Eye, EyeOff as EyeOffIcon,
  KeyRound, Copy, Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { ArtistCategorySelect } from "@/components/artist/ArtistCategorySelect";
import { formatDateTime, getInitials } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { doc, updateDoc } from "firebase/firestore";
import { notifyUser, emailUser } from "@/lib/notifications/client";

type UserRole = "client" | "artist" | "coordinator" | "admin";

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  is_verified: boolean | null;
  is_listed: boolean | null;
  categories: string[] | null;
  rating: number | null;
  total_bookings: number | null;
  city: string | null;
  area: string | null;
}

const PAGE_SIZES = [10, 25, 50, 100];

const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  artist: "Artist",
  coordinator: "Coordinator",
  admin: "Admin",
};

const ROLE_BADGE_VARIANT: Record<UserRole, "info" | "purple" | "warning" | "destructive"> = {
  client: "info",
  artist: "purple",
  coordinator: "warning",
  admin: "destructive",
};

const ROLE_AVATAR_COLOR: Record<UserRole, string> = {
  client: "bg-blue-100 text-blue-700",
  artist: "bg-purple-100 text-purple-700",
  coordinator: "bg-gold-100 text-gold-700",
  admin: "bg-red-100 text-red-700",
};

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function AdminUsersClient({ users, currentAdminId, categoryOptions }: { users: RegisteredUser[]; currentAdminId: string; categoryOptions: string[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [cityFilter, setCityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addForm, setAddForm] = useState({ role: "client" as "client" | "artist", name: "", email: "", phone: "", password: "", category: "" });

  const [editUser, setEditUser] = useState<RegisteredUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RegisteredUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const clientCount = users.filter((u) => u.role === "client").length;
  const artistCount = users.filter((u) => u.role === "artist").length;
  const coordinatorCount = users.filter((u) => u.role === "coordinator").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  const cityOptions = useMemo(
    () => Array.from(new Set(users.map((u) => u.city).filter((c): c is string => !!c))).sort().map((c) => ({ value: c, label: c })),
    [users]
  );
  const areaOptions = useMemo(() => {
    const pool = cityFilter ? users.filter((u) => u.city === cityFilter) : users;
    return Array.from(new Set(pool.map((u) => u.area).filter((a): a is string => !!a))).sort().map((a) => ({ value: a, label: a }));
  }, [users, cityFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (cityFilter && u.city !== cityFilter) return false;
      if (areaFilter && u.area !== areaFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.categories ?? []).some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [users, search, roleFilter, cityFilter, areaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const resetPage = () => setPage(1);

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Update failed");
    }
  };

  const toggleActive = async (u: RegisteredUser) => {
    setToggling(u.id);
    try {
      await patchUser(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? `${u.name} deactivated` : `${u.name} activated`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setToggling(null);
    }
  };

  /** Verification lives on artistProfiles, not users — same direct client
   * write + notify pattern as toggleVerify in AdminArtistsClient.tsx (that
   * page's dedicated verification queue), just reachable from here too so
   * an admin doesn't have to leave Admin > Users to flip it. */
  const toggleVerify = async (u: RegisteredUser) => {
    const current = !!u.is_verified;
    setVerifying(u.id);
    try {
      await updateDoc(doc(db, "artistProfiles", u.id), {
        is_verified: !current,
        ...(!current && { rejection_reason: null }),
      });
      const payload = current
        ? {
            title: "Verification Removed",
            message: "Your artist verification has been removed, so your profile won't appear in client or coordinator searches until it's restored.",
            type: "warning" as const,
            link: "/artist/profile",
          }
        : {
            title: "You're Verified! 🎉",
            message: "Great news — your artist profile has been verified by our team and can now appear in client and coordinator searches.",
            type: "success" as const,
            link: "/artist/profile",
          };
      await notifyUser(u.id, payload).catch(() => {});
      if (!current) emailUser(u.id, payload).catch(() => {});
      toast.success(current ? `${u.name} unverified` : `${u.name} verified!`);
      router.refresh();
    } catch {
      toast.error("Failed to update verification");
    } finally {
      setVerifying(null);
    }
  };

  const openEdit = (u: RegisteredUser) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone });
    setNewPassword("");
    setShowNewPassword(false);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    const pwd = Array.from(bytes, (n) => chars[n % chars.length]).join("");
    setNewPassword(pwd);
    setShowNewPassword(true);
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy — please select and copy it manually.");
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
      toast.error("Name, email, and phone are required");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await patchUser(editUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        ...(newPassword ? { password: newPassword } : {}),
      });
      toast.success(newPassword ? "User updated and password reset" : "User updated");
      setEditUser(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete user");
      }
      toast.success(`${deleteTarget.name}'s account was deleted`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const createUser = async () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.phone.trim() || !addForm.password) {
      toast.error("All fields are required");
      return;
    }
    if (addForm.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (addForm.role === "artist" && !addForm.category) { toast.error("Select the artist's category"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          password: addForm.password,
          role: addForm.role,
          category: addForm.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create account");
      toast.success(`${addForm.name} added as ${addForm.role}`);
      setShowAdd(false);
      setAddForm({ role: "client", name: "", email: "", phone: "", password: "", category: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  const downloadCsv = () => {
    const header = ["Name", "Email", "Phone", "City", "Area", "Role", "Category", "Status", "Registered", "Verified", "Listed", "Rating", "Bookings"];
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.phone,
      u.city ?? "",
      u.area ?? "",
      u.role,
      u.role === "artist" ? (u.categories ?? []).join("; ") : "",
      u.is_active ? "Active" : "Inactive",
      formatDateTime(u.created_at),
      u.role === "artist" ? (u.is_verified ? "Yes" : "No") : "",
      u.role === "artist" ? (u.is_listed ? "Yes" : "No") : "",
      u.role === "artist" ? String(u.rating ?? "") : "",
      u.role === "artist" ? String(u.total_bookings ?? "") : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => csvEscape(String(c))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bmes-users-${roleFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-4 md:p-6 space-y-4">
      {/* Summary + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl border bg-navy-50 border-navy-100">
            <p className="text-lg font-display font-bold text-navy-700">{users.length}</p>
            <p className="text-[11px] text-navy-500 font-medium">Total Registered</p>
          </div>
          <div className="px-4 py-2 rounded-xl border bg-blue-50 border-blue-100">
            <p className="text-lg font-display font-bold text-blue-700">{clientCount}</p>
            <p className="text-[11px] text-blue-500 font-medium">Clients</p>
          </div>
          <div className="px-4 py-2 rounded-xl border bg-purple-50 border-purple-100">
            <p className="text-lg font-display font-bold text-purple-700">{artistCount}</p>
            <p className="text-[11px] text-purple-500 font-medium">Artists</p>
          </div>
          <div className="px-4 py-2 rounded-xl border bg-gold-50 border-gold-100">
            <p className="text-lg font-display font-bold text-gold-700">{coordinatorCount}</p>
            <p className="text-[11px] text-gold-600 font-medium">Coordinators</p>
          </div>
          <div className="px-4 py-2 rounded-xl border bg-red-50 border-red-100">
            <p className="text-lg font-display font-bold text-red-700">{adminCount}</p>
            <p className="text-[11px] text-red-500 font-medium">Admins</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="w-4 h-4 mr-2" />Download CSV
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4 mr-2" />Add User
          </Button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or category..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          />
        </div>
        <Tabs value={roleFilter} onValueChange={(v) => { setRoleFilter(v as typeof roleFilter); resetPage(); }}>
          <TabsList>
            <TabsTrigger value="all">All ({users.length})</TabsTrigger>
            <TabsTrigger value="client">Clients ({clientCount})</TabsTrigger>
            <TabsTrigger value="artist">Artists ({artistCount})</TabsTrigger>
            <TabsTrigger value="coordinator">Coordinators ({coordinatorCount})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({adminCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-44">
          <Combobox
            options={cityOptions}
            value={cityFilter}
            onValueChange={(v) => { setCityFilter(v); setAreaFilter(""); resetPage(); }}
            placeholder="Filter by city"
            searchPlaceholder="Search cities..."
          />
        </div>
        <div className="w-44">
          <Combobox
            options={areaOptions}
            value={areaFilter}
            onValueChange={(v) => { setAreaFilter(v); resetPage(); }}
            placeholder="Filter by area"
            searchPlaceholder="Search areas..."
          />
        </div>
        {(cityFilter || areaFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setCityFilter(""); setAreaFilter(""); resetPage(); }}>
            Clear location
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3 min-w-[220px]">User</th>
                <th className="text-left px-4 py-3 min-w-[130px]">Phone</th>
                <th className="text-left px-4 py-3 min-w-[140px]">Location</th>
                <th className="text-left px-4 py-3 min-w-[90px]">Role</th>
                <th className="text-left px-4 py-3 min-w-[110px]">Status</th>
                <th className="text-left px-4 py-3 min-w-[150px]">Registered</th>
                <th className="text-right px-4 py-3 min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              ) : (
                pageRows.map((u) => (
                  <tr key={u.id} className={`border-b last:border-0 hover:bg-accent/20 transition-colors ${!u.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${ROLE_AVATAR_COLOR[u.role]}`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="font-medium truncate max-w-[190px]">
                              {u.name}
                              {u.id === currentAdminId && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
                            </p>
                            <CopyIconButton value={u.name} label="Name" />
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate max-w-[190px]">{u.email}</p>
                            <CopyIconButton value={u.email} label="Email" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{u.phone || "—"}</span>
                        {u.phone && <CopyIconButton value={u.phone} label="Phone" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.city ? (
                        <div className="text-sm">
                          <p className="truncate max-w-[160px]">{u.city}</p>
                          {u.area && <p className="text-xs text-muted-foreground/70 truncate max-w-[160px]">{u.area}</p>}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE_VARIANT[u.role]}>
                        {u.role === "artist" && u.categories && u.categories.length > 0
                          ? u.categories.join(", ")
                          : ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              {toggling === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Switch
                                  checked={u.is_active}
                                  disabled={u.id === currentAdminId}
                                  onCheckedChange={() => toggleActive(u)}
                                  aria-label={u.is_active ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                                />
                              )}
                              <span className={`text-xs font-semibold ${u.is_active ? "text-emerald-700" : "text-muted-foreground"}`}>
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {u.id === currentAdminId
                              ? "You can't deactivate your own account from here."
                              : u.is_active
                              ? "Can sign in and use the platform normally. Toggle off to deactivate — this blocks sign-in immediately."
                              : "Deactivated — can't sign in. Toggle on to restore access."}
                          </TooltipContent>
                        </Tooltip>
                        {u.role === "artist" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => toggleVerify(u)}
                                disabled={verifying === u.id}
                                aria-label={u.is_verified ? `Remove verification from ${u.name}` : `Verify ${u.name}`}
                                className="disabled:opacity-50"
                              >
                                {verifying === u.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                ) : u.is_verified ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <ShieldOff className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {u.is_verified
                                ? "Verified by admin — shows a trust badge on their public profile. Click to remove verification."
                                : "Not verified yet — click to verify"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {u.role === "artist" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {u.is_listed
                                ? <Eye className="w-3.5 h-3.5 text-blue-500" />
                                : <EyeOffIcon className="w-3.5 h-3.5 text-muted-foreground" />}
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {u.is_listed ? "Listed — appears in client/coordinator search results" : "Hidden — not shown in search results"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}>
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit name, email, or phone</TooltipContent>
                        </Tooltip>
                        {u.id !== currentAdminId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" aria-label={`Delete ${u.name}`} onClick={() => setDeleteTarget(u)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Permanently delete this account</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              {filtered.length === 0 ? "0" : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)}`} of {filtered.length}
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); resetPage(); }}>
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((f) => ({ ...f, role: v as "client" | "artist" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addForm.role === "artist" && (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <ArtistCategorySelect
                  categories={categoryOptions}
                  value={addForm.category}
                  onChange={(v) => setAddForm((f) => ({ ...f, category: v }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input type="password" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={createUser} loading={creating}>
                <UserPlus className="w-4 h-4 mr-2" />Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit {editUser ? ROLE_LABELS[editUser.role] : "User"}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                <p className="text-xs text-muted-foreground">This is their login — changing it affects how they sign in.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>

              <div className="space-y-1.5 pt-1 border-t">
                <Label className="flex items-center gap-1.5 pt-3">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                  Reset Password (optional)
                </Label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Leave blank to keep their current password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="icon" title="Generate a password" onClick={generatePassword}>
                    <Shuffle className="w-4 h-4" />
                  </Button>
                  {newPassword && (
                    <Button type="button" variant="outline" size="icon" title="Copy password" onClick={copyPassword}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Passwords can&apos;t be viewed once set — this sets a brand-new one. Share it with them directly; they can change it after signing in.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button className="flex-1" disabled={saving} onClick={saveEdit}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this account?</DialogTitle></DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                This permanently deletes <span className="font-semibold text-foreground">{deleteTarget.name}</span>'s
                account ({deleteTarget.email}) and sign-in credentials. This cannot be undone — their existing
                enquiries/bookings will keep referencing this ID but the account itself will be gone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? "Deleting…" : "Delete Permanently"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
