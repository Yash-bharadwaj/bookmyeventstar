"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, User, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User as UserType } from "@/types";
import Link from "next/link";
import toast from "react-hot-toast";

interface NotificationPref {
  key: string;
  label: string;
  description: string;
}

interface Props {
  user: UserType;
  notifications: NotificationPref[];
  profileLink: string;
}

export function SettingsClient({ user, notifications, profileLink }: Props) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifications.map((n) => [n.key, true]))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Notification preferences saved!");
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Link href={profileLink}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Edit Profile
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {notifications.map((n, i) => (
              <motion.div
                key={n.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                </div>
                <Switch
                  checked={prefs[n.key]}
                  onCheckedChange={() => toggle(n.key)}
                />
              </motion.div>
            ))}
            <div className="pt-4">
              <Button onClick={save} loading={saving} size="sm">Save Preferences</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card className="border-muted">
          <CardContent className="pt-5 text-center text-xs text-muted-foreground space-y-1">
            <p>BookMyEventStar · Version 1.0</p>
            <p>For support, contact <a href="mailto:hello@bookmyeventstar.com" className="underline underline-offset-2">hello@bookmyeventstar.com</a></p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
