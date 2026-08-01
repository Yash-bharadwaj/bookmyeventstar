"use client";

import { useMemo, useState, useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CityOption } from "@/hooks/useCities";
import type { AreaOption } from "@/hooks/useAreas";

const OTHERS_VALUE = "__others__";

export interface ArtistLocationValue {
  state: string;
  city: string;
  area: string;
}

interface ArtistLocationSelectProps {
  cities: CityOption[];
  areas: AreaOption[];
  value: ArtistLocationValue;
  onChange: (value: ArtistLocationValue) => void;
  errors?: Partial<Record<keyof ArtistLocationValue, string>>;
}

/** State → City → Area cascading search dropdowns. State/City come from the
 * `cities` collection (same data the enquiry form and admin settings use).
 * Area comes from the `areas` collection, scoped to the selected city — that
 * list starts empty per city, so an "Others" option reveals free text
 * instead of blocking signup, same pattern as ArtistCategorySelect. */
export function ArtistLocationSelect({ cities, areas, value, onChange, errors }: ArtistLocationSelectProps) {
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

  const areasForCity = useMemo(
    () => areas.filter((a) => a.city === value.city),
    [areas, value.city]
  );
  const areaOptions = useMemo(
    () =>
      value.city
        ? [...areasForCity.map((a) => ({ value: a.name, label: a.name })), { value: OTHERS_VALUE, label: "Others" }]
        : [],
    [areasForCity, value.city]
  );

  const isKnownArea = value.area === "" || areasForCity.some((a) => a.name === value.area);
  const [showOtherArea, setShowOtherArea] = useState(!isKnownArea);
  const [otherAreaText, setOtherAreaText] = useState(isKnownArea ? "" : value.area);

  // Changing city invalidates whatever area was picked for the previous one.
  useEffect(() => {
    setShowOtherArea(false);
    setOtherAreaText("");
  }, [value.city]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>State</Label>
        <Combobox
          options={states}
          value={value.state}
          onValueChange={(state) => onChange({ state, city: "", area: "" })}
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
          onValueChange={(city) => onChange({ ...value, city, area: "" })}
          placeholder={value.state ? "Select city" : "Select a state first"}
          searchPlaceholder="Search cities..."
          emptyMessage={value.state ? "No cities found." : "Select a state first."}
        />
        {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>Area / Locality</Label>
        <Combobox
          options={areaOptions}
          value={showOtherArea ? OTHERS_VALUE : value.area}
          onValueChange={(v) => {
            if (v === OTHERS_VALUE) {
              setShowOtherArea(true);
              onChange({ ...value, area: otherAreaText });
            } else {
              setShowOtherArea(false);
              onChange({ ...value, area: v });
            }
          }}
          placeholder={value.city ? "Select area / locality" : "Select a city first"}
          searchPlaceholder="Search areas..."
          emptyMessage={value.city ? "No areas listed — pick Others to type your own." : "Select a city first."}
        />
        {showOtherArea && (
          <Input
            placeholder="Type your area / locality"
            value={otherAreaText}
            onChange={(e) => {
              setOtherAreaText(e.target.value);
              onChange({ ...value, area: e.target.value });
            }}
            className="mt-1.5"
          />
        )}
        {errors?.area && <p className="text-xs text-destructive">{errors.area}</p>}
      </div>
    </div>
  );
}
