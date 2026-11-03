import { test, expect, type Page } from "@playwright/test";
import { createGame, transition } from "../src/domain/engine";
import { europe } from "../src/data/europe";
import { scoreGame } from "../src/domain/scoring";
import type { Action, Card, Game } from "../src/domain/model";
import { playGame } from "../tests/support/playthrough";
async function reveal(page: Page) {
  const button = page.getByRole("button", { name: "查看我的回合 →" });
  if (await button.count()) await button.click();
}
async function choosePayment(page: Page, g: Game, payment: Card[]) {
  const used = new Set<number>();
  for (const card of payment) {
    const i = g.players[g.active].hand.findIndex(
      (c, index) => c === card && !used.has(index),
    );
    if (i < 0) throw Error(`Missing ${card}`);
    used.add(i);
    await page.locator(".hand button").nth(i).click();
  }
}
async function perform(page: Page, g: Game, action: Action) {
  await reveal(page);
  switch (action.type) {
    case "keepTickets": {
      if (g.pending?.kind !== "tickets") throw Error();
      const offer = g.pending.tickets;
      for (const id of action.ids)
        await page
          .getByRole("checkbox")
          .nth(offer.findIndex((t) => t.id === id))
          .check();
      await page.getByRole("button", { name: "保留所选任务" }).click();
      break;
    }
    case "drawCard":
      if (action.source === "blind")
        await page.getByRole("button", { name: /从牌堆抽牌/ }).click();
      else await page.locator(".market .train-card").nth(action.source).click();
      break;
    case "claim":
      await page
        .locator(`[data-route=${JSON.stringify(action.route)}]`)
        .press("Enter");
      await choosePayment(page, g, action.payment);
      await expect(
        page.getByRole("button", { name: "确认铺设" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "确认铺设" }).click();
      break;
    case "station":
      await page
        .locator(`[data-city=${JSON.stringify(action.city)}]`)
        .press("Enter");
      await choosePayment(page, g, action.payment);
      await page.getByRole("button", { name: "确认建站" }).click();
      break;
    case "drawTickets":
      await page.getByRole("button", { name: /抽取目的地任务/ }).click();
      break;
    case "resolveTunnel":
      if (action.payment === null)
        await page
          .getByRole("button", { name: "放弃隧道（结束回合）" })
          .click();
      else {
        await choosePayment(page, g, action.payment);
        await page.getByRole("button", { name: "支付额外费用" }).click();
      }
      break;
  }
  await expect(page.getByRole("alert")).toHaveCount(0);
}
test("Europe candidate map plays a complete game in browser to automatic final scoring", async ({
  page,
}) => {
  test.setTimeout(180000);
  const run = playGame(europe, 2, 124),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/e2e/harness.html?seed=124&players=2");
  let game = run.initial;
  let ferry = false,
    tunnel = false,
    station = false;
  for (const step of run.steps) {
    await perform(page, game, step.action);
    if (step.action.type === "claim") {
      const id = step.action.route,
        r = europe.routes.find((r) => r.id === id)!;
      ferry ||= !!r.locomotives;
      tunnel ||= !!r.tunnel;
    }
    station ||= step.action.type === "station";
    game = transition(game, step.actor, step.action);
  }
  await expect(
    page.getByRole("heading", { name: "本地对局计分" }),
  ).toBeVisible();
  await expect(page.locator(".result")).toHaveCount(2);
  for (const row of scoreGame(game))
    await expect(
      page.getByRole("heading", {
        name: `#${row.rank} ${row.name} · ${row.total} 分`,
        exact: true,
      }),
    ).toBeVisible();
  expect({ ferry, tunnel, station }).toEqual({
    ferry: true,
    tunnel: true,
    station: true,
  });
  expect(
    run.steps.some(
      (s) => s.action.type === "resolveTunnel" && s.action.payment === null,
    ),
  ).toBe(true);
  expect(
    run.steps.some(
      (s) => s.action.type === "resolveTunnel" && s.action.payment !== null,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/europe-complete-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("Europe selection, distinct parallel tracks, ferry error, station occupancy and later tickets", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#map-mode")).toHaveValue("europe");
  await expect(page.locator("#map-mode option:checked")).toHaveText(
    "欧洲全图预览 · 数据待最终核验",
  );
  await expect(page.locator(".data-warning")).toBeVisible();
  await page.goto("/e2e/harness.html?seed=7&players=2");
  let game = createGame(["Player 1", "Player 2"], europe, 7);
  for (let i = 0; i < 2; i++) {
    if (game.pending?.kind !== "tickets") throw Error();
    const action: Action = {
      type: "keepTickets",
      ids: game.pending.tickets.slice(0, 2).map((t) => t.id),
    };
    await perform(page, game, action);
    game = transition(game, game.players[game.active].id, action);
  }
  await reveal(page);
  await page.screenshot({
    path: `test-results/europe-map-${test.info().project.name}.png`,
    fullPage: true,
  });
  const paths = page.locator('[data-route^="eu-lon-die-"]');
  await expect(paths).toHaveCount(2);
  const starts = await paths.evaluateAll((nodes) =>
    nodes.map((n) => {
      const l = n.querySelector("line")!;
      return [l.getAttribute("x1"), l.getAttribute("y1")].join(",");
    }),
  );
  expect(new Set(starts).size).toBe(2);
  // A regular-color pair cannot pay a 2-locomotive London–Amsterdam ferry.
  await page
    .locator(`[data-route=${JSON.stringify("eu-lon-ams-1")}]`)
    .press("Enter");
  const ordinary = game.players[0].hand.find((c) => c !== "wild");
  expect(ordinary).toBeTruthy();
  await choosePayment(page, game, ["red", "red"]);
  await expect(page.getByRole("button", { name: "确认铺设" })).toBeDisabled();
  await expect(page.getByText("渡轮需要更多机车。")).toBeVisible();
  await page.getByRole("button", { name: "清空", exact: true }).click();
  const card = game.players[0].hand[0];
  await choosePayment(page, game, [card]);
  await page.locator(`[data-city=${JSON.stringify("Paris")}]`).press("Enter");
  await page.getByRole("button", { name: "确认建站" }).click();
  game = transition(game, "p0", {
    type: "station",
    city: "Paris",
    payment: [card],
  });
  await reveal(page);
  await page.locator(`[data-city=${JSON.stringify("Paris")}]`).press("Enter");
  await choosePayment(page, game, [game.players[1].hand[0]]);
  await expect(page.getByRole("button", { name: "确认建站" })).toBeDisabled();
  await expect(page.getByText("城市不存在或已有车站。")).toBeVisible();
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await page.getByRole("button", { name: /抽取目的地任务/ }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("button", { name: "保留所选任务" }).click();
  await expect(page.getByRole("heading", { name: /Player 1/ })).toBeVisible();
  await reveal(page);
  await page
    .locator(`[data-route=${JSON.stringify("eu-wie-bud-2")}]`)
    .press("Enter");
  // Player 1's white card is still in hand after building the Paris station.
  await page.locator(".hand button").filter({ hasText: "白" }).first().click();
  await page.getByRole("button", { name: "确认铺设" }).click();
  await reveal(page);
  await page
    .locator(`[data-route=${JSON.stringify("eu-wie-bud-1")}]`)
    .press("Enter");
  await expect(page.getByRole("button", { name: "确认铺设" })).toBeDisabled();
  await expect(
    page.getByText("本局人数或同一玩家限制使另一条平行线不可用。"),
  ).toBeVisible();
});
