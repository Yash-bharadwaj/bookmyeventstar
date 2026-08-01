"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/utils";

export interface BudgetBand {
  value: string;
  min: number;
  max: number | null;
}

/** Preset starting-price bands artists pick from at signup — a rough
 * starting point they refine into an exact `base_price` later during
 * profile completion, same relationship the enquiry form's budget_min /
 * budget_max has to an artist's real quote. */
export const BUDGET_BANDS: BudgetBand[] = [
  { value: "2000-5000", min: 2000, max: 5000 },
  { value: "5000-10000", min: 5000, max: 10000 },
  { value: "10000-25000", min: 10000, max: 25000 },
  { value: "25000-50000", min: 25000, max: 50000 },
  { value: "50000-100000", min: 50000, max: 100000 },
  { value: "100000-250000", min: 100000, max: 250000 },
  { value: "250000-plus", min: 250000, max: null },
];

function bandLabel(band: BudgetBand): string {
  return band.max ? `${formatCurrency(band.min)} – ${formatCurrency(band.max)}` : `${formatCurrency(band.min)}+`;
}

export function getBudgetBand(value: string): BudgetBand | undefined {
  return BUDGET_BANDS.find((b) => b.value === value);
}

interface BudgetRangeSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function BudgetRangeSelect({ value, onChange, error }: BudgetRangeSelectProps) {
  const options = useMemo(() => BUDGET_BANDS.map((b) => ({ value: b.value, label: bandLabel(b) })), []);

  return (
    <div className="space-y-1">
      <Combobox
        options={options}
        value={value}
        onValueChange={onChange}
        placeholder="Select your starting price range"
        searchPlaceholder="Search price ranges..."
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
