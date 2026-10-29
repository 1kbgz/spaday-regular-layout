import { expect, test } from "@playwright/test";

test("application tabs have a distinct active marker in either theme", async ({
  page,
}) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.className = "spa";
    layout.style.cssText = "width:600px;height:300px";
    for (const name of ["one", "two"]) {
      const frame = document.createElement("regular-layout-frame");
      frame.setAttribute("name", name);
      frame.textContent = name;
      layout.append(frame);
    }
    layout.layout = { type: "tab-layout", tabs: ["one", "two"] };
    document.body.append(layout);
  });
  for (const mode of ["wa-light", "wa-dark"]) {
    await page.evaluate((mode) => {
      document.documentElement.className = mode;
    }, mode);
    const active = page.locator('regular-layout-tab[part~="active-tab"]');
    await expect(active).toHaveCSS("font-weight", "600");
    await expect(active).toHaveCSS(
      "box-shadow",
      /inset.*0px 3px 0px 0px|0px 3px 0px 0px inset/,
    );
    await page.locator("regular-layout-tab").last().click();
    await expect(page.locator("regular-layout-tab").last()).toHaveAttribute(
      "part",
      /active-tab/,
    );
  }
});
