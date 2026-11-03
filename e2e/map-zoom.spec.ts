import { test, expect } from "@playwright/test";

test("map fills width, pinch zoom anchors at pointer, and normal wheel pans", async ({
  page,
}) => {
  await page.goto("/e2e/harness.html?seed=7&players=2");
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  const viewport = page.locator(".map-scroll");
  const slider = page.getByRole("slider", { name: "地图缩放" });
  await expect
    .poll(() =>
      viewport.evaluate((el) =>
        Math.abs(
          el.querySelector("svg")!.getBoundingClientRect().width -
            el.clientWidth,
        ),
      ),
    )
    .toBeLessThan(2);
  // Select a ticket first: subsequent gestures must remain under player control.
  await page.locator(".ticket-locate").first().click();
  await page.getByRole("button", { name: "铺满宽度" }).click();
  const before = await viewport.evaluate((el) => {
    const box = el.getBoundingClientRect(),
      svg = el.querySelector("svg")!.getBoundingClientRect();
    const x = box.left + el.clientWidth * 0.6,
      y = box.top + el.clientHeight * 0.5;
    return {
      x,
      y,
      mapX: (x - svg.left) / svg.width,
      mapY: (y - svg.top) / svg.height,
    };
  });
  const canceled = await viewport.evaluate((el, p) => {
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -70,
      clientX: p.x,
      clientY: p.y,
    });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }, before);
  expect(canceled).toBe(true);
  await expect
    .poll(() => slider.inputValue().then(Number))
    .toBeGreaterThan(1.5);
  const after = await viewport.evaluate((el, p) => {
    const svg = el.querySelector("svg")!.getBoundingClientRect();
    return { x: (p.x - svg.left) / svg.width, y: (p.y - svg.top) / svg.height };
  }, before);
  expect(Math.abs(after.x - before.mapX)).toBeLessThan(0.01);
  expect(Math.abs(after.y - before.mapY)).toBeLessThan(0.01);
  await page.mouse.move(before.x, before.y);
  const top = await viewport.evaluate((el) => el.scrollTop);
  await page.mouse.wheel(0, 100);
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(top);
  const zoom = Number(await slider.inputValue());
  await viewport.evaluate(
    (el, p) =>
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 40,
          clientX: p.x,
          clientY: p.y,
        }),
      ),
    before,
  );
  await expect.poll(() => slider.inputValue().then(Number)).toBeLessThan(zoom);
  await page.getByRole("button", { name: "铺满宽度" }).click();
  await expect(slider).toHaveValue("1");
  await expect
    .poll(() =>
      viewport.evaluate((el) =>
        Math.abs(
          el.querySelector("svg")!.getBoundingClientRect().width -
            el.clientWidth,
        ),
      ),
    )
    .toBeLessThan(2);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/map-width-${test.info().project.name}.png`,
    fullPage: true,
  });
});
