"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface CityOption {
  name: string;
  state: string;
}

/** Fetches the public `cities` collection once — used anywhere a visitor
 * (signed in or not) needs to pick a city, e.g. the enquiry form or artist
 * signup. Mirrors useCategories. */
export function useCities() {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "cities"), orderBy("name")))
      .then((snap) => {
        if (cancelled) return;
        setCities(snap.docs.map((d) => ({ name: d.data().name as string, state: d.data().state as string })));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading };
}
