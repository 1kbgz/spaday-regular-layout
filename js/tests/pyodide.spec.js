import fs from "fs";
import { expect, test } from "@playwright/test";

const built = fs.existsSync("dist/lite/index.html");

test("runs the complete example in Pyodide", async ({ page }) => {
  test.skip(!built, "run `make pyodide-example` first");
  test.setTimeout(180_000);

  await page.goto("/dist/lite/index.html");
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.ready === "true" ||
      document.querySelector("#pyodide-status")?.textContent ===
        "Unable to start",
    undefined,
    { timeout: 150_000 },
  );
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.getByText("Navigation", { exact: true })).toBeVisible();
  await expect(page.getByText("Workspace", { exact: true })).toBeVisible();
  await expect(page.getByText("Activity", { exact: true })).toBeVisible();
  const layout = page.locator("spaday-regular-layout");
  await expect(layout).toBeVisible();

  const savedLayout = {
    type: "tab-layout",
    tabs: ["workspace", "navigation", "activity"],
    selected: 0,
  };
  const response = await page.evaluate(async (body) => {
    const result = await fetch("/api/layout", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return result.json();
  }, savedLayout);
  expect(response).toEqual({ saved: true });
  await expect
    .poll(() => layout.evaluate((element) => element.layout))
    .toEqual(savedLayout);

  await expect
    .poll(() => layout.evaluate((element) => element.layout?.orientation), {
      timeout: 10_000,
    })
    .toBe("vertical");
});
