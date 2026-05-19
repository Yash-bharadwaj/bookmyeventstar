import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO = "/brand/bookmy-eventstar-logo.png";

const SIZE = {
  sm: { className: "h-7 w-auto max-w-[120px]" },
  md: { className: "h-9 w-auto max-w-[160px]" },
  lg: { className: "h-11 w-auto max-w-[200px]" },
  xl: { className: "h-12 w-auto max-w-[200px] sm:h-14 sm:max-w-[260px]" },
} as const;

export type BrandLogoSize = keyof typeof SIZE;

export interface BrandLogoProps {
  size?: BrandLogoSize;
  /** Dark rounded frame — use on light backgrounds so the black-canvas logo stays crisp */
  frame?: boolean;
  className?: string;
  imgClassName?: string;
  href?: string;
  priority?: boolean;
  /** Visually hidden label for accessibility when logo is decorative inside a link */
  "aria-label"?: string;
}

/**
 * Official BookMy EventStar wordmark + mark. Asset: `public/brand/bookmy-eventstar-logo.png`.
 */
export function BrandLogo({
  size = "md",
  frame = true,
  className,
  imgClassName,
  href,
  priority,
  "aria-label": ariaLabel = "BookMy EventStar — home",
}: BrandLogoProps) {
  const s = SIZE[size];
  const image = (
    <span
      className={cn(
        "relative inline-flex items-center leading-none",
        frame
          ? "overflow-hidden rounded-xl bg-black px-2 py-1 ring-1 ring-black/10 dark:ring-white/15"
          : "overflow-hidden rounded-xl",
        className
      )}
    >
      <Image
        src={LOGO}
        alt=""
        width={1536}
        height={1024}
        priority={priority}
        className={cn(s.className, imgClassName)}
        sizes="(max-width: 768px) 200px, 260px"
      />
    </span>
  );

  const content = href ? (
    <Link href={href} className="inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 rounded-xl">
      <span className="sr-only">{ariaLabel}</span>
      {image}
    </Link>
  ) : (
    image
  );

  return content;
}
