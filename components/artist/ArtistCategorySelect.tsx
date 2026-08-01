"use client";

import { useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

const OTHERS_VALUE = "__others__";

interface ArtistCategorySelectProps {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}

/** Searchable "what kind of artist are you?" picker, with an "Others" option
 * that reveals a free-text field — used at every artist-signup entry point
 * (email/password, Google, Admin > Users) so the category list never blocks
 * signup just because someone's specialty isn't in it yet. */
export function ArtistCategorySelect({ categories, value, onChange }: ArtistCategorySelectProps) {
  const isKnownCategory = value === "" || categories.includes(value);
  const [showOther, setShowOther] = useState(!isKnownCategory);
  const [otherText, setOtherText] = useState(isKnownCategory ? "" : value);

  const options = [
    ...categories.map((c) => ({ value: c, label: c })),
    { value: OTHERS_VALUE, label: "Others" },
  ];

  return (
    <div className="space-y-2">
      <Combobox
        options={options}
        value={showOther ? OTHERS_VALUE : value}
        onValueChange={(v) => {
          if (v === OTHERS_VALUE) {
            setShowOther(true);
            onChange(otherText);
          } else {
            setShowOther(false);
            onChange(v);
          }
        }}
        placeholder="Select a category — Dancer, DJ, Magician..."
        searchPlaceholder="Search categories..."
      />
      {showOther && (
        <Input
          placeholder="Tell us what kind of artist you are"
          value={otherText}
          onChange={(e) => {
            setOtherText(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}
