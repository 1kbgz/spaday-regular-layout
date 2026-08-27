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

test("the spa theme follows the wa-dark page mode on shell tokens", async ({
  page,
}) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.className = "spa";
    layout.style.cssText = "width:800px;height:400px";
    const frame = document.createElement("regular-layout-frame");
    frame.setAttribute("name", "main");
    frame.textContent = "main";
    layout.appendChild(frame);
    layout.layout = { type: "tab-layout", tabs: ["main"] };
    document.body.appendChild(layout);
  });
  const container = () =>
    page
      .locator('regular-layout-frame[name="main"]')
      .evaluate(
        (frame) =>
          getComputedStyle(frame.shadowRoot.querySelector('[part="container"]'))
            .backgroundColor,
      );
  const activeTab = () =>
    page
      .locator('regular-layout-frame[name="main"] regular-layout-tab')
      .evaluate((tab) => getComputedStyle(tab).backgroundColor);

  await expect.poll(container).toBe("rgb(255, 255, 255)"); // --spa-surface light default
  expect(await activeTab()).toBe("rgb(255, 255, 255)"); // the active tab shares the surface

  await page.evaluate(() => document.documentElement.classList.add("wa-dark"));
  await expect.poll(container).toBe("rgb(21, 25, 30)"); // #15191e, the shell's dark surface
  expect(await activeTab()).toBe("rgb(21, 25, 30)");

  await page.evaluate(() =>
    document.documentElement.classList.remove("wa-dark"),
  );
  await expect.poll(container).toBe("rgb(255, 255, 255)");
});

test("survives another bundle registering the engine's elements first", async ({
  page,
}) => {
  await page.goto("/dist/index.html");
  const r = await page.evaluate(async () => {
    // simulate perspective's viewer bundle having won the registration race: its copy
    // of the engine defines these tags before our bundle executes
    const errors = [];
    window.addEventListener("error", (e) => errors.push(String(e.message)));
    const rig = document.createElement("iframe");
    document.body.appendChild(rig);
    const doc = rig.contentDocument;
    const win = rig.contentWindow;
    for (const tag of [
      "regular-layout",
      "regular-layout-frame",
      "regular-layout-tab",
    ]) {
      win.customElements.define(tag, class extends win.HTMLElement {});
    }
    let imported = true;
    try {
      await win.eval(`import("${location.origin}/dist/cdn/index.js")`);
    } catch (error) {
      imported = false;
      errors.push(String(error));
    }
    return {
      imported,
      wrapperDefined: !!win.customElements.get("spaday-regular-layout"),
      defineRestored:
        win.customElements.define !== undefined &&
        String(win.customElements.define).includes("native code"),
      errors,
    };
  });
  expect(r.imported).toBe(true); // the bundle no longer dies on the double define
  expect(r.wrapperDefined).toBe(true); // and still registers the wrapper element
  expect(r.defineRestored).toBe(true); // the guard did not leak past the engine import
  expect(r.errors).toEqual([]);
});

test("locked layouts select tabs but do not drag-rearrange", async ({
  page,
}) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.id = "locked-rig";
    layout.locked = true;
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
      sizes: [0.5, 0.5],
      children: [
        { type: "tab-layout", tabs: ["left"] },
        { type: "tab-layout", tabs: ["main"] },
      ],
    };
    document.body.appendChild(layout);
  });
  await expect(page.locator('regular-layout-frame[name="left"]')).toBeVisible();
  const before = await page.evaluate(() =>
    JSON.stringify(document.getElementById("locked-rig").save()),
  );

  const drag = async () => {
    const left = await page
      .locator('regular-layout-frame[name="left"]')
      .boundingBox();
    const main = await page
      .locator('regular-layout-frame[name="main"]')
      .boundingBox();
    await page.mouse.move(left.x + 30, left.y + 12);
    await page.mouse.down();
    await page.mouse.move(main.x + main.width / 2, main.y + main.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
  };

  await drag();
  const locked = await page.evaluate(() => {
    const layout = document.getElementById("locked-rig");
    return {
      layout: JSON.stringify(layout.save()),
      attribute: layout.hasAttribute("locked"),
    };
  });
  expect(locked.attribute).toBe(true); // the property reflects to the attribute
  expect(locked.layout).toBe(before); // the drag was swallowed

  await page.evaluate(() => {
    document.getElementById("locked-rig").locked = false;
  });
  await drag();
  const unlocked = await page.evaluate(() =>
    JSON.stringify(document.getElementById("locked-rig").save()),
  );
  expect(unlocked).not.toBe(before); // the same gesture rearranges once unlocked
});

test("tall panel content cannot crush the tab titlebar", async ({ page }) => {
  await page.goto("/dist/index.html");
  await page.evaluate(() => {
    const layout = document.createElement("spaday-regular-layout");
    layout.id = "tall-rig";
    layout.className = "spa";
    layout.style.cssText = "width:800px;height:300px";
    const frame = document.createElement("regular-layout-frame");
    frame.setAttribute("name", "chart");
    const tall = document.createElement("div");
    tall.style.cssText = "height:5000px";
    frame.appendChild(tall);
    layout.appendChild(frame);
    layout.layout = { type: "tab-layout", tabs: ["chart"] };
    document.body.appendChild(layout);
  });
  await expect(
    page.locator('regular-layout-frame[name="chart"]'),
  ).toBeVisible();
  const r = await page.evaluate(() => {
    const frame = document.querySelector('regular-layout-frame[name="chart"]');
    const titlebar = frame.shadowRoot.querySelector('[part~="titlebar"]');
    const container = frame.shadowRoot.querySelector('[part~="container"]');
    const cr = container.getBoundingClientRect();
    return {
      titlebarHeight: titlebar.getBoundingClientRect().height,
      containerBottom: cr.bottom,
      frameBottom: frame.getBoundingClientRect().bottom,
      scrolls: container.scrollHeight > container.clientHeight,
    };
  });
  expect(r.titlebarHeight).toBe(24); // the min-content floor must not crush the tabs
  expect(r.containerBottom).toBeLessThanOrEqual(r.frameBottom + 1);
  expect(r.scrolls).toBe(true); // tall content scrolls inside the panel
});

test("openPanel inserts a missing panel and selects an existing one", async ({
  page,
}) => {
  await page.goto("/dist/index.html");
  const r = await page.evaluate(async () => {
    const layout = document.createElement("spaday-regular-layout");
    layout.style.cssText = "width:600px;height:300px";
    for (const name of ["home", "extra"]) {
      const frame = document.createElement("regular-layout-frame");
      frame.setAttribute("name", name);
      frame.textContent = name;
      layout.appendChild(frame);
    }
    layout.layout = { type: "tab-layout", tabs: ["home"] };
    document.body.appendChild(layout);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await layout.openPanel("extra"); // not laid out yet: inserted, then selected
    const afterInsert = layout.save();
    await layout.openPanel("home"); // already present: selected only, no duplicate
    const afterSelect = layout.save();
    return { afterInsert, afterSelect };
  });
  expect([...r.afterInsert.tabs].sort()).toEqual(["extra", "home"]);
  expect(r.afterInsert.tabs[r.afterInsert.selected]).toBe("extra"); // inserted and selected
  expect([...r.afterSelect.tabs].sort()).toEqual(["extra", "home"]); // no duplicate insert
  expect(r.afterSelect.tabs[r.afterSelect.selected]).toBe("home"); // selected only
});
