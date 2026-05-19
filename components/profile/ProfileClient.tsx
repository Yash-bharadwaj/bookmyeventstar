"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Shield, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { User as UserType } from "@/types";

interface Props {
  user: UserType;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  coordinator: "Event Coordinator",
  artist: "Artist",
  client: "Client",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  coordinator: "bg-blue-100 text-blue-700",
  artist: "bg-amber-100 text-amber-700",
  client: "bg-emerald-100 text-emerald-700",
};

export function ProfileClient({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ name: name.trim(), phone: phone.trim() }).eq("id", user.id);
    if (error) toast.error("Failed to save profile");
    else { toast.success("Profile updated!"); router.refresh(); }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Avatar + role */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold select-none">
                {getInitials(user.name)}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold mt-2 ${ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground px-3 py-2 border rounded-xl bg-muted/40">+91</span>
                <Input
                  value={phone.replace(/^\+91/, "")}
                  onChange={(e) => setPhone("+91" + e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={user.email} disabled className="pl-9 bg-muted/30 text-muted-foreground cursor-not-allowed" />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
            </div>
            <Button onClick={save} loading={saving} className="gap-2">
              <Save className="w-4 h-4" />Save Changes
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between py-2 border-b">
              <span>Account status</span>
              <span className="text-emerald-600 font-medium text-xs px-2 py-0.5 bg-emerald-50 rounded-full">Active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span>Role</span>
              <span className="font-medium text-foreground">{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Member since</span>
              <span className="font-medium text-foreground">{new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
