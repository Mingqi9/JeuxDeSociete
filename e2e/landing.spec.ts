import { test, expect } from "@playwright/test";

test("reference landing, fixed navigation, room tabs and trilingual rules", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".landing-hero")).toBeVisible();
  const images = await page
    .locator(".landing-hero img")
    .evaluateAll((images) =>
      images.every(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(images).toBe(true);
  await expect(
    page.getByRole("tab", { name: "创建房间", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("房间代码")).toHaveCount(0);
  await page.getByRole("tab", { name: "加入房间", exact: true }).click();
  await expect(page.getByLabel("房间代码")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "加入房间", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("tab", { name: "加入房间", exact: true })
    .press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "创建房间", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: true,
  });
  // Do not depend on the external PDF service during browser tests.
  await page.route("https://cdn.svc.asmodee.net/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Rulebook preview</p>",
    }),
  );
  await page.getByRole("button", { name: /游戏规则/ }).click();
  const pdfLink = page.locator(".rule-open");
  await expect(pdfLink).toHaveAttribute("href", /RULES_CNS/);
  await page
    .locator(".rule-languages")
    .getByRole("button", { name: "English" })
    .click();
  await expect(pdfLink).toHaveAttribute("href", /Rules-EN.pdf/);
  await page
    .locator(".rule-languages")
    .getByRole("button", { name: "Français" })
    .click();
  await expect(pdfLink).toHaveAttribute("href", /RULES_FR/);
  const navBefore = await page.locator(".landing-nav").boundingBox();
  await page.locator(".landing-content").evaluate((el) => (el.scrollTop = 300));
  await expect
    .poll(() => page.locator(".landing-content").evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect((await page.locator(".landing-nav").boundingBox())?.y).toBe(
    navBefore?.y,
  );
  await page.getByRole("button", { name: /游戏介绍/ }).click();
  await expect(page.locator(".about-steps article")).toHaveCount(3);
  await expect
    .poll(() => page.locator(".landing-content").evaluate((el) => el.scrollTop))
    .toBe(0);
  await page.locator("select.language").selectOption("fr");
  await expect(
    page.getByRole("heading", { name: "Une carte, mille voyages." }),
  ).toBeVisible();
  await page.locator("select.language").selectOption("en");
  await page
    .getByRole("button", { name: "Play with friends", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Create a room", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
