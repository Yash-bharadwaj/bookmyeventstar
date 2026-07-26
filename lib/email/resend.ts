const RESEND_API_URL = "https://api.resend.com/emails";

// Resend's shared onboarding@resend.dev sender — works with zero domain
// setup, meant for low-volume/testing use. Swap to a verified custom domain
// address here once one is set up; no other code needs to change.
const FROM_ADDRESS = "BookMyEventStar <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }

  return res.json();
}

export function otpEmailHtml(code: string) {
  return `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#10161c;">
      <p style="font-size:15px;margin:0 0 16px;">Your BookMyEventStar verification code is:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:0 0 16px;text-align:center;background:#f4f6f5;border-radius:12px;padding:16px;">${code}</p>
      <p style="font-size:13px;color:#5b6570;margin:0;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}
