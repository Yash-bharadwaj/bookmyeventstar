import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const;

const PAGES = ["/", "/login", "/register", "/forgot-password", "/enquiry"] as const;

/**
 * The regression this guards against: a flex row (e.g. an input next to a
 * nowrap button) whose shrinking child lacks `min-w-0`, so its placeholder/
 * content sets an implicit min-width and the row overflows the viewport.
 * Found and fixed twice already (home hero search bar, register mobile
 * placeholder) — this check makes sure it doesn't come back unnoticed.
 */
async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  // 1px tolerance for sub-pixel rounding.
  expect(scrollWidth, `page is ${scrollWidth - clientWidth}px wider than the viewport (${clientWidth}px) — horizontal overflow`).toBeLessThanOrEqual(clientWidth + 1);
}

// KNOWN BUG (flagged, not fixed here): /enquiry's outer wrapper is missing
// `overflow-x-hidden` (the home page's root div has it; enquiry's doesn't).
// Its decorative w-96 (384px) centered blur blob is wider than a 375px mobile
// viewport and isn't clipped, adding ~5px of real horizontal scroll on every
// enquiry phase. Fix: add `overflow-hidden` to the page's outer container(s)
// in app/enquiry/page.tsx, same pattern already used on app/page.tsx.
const KNOWN_OVERFLOW_BUGS = new Set(["mobile:/enquiry"]);

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`no horizontal overflow @ ${vpName} (${viewport.width}px)`, () => {
    for (const path of PAGES) {
      test(`${path || "home"}`, async ({ page }) => {
        test.fail(KNOWN_OVERFLOW_BUGS.has(`${vpName}:${path}`), "known overflow bug — see comment above");
        await page.setViewportSize(viewport);
        await page.goto(path, { waitUntil: "networkidle" });
        await page.waitForTimeout(800); // let framer-motion entrance animations settle
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}

test.describe("enquiry page — event manager fields don't overflow when expanded", () => {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    test(`@ ${vpName}`, async ({ page }) => {
      // Same known overflow bug as above — the blob bleeds on every enquiry phase.
      test.fail(vpName === "mobile", "known overflow bug — see comment above");
      await page.setViewportSize(viewport);
      await page.goto("/enquiry", { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const toggle = page.getByText("I'm an event manager / planner");
      await toggle.click();
      await page.waitForTimeout(400);
      await expectNoHorizontalOverflow(page);
      await expect(page.getByPlaceholder("e.g. Starlight Events")).toBeVisible();
    });
  }
});

test.describe("smoke: key elements render", () => {
  test("home shows the primary CTAs and nav", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /sign up/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /book now/i })).toBeVisible();
  });

  test("login shows the dynamic identifier field", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByPlaceholder(/you@example.com or/i)).toBeVisible();
  });

  test("register shows both role options", async ({ page }) => {
    await page.goto("/register", { waitUntil: "networkidle" });
    await expect(page.getByText("I want to book artists")).toBeVisible();
    await expect(page.getByText("I am an artist")).toBeVisible();
  });

  test("forgot-password shows the reset form", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /reset password/i })).toBeVisible();
  });

  test("enquiry shows step 1 of the wizard for a logged-out visitor", async ({ page }) => {
    await page.goto("/enquiry", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
    await expect(page.getByPlaceholder("9876543210")).toBeVisible();
  });
});
