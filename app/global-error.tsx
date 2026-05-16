"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>{error.message || "A critical error occurred."}</p>
            <button
              onClick={reset}
              style={{ background: "#4f46e5", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
