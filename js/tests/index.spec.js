import { expect, test } from "@playwright/test";

test("restores a serializable layout and emits updates", async ({ page }) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.className = "lorax";
    layout.style.cssText = "width:800px;height:400px";
    for (const name of ["left", "main"]) {
      const frame = document.createElement("regular-layout-frame");
      frame.setAttribute("name", name);
      frame.textContent = name;
      layout.appendChild(frame);
    }
    layout.layout = {
      type: "split-layout",
      orientation: "horizontal",
      sizes: [0.3, 0.7],
      children: [
        { type: "tab-layout", tabs: ["left"] },
        { type: "tab-layout", tabs: ["main"] },
      ],
    };
    layout.addEventListener("regular-layout-update", () => {
      window.__updates = (window.__updates || 0) + 1;
      window.__restoringDuringUpdate = layout.restoring;
    });
    document.body.appendChild(layout);
  });

  await expect(page.locator('regular-layout-frame[name="left"]')).toBeVisible();
  await expect(page.locator('regular-layout-frame[name="main"]')).toBeVisible();
  const left = await page
    .locator('regular-layout-frame[name="left"]')
    .boundingBox();
  const main = await page
    .locator('regular-layout-frame[name="main"]')
    .boundingBox();
  expect(left.width).toBeCloseTo(240, 0);
  expect(main.width).toBeCloseTo(560, 0);
  expect(main.x).toBeCloseTo(left.x + left.width, 0);
  await expect
    .poll(() =>
      page
        .locator('regular-layout-frame[name="left"]')
        .evaluate(
          (frame) =>
            getComputedStyle(
              frame.shadowRoot.querySelector('[part="container"]'),
            ).backgroundColor,
        ),
    )
    .not.toBe("rgba(0, 0, 0, 0)");
  const leftTab = page
    .locator('regular-layout-frame[name="left"]')
    .locator("regular-layout-tab");
  await expect(leftTab).toHaveAttribute("part", /active-tab/);
  await expect
    .poll(() =>
      leftTab
        .locator('[part="title"]')
        .evaluate((title) => getComputedStyle(title, "::before").content),
    )
    .toBe('"left"');

  const beforeDrag = await page
    .locator("spaday-regular-layout")
    .evaluate((layout) => layout.layout);
  const leftTabBox = await leftTab.boundingBox();
  const mainBox = await page
    .locator('regular-layout-frame[name="main"]')
    .boundingBox();
  await page.mouse.move(
    leftTabBox.x + leftTabBox.width / 2,
    leftTabBox.y + leftTabBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    mainBox.x + mainBox.width / 2,
    mainBox.y + mainBox.height / 2,
    {
      steps: 10,
    },
  );
  await page.mouse.up();
  await expect
    .poll(() =>
      page
        .locator("spaday-regular-layout")
        .evaluate((layout) => JSON.stringify(layout.layout)),
    )
    .not.toBe(JSON.stringify(beforeDrag));

  await page.evaluate(() => {
    window.__updates = 0;
  });
  await page.locator("spaday-regular-layout").evaluate((layout) => {
    layout.layout = { type: "tab-layout", tabs: ["main"] };
  });
  await expect.poll(() => page.evaluate(() => window.__updates)).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__restoringDuringUpdate))
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator("spaday-regular-layout")
        .evaluate((layout) => layout.restoring),
    )
    .toBe(false);
});

test("runs the Python layout with browser-to-server updates", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:8013");
  const layout = page.locator("spaday-regular-layout");
  await expect(
    layout.locator('regular-layout-frame[name="workspace"]'),
  ).toBeVisible();

  const update = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/layout") && request.method() === "POST",
  );
  await layout.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent("regular-layout-update", {
        detail: { type: "tab-layout", tabs: ["workspace"] },
      }),
    );
  });
  expect((await update).postDataJSON()).toEqual({
    type: "tab-layout",
    tabs: ["workspace"],
  });
});
