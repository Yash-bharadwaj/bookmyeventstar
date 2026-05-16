"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, ToggleLeft, ToggleRight, X } from "lucide-react";
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

export function AdminCoordinatorsClient({ coordinators, enquiries }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const toggleStatus = async (id: string, current: boolean) => {
    const supabase = createClient();
    await supabase.from("users").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Coordinator deactivated" : "Coordinator activated");
    router.refresh();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const createCoordinator = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setCreating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.admin
        ? // Use admin API via server action instead
          { data: null, error: new Error("Use server signup") }
        : { data: null, error: new Error("Use server signup") };

      // Fallback: use signUp approach (creates account in auth.users)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name, role: "coordinator" },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("No user returned");

      // Upsert into public.users
      await supabase.from("users").upsert({
        id: signUpData.user.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: "coordinator",
        is_active: true,
      });

      toast.success(`Coordinator ${form.name} created! They can log in with the provided credentials.`);
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", password: "" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create coordinator");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4 mr-2" />Add Coordinator
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {["Coordinator", "Contact", "Active Enquiries", "Total Enquiries", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coordinators.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No coordinators yet. Add one to get started.
                </td>
              </tr>
            ) : coordinators.map((c, i) => {
              const myEnquiries = enquiries.filter((e) => e.coordinator_id === c.id);
              const active = myEnquiries.filter((e) => !["completed", "cancelled"].includes(e.status)).length;
              return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b last:border-0 hover:bg-accent/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{active}</td>
                  <td className="px-4 py-3 text-sm">{myEnquiries.length}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(c.id, c.is_active)}>
                      {c.is_active
                        ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                        : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                    </Button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
              <p className="text-xs text-muted-foreground">The coordinator can change this after first login.</p>
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
    </div>
  );
}
