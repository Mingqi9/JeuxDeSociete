import { test, expect } from "@playwright/test";
import { createGame } from "../src/domain/engine";
import { europe } from "../src/data/europe";
test("five seats remain within one screen after resizing", async ({
  page,
}, info) => {
  await page.goto("/e2e/harness.html?seed=7&players=5");
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await page.setViewportSize(
    info.project.name === "desktop"
      ? { width: 1366, height: 768 }
      : { width: 390, height: 667 },
  );
  await expect(page.locator(".map-panel")).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    .toBe(true);
  await page.getByRole("checkbox").nth(3).check();
  await expect(page.locator("[data-endpoint]")).toHaveCount(2);
  for (const endpoint of await page.locator("[data-endpoint]").all())
    await expect(endpoint).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: `test-results/one-screen-${info.project.name}.png`,
    fullPage: true,
  });
});
test("place a station on the map, cancel the preview, then pay and build", async ({
  page,
}, info) => {
  await page.goto("/e2e/harness.html?seed=7&players=2");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "查看我的回合 →" }).click();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "保留所选任务" }).click();
  }
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  const city = page.locator('[data-city="Paris"]');
  if (info.project.name === "desktop") {
    await page.locator(".map-panel").scrollIntoViewIfNeeded();
    const source = (await page
      .locator('[data-piece-tool="station"]')
      .boundingBox())!;
    const target = (await city.locator(".city-hit").boundingBox())!;
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();
  } else {
    await city.locator(".city-hit").tap();
  }
  await expect(city).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "确认建站" })).toBeDisabled();
  await expect(page.locator('[data-player="p0"] .station-piece')).toHaveCount(
    3,
  );
  await page.getByRole("button", { name: "取消放置" }).click();
  await expect(city).toHaveAttribute("aria-pressed", "false");
  await city.press("Enter");
  await page.locator(".hand button").first().click();
  await page.getByRole("button", { name: "确认建站" }).click();
  await expect(page.locator('[data-player="p0"] .station-piece')).toHaveCount(
    2,
  );
  await expect(city.locator("path")).toHaveAttribute("fill", "#bc4339");
  await expect(page.locator(".hand button")).toHaveCount(0);
});
test("choose unique colors, then privately inspect simultaneous cards/tickets against the central board", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "玩家颜色 Alice" })
    .selectOption("blue");
  await expect(
    page
      .getByRole("combobox", { name: "玩家颜色 Camille" })
      .locator('option[value="blue"]'),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "玩家颜色 Camille" })
    .selectOption("black");
  await page.getByRole("button", { name: "开始本地对局 →" }).click();
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await expect(page.locator('[data-player="p0"] .wagon-piece')).toHaveCount(45);
  await expect(page.locator('[data-player="p0"] .station-piece')).toHaveCount(
    3,
  );
  await expect(page.locator('[data-score-player="p0"] circle')).toHaveAttribute(
    "fill",
    "#397fa6",
  );
  await expect(page.locator(".hand button")).toHaveCount(4);
  await expect(page.locator(".hand button").first()).toBeDisabled();
  await expect(page.getByRole("checkbox")).toHaveCount(4);
  await expect(page.locator(".long-ticket")).toHaveCount(1);
  await expect(page.locator(".short-ticket")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "确认铺设" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /从牌堆抽牌/ })).toBeDisabled();
  await expect(page.locator(".express-card")).not.toBeVisible();
  await page.getByText("计分说明", { exact: true }).click();
  await expect(page.locator(".express-card")).toBeVisible();
  await expect(page.locator(".route-guide")).toBeVisible();
  await page.getByText("计分说明", { exact: true }).click();
  await expect(page.locator(".map-panel")).toBeInViewport({ ratio: 1 });
  const preview = page.locator(".ticket-card").first();
  await preview.getByRole("button", { name: "对照地图" }).click();
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(2);
  await expect(page.locator("[data-endpoint]")).toHaveCount(2);
  for (const endpoint of await page.locator("[data-endpoint]").all()) {
    await expect(endpoint).toBeInViewport({ ratio: 1 });
  }
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  if (info.project.name === "desktop") {
    const board = (await page.locator(".map-panel").boundingBox())!,
      left = (await page.locator(".table-left").boundingBox())!,
      rail = (await page.locator(".deck-rail").boundingBox())!;
    expect(left.x + left.width).toBeLessThan(board.x);
    expect(rail.x).toBeGreaterThan(board.x + board.width);
    const taskDeck = (await page.locator(".ticket-deck").boundingBox())!,
      trainDeck = (await page.locator(".train-deck").boundingBox())!;
    expect(taskDeck.y + taskDeck.height).toBeLessThan(trainDeck.y);
    const faceups = await page.locator(".market .train-card").all();
    let previous = trainDeck.y + trainDeck.height;
    for (const card of faceups) {
      const box = (await card.boundingBox())!;
      expect(box.y).toBeGreaterThan(previous);
      previous = box.y + box.height;
    }
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/tabletop-setup-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "保留所选任务" }).click();
  await expect(page.locator(".hand button")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox").nth(2).check();
  await page.getByRole("button", { name: "保留所选任务" }).click();
  await expect(
    page.getByText("所有玩家已确认任务。发牌结束，准备开启第一个回合。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await expect(page.getByRole("button", { name: /从牌堆抽牌/ })).toBeEnabled();
});
test("claim immediately moves the colored marker and spends the matching plastic pieces", async ({
  page,
}, info) => {
  await page.goto("/e2e/harness.html?seed=7&players=2");
  const game = createGame(["Player 1", "Player 2"], europe, 7);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "查看我的回合 →" }).click();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "保留所选任务" }).click();
  }
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  const marker = page.locator('[data-score-player="p0"]');
  const original = await marker.getAttribute("style");
  const target = page.locator('[data-route="eu-wie-bud-2"] rect').first();
  if (info.project.name === "desktop") {
    await page.locator(".map-panel").scrollIntoViewIfNeeded();
    const source = (await page
      .locator('[data-piece-tool="wagon"]')
      .boundingBox())!;
    const destination = (await target.boundingBox())!;
    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      destination.x + destination.width / 2,
      destination.y + destination.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();
  } else {
    await target.tap();
  }
  await expect(page.locator('[data-route="eu-wie-bud-2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(marker).toHaveAttribute("data-points", "0");
  await expect(page.locator('[data-player="p0"] .wagon-piece')).toHaveCount(45);
  await expect(page.locator(".route-action button.primary")).toBeDisabled();
  await page.screenshot({
    path: `test-results/map-placement-${info.project.name}.png`,
    fullPage: true,
  });
  const index = game.players[0].hand.indexOf("white");
  await page.locator(".hand button").nth(index).click();
  await page.getByRole("button", { name: "确认铺设" }).click();
  await expect(marker).toHaveAttribute("data-points", "1");
  await expect(marker).toHaveAttribute("data-track-position", "1");
  expect(await marker.getAttribute("style")).not.toBe(original);
  await expect(page.locator('[data-player="p0"] .wagon-piece')).toHaveCount(44);
  await expect(
    page.locator('[data-route="eu-wie-bud-2"] rect').first(),
  ).toHaveAttribute("fill", "#bc4339");
  await expect(page.locator(".hand button")).toHaveCount(0);
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/tabletop-play-${info.project.name}.png`,
    fullPage: true,
  });
});
