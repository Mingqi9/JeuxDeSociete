import { test, expect } from "@playwright/test";
test("local ticket setup, privacy handoff, card turn and early training score", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#map-mode").selectOption("demo");
  await expect(
    page.getByText("本地轮流操作 · 无联网房间", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "开始本地训练 →" }).click();
  await expect(page.getByRole("heading", { name: /Alice/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的车牌" })).toHaveCount(0);
  for (const name of ["Alice", "Camille"]) {
    await expect(
      page.getByRole("heading", { name: new RegExp(name) }),
    ).toBeVisible();
    await page.getByRole("button", { name: "查看我的回合 →" }).click();
    await expect(
      page.getByRole("button", { name: "保留所选任务" }),
    ).toBeDisabled();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "保留所选任务" }).click();
  }
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await expect(page.getByRole("button", { name: "确认铺设" })).toHaveCount(0);
  await page.getByRole("button", { name: /从牌堆抽牌/ }).click();
  await expect(
    page.getByText("请再抽一张车牌（不能选公开机车）"),
  ).toBeVisible();
  await page.getByRole("button", { name: /从牌堆抽牌/ }).click();
  await expect(page.getByRole("heading", { name: /Camille/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的车牌" })).toHaveCount(0);
  await page.getByRole("button", { name: "查看我的回合 →" }).click();
  await page.locator(".finish-options summary").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "结束训练并计分" }).click();
  await expect(page.getByRole("heading", { name: "训练计分" })).toBeVisible();
  await expect(page.locator(".result")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("French preference persists and mobile layout stays within viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#map-mode").selectOption("demo");
  await page.getByRole("button", { name: "FR Français" }).click();
  await expect(page.getByLabel("Pseudos (un par ligne)")).toBeVisible();
  await page.reload();
  await page.locator("#map-mode").selectOption("demo");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page
    .getByRole("button", { name: "Commencer l’entraînement local →" })
    .click();
  await page.getByRole("button", { name: "Afficher mon tour →" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByLabel("Zoom de la carte")).toBeVisible();
  await page.screenshot({
    path: `test-results/local-${test.info().project.name}.png`,
    fullPage: true,
  });
});
