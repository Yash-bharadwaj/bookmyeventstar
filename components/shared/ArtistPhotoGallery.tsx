"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Carousel + full-screen lightbox for a shared artist profile's photos.
 * The card-height preview only ever shows one photo at a time regardless of
 * how many exist — this makes every photo reachable (via the arrows/dots)
 * and clickable into a full-size gallery view, instead of silently dropping
 * anything past the first handful.
 */
export function ArtistPhotoGallery({
  photos,
  name,
  aspect = "aspect-[4/5] md:aspect-square",
}: {
  photos: string[];
  name: string;
  aspect?: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, go]);

  if (photos.length === 0) {
    return <div className={`relative w-full ${aspect} bg-navy-50`} />;
  }

  return (
    <>
      <div className={`relative w-full ${aspect} bg-navy-50 overflow-hidden group`}>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute inset-0 w-full h-full"
          aria-label={`View full gallery for ${name}`}
        >
          <Image
            src={photos[index]}
            alt={`${name} — photo ${index + 1} of ${photos.length}`}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
            priority={index === 0}
          />
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-black/55 text-white text-xs rounded-full px-2.5 py-1 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Expand className="w-3 h-3" /> View gallery
          </span>
        </button>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] sm:w-full bg-black border-none p-0 overflow-hidden [&>button]:text-white/80 [&>button]:hover:text-white [&>button]:z-10">
          <DialogTitle className="sr-only">{`${name} — photo gallery`}</DialogTitle>
          <DialogDescription className="sr-only">{`Photo ${index + 1} of ${photos.length}`}</DialogDescription>
          <div className="relative w-full aspect-square sm:aspect-[4/3]">
            <Image
              src={photos[index]}
              alt={`${name} — photo ${index + 1} of ${photos.length}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/40 rounded-full px-2.5 py-1">
                  {index + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
