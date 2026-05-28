import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO = "/brand/bookmy-eventstar-logo.png";

/**
 * Size tokens by context:
 *   sm  → dashboard TopBar (mobile, h-16 header)
 *   md  → public navbars (h-20 header — home, artists)
 *   lg  → sidebar expanded header, register, secondary standalone
 *   xl  → enquiry screens, login panels, 404, hero sections
 */
const SIZE = {
  sm: { className: "h-10 w-auto max-w-[150px]" },
  md: { className: "h-16 w-auto max-w-[240px]" },
  lg: { className: "h-20 w-auto max-w-[300px]" },
  xl: { className: "h-28 w-auto max-w-[420px] sm:h-32 sm:max-w-[480px]" },
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
  frame = false,
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
          : "overflow-hidden rounded-2xl",
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
        sizes="(max-width: 768px) 360px, 480px"
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
