"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface FramedPhotoProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Extra classes for the visible (foreground) image — e.g. "object-top". */
  imgClassName?: string;
}

/**
 * Renders a photo inside a fixed-size/fixed-aspect-ratio box without ever
 * cropping it. A blurred, cover-scaled copy of the same photo fills the box
 * as a backdrop (so the frame never looks like it has empty letterbox bars),
 * and the real photo sits on top at `object-contain` — the whole thing is
 * always visible, nothing gets cut off.
 *
 * Drop this in place of a single `<Image fill className="object-cover" />`,
 * inside whatever `relative` + sized container already exists (aspect-square
 * grid cell, fixed-height hero, etc.) — it doesn't own the container itself,
 * so sibling overlays (badges, buttons, gradients) keep working unchanged.
 */
export function FramedPhoto({ src, alt, sizes, priority, imgClassName }: FramedPhotoProps) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover scale-110 blur-2xl opacity-50"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-contain", imgClassName)}
      />
    </>
  );
}
