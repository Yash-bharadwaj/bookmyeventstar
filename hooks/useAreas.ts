"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface AreaOption {
  name: string;
  city: string;
}

/** Fetches the public `areas` collection once — localities scoped to a city.
 * Mirrors useCategories / useCities. Starts empty per city until an admin
 * populates it from Admin > Settings; callers should fall back to free text
 * rather than block on an empty list. */
export function useAreas() {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "areas"), orderBy("name")))
      .then((snap) => {
        if (cancelled) return;
        setAreas(snap.docs.map((d) => ({ name: d.data().name as string, city: d.data().city as string })));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { areas, loading };
}
