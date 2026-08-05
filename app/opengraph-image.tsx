import { ImageResponse } from "next/og";

export const alt = "BookMyEventStar — Artist Management & Event Booking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dedicated pre-scaled copy (640x426, ~160KB) of public/brand/bookmy-eventstar-logo.png
// (2.3MB at full res) — Satori fetches <img src> fresh on every render since
// Next can't cache a response over 2MB, so pointing this at the full-res
// original made every social-crawler preview request re-download 2.3MB from
// production before it could render, slow enough that some crawlers
// (WhatsApp included) would give up and show no image at all.
const LOGO_URL = "https://www.bookmyeventstar.com/brand/bookmy-eventstar-logo-og.png";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 400;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori needs a plain <img>, not next/image */}
        <img src={LOGO_URL} alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} />
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 30,
            color: "#243c52",
            fontWeight: 500,
          }}
        >
          Artist Management &amp; Event Booking
        </div>
        <div
          style={{
            display: "flex",
            width: 120,
            height: 4,
            marginTop: 24,
            borderRadius: 2,
            background: "#f59e0b",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
