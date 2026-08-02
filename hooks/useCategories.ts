"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** Fetches the public `categories` collection — used anywhere a visitor
 * (signed in or not) needs to pick a performance category, e.g. artist signup.
 * Cached via react-query (5 min staleTime — this list changes rarely) so
 * repeat visits across /register, /login, /enquiry reuse one fetch instead
 * of hitting Firestore again on every mount. */
export function useCategories() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "categories"), orderBy("name")));
      return snap.docs.map((d) => d.data().name as string);
    },
    staleTime: 5 * 60 * 1000,
  });

  return { categories: data ?? [], loading: isLoading };
}
