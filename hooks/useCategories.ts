"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** Fetches the public `categories` collection once — used anywhere a visitor
 * (signed in or not) needs to pick a performance category, e.g. artist signup. */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "categories"), orderBy("name")))
      .then((snap) => {
        if (cancelled) return;
        setCategories(snap.docs.map((d) => d.data().name as string));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
