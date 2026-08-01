import { ImageResponse } from "next/og";

export const alt = "BookMyEventStar — Artist Management & Event Booking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #0f1b26 0%, #182838 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 140,
            height: 140,
            marginBottom: 36,
          }}
        >
          <svg width="140" height="140" viewBox="0 0 100 100">
            <polygon
              points="50,6 61,38 95,38 68,59 78,92 50,72 22,92 32,59 5,38 39,38"
              fill="#f59e0b"
              stroke="#fcd34d"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "#fef3c7",
            letterSpacing: -1,
          }}
        >
          BookMyEventStar
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 30,
            color: "#f59e0b",
            fontWeight: 500,
          }}
        >
          Artist Management &amp; Event Booking
        </div>
      </div>
    ),
    { ...size }
  );
}
