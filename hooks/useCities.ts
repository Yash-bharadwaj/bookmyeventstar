"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface CityOption {
  name: string;
  state: string;
}

/** Fetches the public `cities` collection — used anywhere a visitor
 * (signed in or not) needs to pick a city, e.g. the enquiry form or artist
 * signup. Mirrors useCategories, including the react-query cache. */
export function useCities() {
  const { data, isLoading } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "cities"), orderBy("name")));
      return snap.docs.map((d) => ({ name: d.data().name as string, state: d.data().state as string }));
    },
    staleTime: 5 * 60 * 1000,
  });

  return { cities: data ?? [], loading: isLoading };
}
