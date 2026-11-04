import { test, expect } from "@playwright/test";

test("two independent browsers join, play privately, refresh and reconnect", async ({
  browser,
  page,
}, info) => {
  const other = await browser.newContext({
    viewport: info.project.use.viewport,
  });
  const friend = await other.newPage();
  const frames: string[] = [];
  friend.on("websocket", (ws) =>
    ws.on("framereceived", (frame) => frames.push(String(frame.payload))),
  );
  try {
    await page.goto("/?online=1");
    await page.getByLabel("你的昵称").fill("Alice");
    await page.getByRole("button", { name: "创建私人房间" }).click();
    await expect(
      page.getByRole("heading", { name: "等待玩家加入" }),
    ).toBeVisible();
    const invite = await page.getByLabel("邀请链接").inputValue();
    await friend.goto(invite);
    await friend.getByLabel("你的昵称").fill("Bob");
    await friend.getByRole("button", { name: "加入房间", exact: true }).click();
    await expect(page.locator(".lobby-seats")).toContainText("Bob");
    await page.getByRole("button", { name: "房主开始游戏" }).click();
    await expect(page.locator(".hand button")).toHaveCount(4);
    await expect(friend.locator(".hand button")).toHaveCount(4);
    await expect(page.getByRole("checkbox")).toHaveCount(4);
    await expect(friend.getByRole("checkbox")).toHaveCount(4);
    await expect(page.locator(".deck-rail")).toHaveCount(0);
    await friend.getByRole("checkbox").nth(0).check();
    await friend.getByRole("checkbox").nth(1).check();
    await page.getByRole("checkbox").nth(0).check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "保留所选任务" }).click();
    await expect(friend.getByRole("checkbox")).toHaveCount(4);
    await expect(friend.getByRole("checkbox").nth(0)).toBeChecked();
    await expect(friend.getByRole("checkbox").nth(1)).toBeChecked();
    await friend.getByRole("button", { name: "保留所选任务" }).click();
    await expect(
      page.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeEnabled();
    await expect(
      friend.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeDisabled();
    await friend.getByRole("button", { name: "按颜色排序" }).click();
    const sorted = await friend.locator(".hand button").allTextContents();
    await friend.locator(".hand button").first().press("Alt+ArrowRight");
    const reordered = await friend.locator(".hand button").allTextContents();
    expect(reordered).toEqual([sorted[1], sorted[0], ...sorted.slice(2)]);
    await friend
      .getByRole("button", { name: "标记完成并收藏" })
      .first()
      .click();
    await friend.locator(".travel-collection summary").click();
    await expect(friend.locator(".travel-collection .ticket-card")).toHaveCount(
      1,
    );
    await friend.getByRole("button", { name: "音效：关" }).click();
    await expect(
      friend.getByRole("button", { name: "音效：开" }),
    ).toBeVisible();
    const hand = await friend.locator(".hand").textContent();
    await friend.locator('[data-city="Paris"]').press("Enter");
    await expect(friend.locator(".map-caption")).toContainText("巴黎");
    await expect(friend.getByRole("button", { name: "确认建站" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: /从牌堆抽牌/ }).click();
    await expect(page.locator(".hand button")).toHaveCount(5);
    await page.getByRole("button", { name: /从牌堆抽牌/ }).click();
    await expect(
      friend.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeEnabled();
    await expect(friend.locator(".hand")).toHaveText(hand!);
    await expect(friend.locator(".travel-collection summary")).toContainText(
      "(1)",
    );
    await friend.reload();
    await expect(
      friend.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeEnabled();
    await expect(friend.locator(".hand")).toHaveText(hand!);
    await other.setOffline(true);
    await expect(friend.locator(".mode-banner")).toContainText("重连", {
      timeout: 30000,
    });
    await other.setOffline(false);
    await expect(friend.locator(".mode-banner")).toContainText("已连接", {
      timeout: 20000,
    });
    await expect(
      friend.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeEnabled();
    await friend.locator('[data-city="Paris"]').press("Enter");
    await friend.locator(".hand button").first().click();
    await expect(
      friend.getByRole("button", { name: "确认建站" }),
    ).toBeEnabled();
    await friend.getByRole("button", { name: "确认建站" }).click();
    await expect(page.locator('[data-city="Paris"] path')).toHaveAttribute(
      "fill",
      "#3f825f",
    );
    await expect(
      page.getByRole("button", { name: /从牌堆抽牌/ }),
    ).toBeEnabled();
    for (const raw of frames) {
      const message = JSON.parse(raw);
      expect(
        message.type === "error" && message.code === "INVALID_REQUEST",
      ).toBe(false);
      const room = message.room;
      if (!room?.table) continue;
      expect(room.table).not.toHaveProperty("deck");
      expect(room.table).not.toHaveProperty("rng");
      expect(room.table).not.toHaveProperty("initialOffers");
      expect(room.self.name).toBe("Bob");
      for (const p of room.table.players) {
        expect(p).not.toHaveProperty("hand");
        expect(p).not.toHaveProperty("tickets");
      }
    }
    await friend.screenshot({
      path: `test-results/online-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await other.close();
  }
});
