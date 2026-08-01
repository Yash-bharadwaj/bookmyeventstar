"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CityOption } from "@/hooks/useCities";

export interface ArtistLocationValue {
  state: string;
  city: string;
  area: string;
}

interface ArtistLocationSelectProps {
  cities: CityOption[];
  value: ArtistLocationValue;
  onChange: (value: ArtistLocationValue) => void;
  errors?: Partial<Record<keyof ArtistLocationValue, string>>;
}

/** State → City cascading search dropdowns (built from the same `cities`
 * collection the enquiry form and admin settings use) plus a free-text area
 * field — there's no locality-level dataset in this app, so "area" stays
 * a plain input rather than a fabricated/empty dropdown. */
export function ArtistLocationSelect({ cities, value, onChange, errors }: ArtistLocationSelectProps) {
  const states = useMemo(
    () => Array.from(new Set(cities.map((c) => c.state))).sort().map((s) => ({ value: s, label: s })),
    [cities]
  );

  const cityOptions = useMemo(
    () =>
      cities
        .filter((c) => !value.state || c.state === value.state)
        .map((c) => ({ value: c.name, label: c.name })),
    [cities, value.state]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>State</Label>
        <Combobox
          options={states}
          value={value.state}
          onValueChange={(state) => onChange({ state, city: "", area: value.area })}
          placeholder="Select state"
          searchPlaceholder="Search states..."
        />
        {errors?.state && <p className="text-xs text-destructive">{errors.state}</p>}
      </div>
      <div className="space-y-1">
        <Label>City</Label>
        <Combobox
          options={cityOptions}
          value={value.city}
          onValueChange={(city) => onChange({ ...value, city })}
          placeholder={value.state ? "Select city" : "Select a state first"}
          searchPlaceholder="Search cities..."
          emptyMessage={value.state ? "No cities found." : "Select a state first."}
        />
        {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>Area / Locality</Label>
        <Input
          placeholder="e.g. Koramangala, Andheri West..."
          icon={<MapPin className="w-4 h-4" />}
          value={value.area}
          onChange={(e) => onChange({ ...value, area: e.target.value })}
          error={errors?.area}
        />
      </div>
    </div>
  );
}
