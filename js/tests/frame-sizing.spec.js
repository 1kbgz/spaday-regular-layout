import { expect, test } from "@playwright/test";

for (const theme of ["", "spa", "lorax"]) {
  test(`oversized content stays within split frames (${theme || "unstyled"})`, async ({
    page,
  }) => {
    await page.goto("/dist/index.html");
    await page.evaluate((theme) => {
      const layout = document.createElement("spaday-regular-layout");
      layout.className = theme;
      layout.style.cssText = "width:600px;height:300px";
      for (const name of ["left", "right"]) {
        const frame = document.createElement("regular-layout-frame");
        frame.setAttribute("name", name);
        const content = document.createElement("div");
        content.style.cssText = "width:1000px;height:700px";
        frame.append(content);
        layout.append(frame);
      }
      document.body.append(layout);
    }, theme);
    for (const orientation of ["horizontal", "vertical", "horizontal"]) {
      await page.evaluate((orientation) => {
        document.querySelector("spaday-regular-layout").layout = {
          type: "split-layout",
          orientation,
          sizes: [0.5, 0.5],
          children: [
            { type: "tab-layout", tabs: ["left"] },
            { type: "tab-layout", tabs: ["right"] },
          ],
        };
      }, orientation);
      await expect
        .poll(() =>
          page.locator("regular-layout-frame").evaluateAll((frames) =>
            frames.map((frame) => {
              const box = frame.getBoundingClientRect();
              return [Math.round(box.width), Math.round(box.height)];
            }),
          ),
        )
        .toEqual(
          orientation === "horizontal"
            ? [
                [300, 300],
                [300, 300],
              ]
            : [
                [600, 150],
                [600, 150],
              ],
        );
    }
  });
}
