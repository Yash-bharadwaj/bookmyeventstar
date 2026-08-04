"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ArtistCategorySelectProps {
  categories: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

/** Multi-select "what kind of artist are you?" picker — some performers have
 * several talents (e.g. singer + dancer + anchor), so this was never really
 * a single pick. The comma-separated box on top covers talents that aren't
 * in the master list yet, so category coverage never blocks signup — used
 * at every artist-signup entry point (email/password, Google, Admin >
 * Users). */
export function ArtistCategorySelect({ categories, value, onChange }: ArtistCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const listId = useId();

  const addCustom = () => {
    const additions = customText.split(",").map((s) => s.trim()).filter(Boolean);
    if (additions.length === 0) return;
    const merged = [...value];
    for (const a of additions) {
      if (!merged.some((v) => v.toLowerCase() === a.toLowerCase())) merged.push(a);
    }
    onChange(merged);
    setCustomText("");
  };

  const toggle = (cat: string) => {
    onChange(
      value.some((v) => v.toLowerCase() === cat.toLowerCase())
        ? value.filter((v) => v.toLowerCase() !== cat.toLowerCase())
        : [...value, cat]
    );
  };

  const remove = (cat: string) => onChange(value.filter((v) => v !== cat));

  return (
    <div className="space-y-2">
      <Input
        placeholder="Add custom talents — comma separated (e.g. Beatboxing, Mimicry)"
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addCustom();
          }
        }}
        onBlur={addCustom}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          >
            <span className={cn("truncate text-left", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0 ? "Select categories — Dancer, DJ, Magician..." : `${value.length} categor${value.length === 1 ? "y" : "ies"} selected`}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent id={listId} className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {categories.map((cat) => {
                  const selected = value.some((v) => v.toLowerCase() === cat.toLowerCase());
                  return (
                    <CommandItem key={cat} value={cat} onSelect={() => toggle(cat)}>
                      <Check className={cn("mr-2 h-4 w-4 text-gold-600", selected ? "opacity-100" : "opacity-0")} />
                      {cat}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-navy-900 text-white text-xs font-medium">
              {v}
              <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`} className="text-white/60 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
