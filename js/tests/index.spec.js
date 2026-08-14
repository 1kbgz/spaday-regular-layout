import { expect, test } from "@playwright/test";

test("restores a serializable layout and emits updates", async ({ page }) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.className = "lorax";
    layout.style.cssText = "display:block;width:800px;height:400px";
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
    });
    document.body.appendChild(layout);
  });

  await expect(page.locator('regular-layout-frame[name="left"]')).toBeVisible();
  await expect(page.locator('regular-layout-frame[name="main"]')).toBeVisible();
  await page.evaluate(() => {
    window.__updates = 0;
  });
  await page.locator("spaday-regular-layout").evaluate((layout) => {
    layout.layout = { type: "tab-layout", tabs: ["main"] };
  });
  await expect.poll(() => page.evaluate(() => window.__updates)).toBe(1);
});
