const RESEND_API_URL = "https://api.resend.com/emails";

// bookmyeventstar.com verified in Resend (2026-07-26) — was
// onboarding@resend.dev (shared test sender, could only deliver to the
// Resend account owner's own address) until the domain was set up.
const FROM_ADDRESS = "BookMyEventStar <noreply@bookmyeventstar.com>";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";

/**
 * One generic shell reused for every "you have a notification" email —
 * new registration, new enquiry, enquiry assigned, proposal response. Same
 * title/message/link shape as the in-app NotifyPayload, so any call site
 * that already builds one for the bell icon can reuse it verbatim for email.
 */
export function notificationEmailHtml({ message, link }: { message: string; link?: string }) {
  const button = link
    ? `<a href="${SITE_URL}${link}" style="display:inline-block;margin-top:20px;background:#2c5282;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:10px;">View details</a>`
    : "";
  return `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#10161c;">
      <p style="font-size:15px;line-height:1.5;margin:0;">${message}</p>
      ${button}
    </div>
  `;
}

/** Sent once, right after a brand-new artist finishes signup (email/password
 * or Google) — the one "welcome to the community" moment, distinct from the
 * plainer notificationEmailHtml shell used for ongoing account events. */
export function artistWelcomeEmailHtml({ name, category }: { name: string; category?: string }) {
  const roleLabel = category ? `a <strong>${category}</strong>` : "an artist";
  return `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1a202c,#2c5282);padding:36px 28px;border-radius:16px 16px 0 0;text-align:center;">
        <p style="font-size:34px;margin:0 0 8px;line-height:1;">🌟</p>
        <h1 style="color:#ffffff;font-size:21px;margin:0;font-weight:700;">Welcome to the Star Community!</h1>
      </div>
      <div style="background:#ffffff;padding:28px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;">
        <p style="font-size:15px;color:#1F2937;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
        <p style="font-size:15px;color:#1F2937;line-height:1.6;margin:0 0 16px;">
          Thank you for registering as ${roleLabel} on BookMyEventStar! We're thrilled to have you join our growing community of performers.
        </p>
        <p style="font-size:14px;color:#1F2937;line-height:1.6;margin:0 0 10px;font-weight:600;">Here's what happens next:</p>
        <ul style="font-size:14px;color:#1F2937;line-height:1.8;margin:0 0 22px;padding-left:20px;">
          <li>Complete your profile — bio, price, cities, and a few great photos</li>
          <li>Our team reviews and verifies your profile</li>
          <li>Once verified, coordinators and clients can find and book you</li>
        </ul>
        <a href="${SITE_URL}/artist/profile" style="display:inline-block;background:#2c5282;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Complete My Profile →</a>
        <p style="font-size:13px;color:#6b7280;margin:26px 0 0;">Welcome aboard — let's get you booked!<br/>— Team BookMyEventStar</p>
      </div>
    </div>
  `;
}
