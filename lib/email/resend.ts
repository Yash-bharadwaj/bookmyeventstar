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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";
// Static asset — referenced by its stable www URL directly (not SITE_URL,
// which is bookmyeventstar.com and 308-redirects to www) so email clients'
// image proxies don't have to follow a redirect to render the logo.
const LOGO_URL = "https://www.bookmyeventstar.com/brand/bookmy-eventstar-logo.png";

// Brand palette (tailwind.config: navy/gold scales) — kept in sync manually
// since email HTML can't read the Tailwind config at send time.
const NAVY_900 = "#0f1b26";
const NAVY_700 = "#243c52";
const GOLD_500 = "#f59e0b";

/**
 * Shared table-based shell for every transactional email — logo header on a
 * navy gradient, white content card, small-print footer. Table layout (not
 * flex/div) is deliberate: it's what actually renders consistently across
 * Outlook/Gmail/Apple Mail, unlike the div-based markup the rest of the app
 * uses in the browser.
 */
function emailShell(bodyHtml: string) {
  return `
    <div style="background:#f1f5f9;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="background:linear-gradient(135deg,${NAVY_900},${NAVY_700});padding:32px 28px;border-radius:16px 16px 0 0;text-align:center;">
            <img src="${LOGO_URL}" alt="BookMy EventStar" width="168" height="112" style="width:168px;height:112px;display:inline-block;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px 28px 24px;border:1px solid #e2e8f0;border-top:none;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:0 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
            <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">
              BookMy EventStar · India's premier artist management &amp; event booking platform<br/>
              This is an automated message — please don't reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function ctaButton(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:22px;background:${GOLD_500};color:#1a202c;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">${label}</a>`;
}

// Details rows can carry free-text a public, unauthenticated visitor typed
// (e.g. an enquiry's "other requirements") straight into this HTML — escape
// it so it can't inject markup into a coordinator's inbox.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function otpEmailHtml(code: string) {
  return emailShell(`
    <p style="font-size:15px;color:#374151;margin:0 0 16px;">Your BookMy EventStar verification code is:</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:0 0 16px;text-align:center;background:#f1f5f9;border-radius:12px;padding:16px;color:#111827;">${code}</p>
    <p style="font-size:13px;color:#6b7280;margin:0;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  `);
}

/**
 * One generic shell reused for every "you have a notification" email —
 * new registration, new enquiry, enquiry assigned, proposal response, new
 * lead for an artist. Same title/message/link shape as the in-app
 * NotifyPayload, so any call site that already builds one for the bell icon
 * can reuse it verbatim for email. `details` adds an optional key/value
 * table below the message — for the emails that should carry full context
 * (e.g. an enquiry assignment) rather than just a one-line summary.
 */
export function notificationEmailHtml({
  title, message, link, details,
}: { title: string; message: string; link?: string; details?: { label: string; value: string }[] }) {
  const button = link ? ctaButton("View details →", `${SITE_URL}${link}`) : "";
  const detailsTable = details && details.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;border-top:1px solid #e2e8f0;">
      ${details.map((d) => `
        <tr>
          <td style="padding:8px 12px 8px 0;font-size:13px;color:#6b7280;vertical-align:top;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${escapeHtml(d.label)}</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #f1f5f9;">${escapeHtml(d.value)}</td>
        </tr>
      `).join("")}
    </table>
  ` : "";
  return emailShell(`
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">${title}</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0;">${message}</p>
    ${detailsTable}
    ${button}
  `);
}

type WelcomeCredentials = { email: string; password: string };

// Only present for a Google-originated signup (see /api/auth/google) — that
// flow never has the person choose a password themselves, so this is their
// one chance to see the system-generated one and keep it if they ever want
// a non-Google way in.
function credentialsBlock({ email, password }: WelcomeCredentials) {
  return `
    <div style="margin:18px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <p style="font-size:13px;color:#374151;margin:0 0 10px;font-weight:600;">Your login details</p>
      <p style="font-size:14px;color:#111827;margin:0 0 4px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="font-size:14px;color:#111827;margin:0;"><strong>Password:</strong> ${escapeHtml(password)}</p>
      <p style="font-size:12px;color:#6b7280;margin:10px 0 0;">You signed up with Google, so you don't need this — it's just a fallback in case you ever want to sign in with email and password instead. You can reset it anytime from the Forgot Password link on the sign-in page.</p>
    </div>
  `;
}

/** Sent once, right after a brand-new artist finishes signup (email/password
 * or Google) — the one "welcome to the community" moment, distinct from the
 * plainer notificationEmailHtml shell used for ongoing account events. */
export function artistWelcomeEmailHtml({ name, category, credentials }: { name: string; category?: string; credentials?: WelcomeCredentials }) {
  const roleLabel = category ? `a <strong>${category}</strong>` : "an artist";
  return emailShell(`
    <p style="font-size:28px;margin:0 0 4px;line-height:1;">🌟</p>
    <h2 style="font-size:19px;font-weight:700;color:#111827;margin:0 0 16px;">Welcome to the Star Community!</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      Thank you for registering as ${roleLabel} on BookMy EventStar! We're thrilled to have you join our growing community of performers.
    </p>
    ${credentials ? credentialsBlock(credentials) : ""}
    <p style="font-size:14px;color:#111827;line-height:1.6;margin:0 0 10px;font-weight:600;">Here's what happens next:</p>
    <ul style="font-size:14px;color:#374151;line-height:1.8;margin:0 0 8px;padding-left:20px;">
      <li><strong>Complete your profile</strong> — bio, price, cities, and a few great photos. Our team isn't notified to review you until this is done, so this is the one step that actually matters right now.</li>
      <li>The moment your profile is complete, our team is automatically notified and reviews it</li>
      <li>Once verified, coordinators and clients can find and book you</li>
    </ul>
    ${ctaButton("Complete My Profile →", `${SITE_URL}/artist/profile`)}
    <p style="font-size:13px;color:#92400e;line-height:1.6;margin:22px 0 0;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
      <strong>Note:</strong> You are verified only when your profile is <strong>100% complete</strong>. Uploading your Aadhaar card is compulsory — without it, your profile cannot reach 100%.
    </p>
    <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Welcome aboard — let's get you booked!<br/>— Team BookMy EventStar</p>
  `);
}

/** Sent once, right after a brand-new client finishes signup via Google
 * (the email/password enquiry flow already knows its own password, so this
 * is Google-only — see /api/auth/google). */
export function clientWelcomeEmailHtml({ name, credentials }: { name: string; credentials?: WelcomeCredentials }) {
  return emailShell(`
    <p style="font-size:28px;margin:0 0 4px;line-height:1;">🌟</p>
    <h2 style="font-size:19px;font-weight:700;color:#111827;margin:0 0 16px;">Welcome to BookMy EventStar!</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      Thanks for signing up! You're all set to raise an enquiry and get matched with verified artists for your event.
    </p>
    ${credentials ? credentialsBlock(credentials) : ""}
    ${ctaButton("Raise an Enquiry →", `${SITE_URL}/enquiry`)}
    <p style="font-size:13px;color:#6b7280;margin:22px 0 0;">— Team BookMy EventStar</p>
  `);
}
