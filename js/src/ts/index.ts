// the guard must execute before the engine module registers its elements
import { restoreDefine } from "./define-guard";
import { frameLength, sizePanels } from "./panel-sizing";
import { version } from "regular-layout/package.json";
import {
  RegularLayout as BaseRegularLayout,
  type Layout,
} from "regular-layout";

restoreDefine(`regular-layout ${version}`, [
  "regular-layout",
  "regular-layout-frame",
  "regular-layout-tab",
]);

export interface EnsurePanelOptions {
  beside: string;
  side?: "left" | "right" | "top" | "bottom";
  stackBelow?: number;
}

/** A regular-layout whose saved layout tree can be assigned as a spaday prop. */
export class SpadayRegularLayout extends BaseRegularLayout {
  #pendingLayout: Layout | null = null;
  #restoring = 0;
  #opening: Promise<void> = Promise.resolve();
  #sizingFrame = 0;
  #pendingRestores = 0;
  #resize = new ResizeObserver(() => this.#scheduleSizing());
  #attributes = new MutationObserver((records) => {
    if (
      records.some((record) =>
        record.type === "childList"
          ? record.target === this
          : record.target.parentNode === this,
      )
    )
      this.#scheduleSizing();
  });

  #scheduleSizing(): void {
    if (this.#sizingFrame || !this.isConnected) return;
    this.#sizingFrame = requestAnimationFrame(() => {
      this.#sizingFrame = 0;
      if (this.#pendingRestores) return;
      const saved = this.save();
      const sized = sizePanels(this, saved);
      if (JSON.stringify(saved) !== JSON.stringify(sized))
        void this.restore(sized);
    });
  }

  constructor() {
    super();
    const restore = this.restore;
    const restoreSync = this.restoreSync;
    this.restore = async (layout, flattened) => {
      this.#pendingRestores++;
      try {
        await restore(sizePanels(this, layout), flattened);
      } finally {
        this.#pendingRestores--;
        this.#scheduleSizing();
      }
    };
    this.restoreSync = (layout, flattened) =>
      restoreSync(sizePanels(this, layout), flattened);
    // Frames drive drag-rearranging through these two instance methods; a
    // locked layout swallows them so tabs still select and close but panels
    // cannot be dragged into new positions.
    const setOverlay = this.setOverlayState;
    const clearOverlay = this.clearOverlayState;
    this.setOverlayState = async (...args) => {
      if (this.locked) return;
      return setOverlay(...args);
    };
    this.clearOverlayState = async (...args) => {
      if (this.locked) return;
      return clearOverlay(...args);
    };
  }

  get locked(): boolean {
    return this.hasAttribute("locked");
  }

  set locked(value: boolean) {
    this.toggleAttribute("locked", Boolean(value));
  }

  connectedCallback(): void {
    this.#restoring += 1;
    super.connectedCallback();
    this.#resize.observe(this);
    this.#attributes.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["min-width", "max-width", "min-height", "max-height"],
    });
    queueMicrotask(() => {
      try {
        if (!this.isConnected || !this.#pendingLayout) return;
        this.restoreSync(this.#pendingLayout);
        this.#pendingLayout = null;
      } finally {
        this.#restoring -= 1;
      }
    });
  }

  disconnectedCallback(): void {
    this.#resize.disconnect();
    this.#attributes.disconnect();
    cancelAnimationFrame(this.#sizingFrame);
    this.#sizingFrame = 0;
    super.disconnectedCallback();
  }

  get restoring(): boolean {
    return this.#restoring > 0;
  }

  get layout(): Layout {
    return this.save();
  }

  /** Insert `name` if it is not laid out yet, then select it — the one-call "open this tab",
   * made for spaday's `Invoke` action:
   * `Invoke(by_id("layout"), "openPanel", event_prop("currentTarget.dataset.tab"))`. */
  async openPanel(name: string): Promise<void> {
    if (!name) return;
    if (this.calculatePath(name) === null) await this.insertPanel(name);
    await this.select(name);
  }

  /** Place an absent panel beside a tab stack; existing placements are preserved. */
  ensurePanel(name: string, options: EnsurePanelOptions): Promise<void> {
    const run = this.#opening
      .catch(() => {})
      .then(async () => {
        const frame = Array.from(this.children).find(
          (child) => child.getAttribute("name") === name,
        );
        if (!frame) throw new Error(`Unknown panel: ${name}`);
        if (this.calculatePath(name) !== null) {
          await this.select(name);
          return;
        }
        let side = options.side ?? "right";
        if (!["left", "right", "top", "bottom"].includes(side))
          throw new Error(`Invalid side: ${side}`);
        if (
          options.stackBelow !== undefined &&
          (!Number.isFinite(options.stackBelow) || options.stackBelow < 0)
        )
          throw new Error("stackBelow must be a non-negative width");
        if (
          options.stackBelow !== undefined &&
          this.clientWidth < options.stackBelow
        )
          side = "bottom";
        const horizontal = side === "left" || side === "right";
        const before = side === "left" || side === "top";
        let found = false;
        const insert = (
          node: Layout,
          width: number,
          height: number,
        ): Layout => {
          if (node.type === "split-layout")
            return {
              ...node,
              children: node.children.map((child, i) =>
                insert(
                  child,
                  node.orientation === "horizontal"
                    ? width * node.sizes[i]
                    : width,
                  node.orientation === "vertical"
                    ? height * node.sizes[i]
                    : height,
                ),
              ),
            };
          if (!node.tabs.includes(options.beside)) return node;
          found = true;
          const extent = horizontal ? width : height;
          const preferred = frameLength(
            frame,
            horizontal ? "preferred-width" : "preferred-height",
            horizontal ? this.clientWidth : this.clientHeight,
          );
          const share =
            extent > 0 && preferred !== undefined
              ? Math.min(0.99, Math.max(0.01, preferred / extent))
              : 0.5;
          const leaf: Layout = {
            type: "tab-layout",
            tabs: [name],
            selected: 0,
          };
          return {
            type: "split-layout",
            orientation: horizontal ? "horizontal" : "vertical",
            children: before ? [leaf, node] : [node, leaf],
            sizes: before ? [share, 1 - share] : [1 - share, share],
          };
        };
        const next = insert(this.save(), this.clientWidth, this.clientHeight);
        if (!found) throw new Error(`Panel is not laid out: ${options.beside}`);
        await this.restore(next);
        await this.select(name);
      });
    this.#opening = run;
    return run;
  }

  set layout(value: Layout | null) {
    if (!value) return;
    if (this.isConnected) {
      this.#restoring += 1;
      void this.restore(value).finally(() => {
        this.#restoring -= 1;
      });
    } else {
      this.#pendingLayout = value;
    }
  }
}

if (!customElements.get("spaday-regular-layout")) {
  customElements.define("spaday-regular-layout", SpadayRegularLayout);
}
