"use client";

import { useEffect, useState } from "react";
import {
  collection, query, orderBy, limit, onSnapshot,
  writeBatch, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Notification } from "@/types";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("created_at", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        // created_at is a Firestore Timestamp object at runtime (the type
        // says string, but nothing here actually converts it) — passing
        // that straight to `new Date()` produces an invalid date, which
        // formatDateTime silently falls back to "Just now" for, regardless
        // of how old the notification actually is.
        const createdAt: Timestamp | undefined = data.created_at;
        return {
          id: d.id,
          ...data,
          created_at: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Notification;
      });
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    for (const n of unread) {
      batch.update(doc(db, "users", userId, "notifications", n.id), { is_read: true });
    }
    await batch.commit();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAllRead };
}
