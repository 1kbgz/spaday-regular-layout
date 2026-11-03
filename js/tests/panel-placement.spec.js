import { expect, test } from "@playwright/test";

async function setup(page, width = 1000) {
  await page.goto("/dist/index.html");
  await page.evaluate((width) => {
    const layout = document.createElement("spaday-regular-layout");
    layout.id = "layout";
    layout.style.cssText = `width:${width}px;height:600px`;
    for (const name of ["workspace", "editor", "other"]) {
      const frame = document.createElement("regular-layout-frame");
      frame.setAttribute("name", name);
      layout.append(frame);
    }
    layout.layout = { type: "tab-layout", tabs: ["workspace"] };
    document.body.append(layout);
  }, width);
}

test("ensurePanel places an absent panel and preserves an existing placement", async ({
  page,
}) => {
  await setup(page);
  const saved = await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    await layout.ensurePanel("editor", {
      beside: "workspace",
      side: "right",
      stackBelow: 800,
    });
    const first = layout.save();
    first.sizes = [0.65, 0.35];
    await layout.restore(first);
    await layout.ensurePanel("editor", { beside: "workspace", side: "left" });
    return layout.save();
  });
  expect(saved.orientation).toBe("horizontal");
  expect(saved.children.map((child) => child.tabs)).toEqual([
    ["workspace"],
    ["editor"],
  ]);
  expect(saved.sizes).toEqual([0.65, 0.35]);
});

test("narrow hosts insert below, with preferred height and no duplicate concurrent panels", async ({
  page,
}) => {
  await setup(page, 700);
  const saved = await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    layout
      .querySelector('[name="editor"]')
      .setAttribute("preferred-height", "200px");
    const options = { beside: "workspace", side: "right", stackBelow: 800 };
    await Promise.all([
      layout.ensurePanel("editor", options),
      layout.ensurePanel("editor", options),
    ]);
    return layout.save();
  });
  expect(saved.orientation).toBe("vertical");
  expect(saved.children).toHaveLength(2);
  expect(saved.sizes[1]).toBeCloseTo(1 / 3);
});

test("nested placement preserves siblings and reports invalid targets without poisoning later opens", async ({
  page,
}) => {
  await setup(page);
  const saved = await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    await layout.restore({
      type: "split-layout",
      orientation: "vertical",
      sizes: [0.7, 0.3],
      children: [
        { type: "tab-layout", tabs: ["workspace"] },
        { type: "tab-layout", tabs: ["other"] },
      ],
    });
    await layout.ensurePanel("editor", { beside: "missing" }).catch((error) => {
      window.failure = error.message;
    });
    await layout.ensurePanel("editor", { beside: "workspace", side: "left" });
    return { saved: layout.save(), failure: window.failure };
  });
  expect(saved.failure).toContain("missing");
  expect(saved.saved.sizes).toEqual([0.7, 0.3]);
  expect(saved.saved.children[1].tabs).toEqual(["other"]);
  expect(saved.saved.children[0].children[0].tabs).toEqual(["editor"]);
});

test("frame bounds constrain actual split widths on restore, resize and attribute updates", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    const frame = layout.querySelector('[name="editor"]');
    frame.setAttribute("min-width", "20rem");
    frame.setAttribute("preferred-width", "24rem");
    frame.setAttribute("max-width", "30rem");
    await layout.ensurePanel("editor", { beside: "workspace" });
  });
  const editor = page.locator('regular-layout-frame[name="editor"]');
  await expect
    .poll(async () => (await editor.boundingBox()).width)
    .toBeCloseTo(384, 0);
  await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    const saved = layout.save();
    saved.sizes = [0.1, 0.9];
    await layout.restore(saved);
  });
  await expect
    .poll(async () => (await editor.boundingBox()).width)
    .toBeCloseTo(480, 0);
  await page.locator("#layout").evaluate((layout) => {
    layout.style.width = "600px";
  });
  await expect
    .poll(async () => (await editor.boundingBox()).width)
    .toBeCloseTo(320, 0);
  await editor.evaluate((frame) => frame.setAttribute("min-width", "22rem"));
  await expect
    .poll(async () => (await editor.boundingBox()).width)
    .toBeCloseTo(352, 0);
});

test("infeasible minima fit the container and reconnect resumes size observation", async ({
  page,
}) => {
  await setup(page, 300);
  await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    for (const frame of layout.children)
      frame.setAttribute("min-width", "200px");
    await layout.ensurePanel("editor", { beside: "workspace" });
    layout.remove();
    document.body.append(layout);
  });
  await expect
    .poll(
      async () =>
        (
          await page
            .locator('regular-layout-frame[name="editor"]')
            .boundingBox()
        ).width,
    )
    .toBeCloseTo(150, 0);
  await page.locator("#layout").evaluate((layout) => {
    layout.style.width = "500px";
  });
  await expect
    .poll(
      async () =>
        (
          await page
            .locator('regular-layout-frame[name="editor"]')
            .boundingBox()
        ).width,
    )
    .toBeCloseTo(250, 0);
});

test("replacing a frame applies its new constraints without changing the layout prop", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(async () => {
    const layout = document.querySelector("#layout");
    await layout.ensurePanel("editor", { beside: "workspace" });
    const replacement = document.createElement("regular-layout-frame");
    replacement.setAttribute("name", "editor");
    replacement.setAttribute("min-width", "700px");
    layout.querySelector('[name="editor"]').replaceWith(replacement);
  });
  await expect
    .poll(
      async () =>
        (
          await page
            .locator('regular-layout-frame[name="editor"]')
            .boundingBox()
        ).width,
    )
    .toBeCloseTo(700, 0);
});
