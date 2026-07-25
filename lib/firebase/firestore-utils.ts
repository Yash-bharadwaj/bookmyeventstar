import { Timestamp } from "firebase-admin/firestore";

/**
 * Shape of `{ id: doc.id, ...doc.data() }` with the fields still accessible.
 * TS's object-spread inference drops arbitrary index signatures (Firestore's
 * `DocumentData` is `{ [field: string]: any }`) when spread into a literal —
 * it only keeps explicitly-declared properties (`id`) — so plain
 * `{ id: d.id, ...d.data() }` types as just `{ id: string }`. Cast the
 * result `as AnyDoc` wherever you need to read fields off it afterward.
 */
export type AnyDoc = { id: string } & Record<string, any>;

/**
 * Server Components can only pass plain, JSON-serializable data across the
 * RSC boundary to Client Components. Admin SDK reads return `Timestamp`
 * class instances (with `.toDate()`/`.toMillis()` methods) for every
 * `created_at`/`updated_at`/date field, which are neither serializable nor
 * compatible with the existing `formatDate`/`new Date(x)` call sites that
 * expect an ISO string (per the old Postgres `string` shape in types/index.ts).
 *
 * Call this on every doc (or array of docs) fetched via `adminDb` before
 * passing it as a prop to a "use client" component.
 */
export function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Timestamp) {
    return data.toDate().toISOString() as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => serialize(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      out[key] = serialize(value);
    }
    return out as T;
  }
  return data;
}
