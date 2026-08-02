"use client";

import { Copy } from "lucide-react";
import toast from "react-hot-toast";

/** Small inline copy-to-clipboard icon for a table cell value (name, email,
 * phone, etc). Stops propagation so it never triggers a parent row's own
 * click handler. */
export function CopyIconButton({ value, label }: { value: string; label: string }) {
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — please select and copy it manually.");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label.toLowerCase()}`}
      className="flex-shrink-0 text-muted-foreground/40 hover:text-navy-600 transition-colors"
    >
      <Copy className="w-3 h-3" />
    </button>
  );
}
