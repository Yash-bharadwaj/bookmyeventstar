"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus, ToggleLeft, ToggleRight, X, Phone, Mail,
  Briefcase, CheckCircle, AlertCircle, TrendingUp, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  coordinators: User[];
  enquiries: { coordinator_id: string | null; status: string }[];
}

const MAX_RECOMMENDED = 8; // enquiries above this = overloaded

function workloadColor(active: number): { bar: string; badge: string; label: string } {
  if (active === 0) return { bar: "bg-gray-300", badge: "bg-gray-100 text-gray-500", label: "Available" };
  if (active <= 3) return { bar: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700", label: "Light" };
  if (active <= 6) return { bar: "bg-amber-400", badge: "bg-amber-100 text-amber-700", label: "Moderate" };
  return { bar: "bg-red-500", badge: "bg-red-100 text-red-700", label: "Heavy" };
}

export function AdminCoordinatorsClient({ coordinators, enquiries }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [toggling, setToggling] = useState<string | null>(null);
  // Edit coordinator
  const [editCoord, setEditCoord] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const saveEdit = async () => {
    if (!editCoord?.name.trim() || !editCoord?.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ name: editCoord.name.trim(), phone: editCoord.phone.trim() }).eq("id", editCoord.id);
    if (error) { toast.error("Failed to save changes"); }
    else { toast.success("Coordinator updated"); setEditCoord(null); router.refresh(); }
    setSaving(false);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    setToggling(id);
    const supabase = createClient();
    await supabase.from("users").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Coordinator deactivated" : "Coordinator activated");
    setToggling(null);
    router.refresh();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const createCoordinator = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error("All fields are required");
      return;
    }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, role: "coordinator" } },
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("No user returned");
      await supabase.from("users").upsert({
        id: signUpData.user.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: "coordinator",
        is_active: true,
      });
      toast.success(`${form.name} added as coordinator!`);
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", password: "" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create coordinator");
    } finally {
      setCreating(false);
    }
  };

  // Compute metrics per coordinator
  const coordMetrics = coordinators.map((c) => {
    const myEnquiries = enquiries.filter((e) => e.coordinator_id === c.id);
    const active = myEnquiries.filter((e) => !["completed", "cancelled"].includes(e.status)).length;
    const completed = myEnquiries.filter((e) => e.status === "completed").length;
    const total = myEnquiries.length;
    const conversion = total ? Math.round((completed / total) * 100) : 0;
    const wl = workloadColor(active);
    return { ...c, active, completed, total, conversion, wl };
  }).sort((a, b) => b.active - a.active);

  const totalActive = coordMetrics.reduce((s, c) => s + c.active, 0);
  const overloaded = coordMetrics.filter((c) => c.active > MAX_RECOMMENDED).length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border bg-indigo-50 border-indigo-100 text-center">
          <p className="text-2xl font-display font-bold text-indigo-700">{coordinators.length}</p>
          <p className="text-xs text-indigo-500 font-medium mt-0.5">Total Coordinators</p>
        </div>
        <div className="p-4 rounded-2xl border bg-amber-50 border-amber-100 text-center">
          <p className="text-2xl font-display font-bold text-amber-700">{totalActive}</p>
          <p className="text-xs text-amber-500 font-medium mt-0.5">Active Enquiries</p>
        </div>
        <div className={`p-4 rounded-2xl border text-center ${overloaded > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
          <p className={`text-2xl font-display font-bold ${overloaded > 0 ? "text-red-700" : "text-emerald-700"}`}>{overloaded}</p>
          <p className={`text-xs font-medium mt-0.5 ${overloaded > 0 ? "text-red-500" : "text-emerald-500"}`}>
            {overloaded > 0 ? "Overloaded" : "All Balanced"}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4 mr-2" />Add Coordinator
        </Button>
      </div>

      {/* Coordinator cards */}
      {coordMetrics.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No coordinators yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coordMetrics.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border p-5 hover:shadow-md transition-all ${
                !c.is_active ? "opacity-60 bg-muted/30" : ""
              } ${c.active > MAX_RECOMMENDED ? "border-red-200 bg-red-50/20" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${
                    c.is_active ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {getInitials(c.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1 ${
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setEditCoord({ id: c.id, name: c.name, phone: c.phone })}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={toggling === c.id}
                    onClick={() => toggleStatus(c.id, c.is_active)}
                  >
                    {c.is_active
                      ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {/* Contact */}
              <div className="mt-3 space-y-1">
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <Mail className="w-3.5 h-3.5" />{c.email}
                </a>
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                  <Phone className="w-3.5 h-3.5" />{c.phone}
                </a>
              </div>

              {/* Workload bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Workload</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.wl.badge}`}>
                      {c.wl.label}
                    </span>
                    {c.active > MAX_RECOMMENDED && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${c.wl.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (c.active / MAX_RECOMMENDED) * 100)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06 + 0.2 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.active} active · max {MAX_RECOMMENDED} recommended
                </p>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t">
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-indigo-700">{c.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-amber-600">{c.active}</p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-lg font-display font-bold text-emerald-600">{c.conversion}%</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Conversion</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Coordinator Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Priya Sharma" value={form.name} onChange={set("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="priya@bmes.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
              <p className="text-xs text-muted-foreground">Coordinator can change this after first login.</p>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={createCoordinator} loading={creating}>
                <UserPlus className="w-4 h-4 mr-2" />Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Coordinator Dialog */}
      <Dialog open={!!editCoord} onOpenChange={(o) => { if (!o) setEditCoord(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Coordinator</DialogTitle></DialogHeader>
          {editCoord && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={editCoord.name} onChange={(e) => setEditCoord({ ...editCoord, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editCoord.phone} onChange={(e) => setEditCoord({ ...editCoord, phone: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditCoord(null)}>Cancel</Button>
                <Button className="flex-1" disabled={saving} onClick={saveEdit}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
