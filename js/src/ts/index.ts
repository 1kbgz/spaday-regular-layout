// the guard must execute before the engine module registers its elements
import { restoreDefine } from "./define-guard";
import {
  RegularLayout as BaseRegularLayout,
  type Layout,
} from "regular-layout";

restoreDefine();

/** A regular-layout whose saved layout tree can be assigned as a spaday prop. */
export class SpadayRegularLayout extends BaseRegularLayout {
  #pendingLayout: Layout | null = null;
  #restoring = 0;

  connectedCallback(): void {
    this.#restoring += 1;
    super.connectedCallback();
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

  get restoring(): boolean {
    return this.#restoring > 0;
  }

  get layout(): Layout {
    return this.save();
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
