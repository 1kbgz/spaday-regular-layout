import {
  RegularLayout as BaseRegularLayout,
  type Layout,
} from "regular-layout";

/** A regular-layout whose saved layout tree can be assigned as a spaday prop. */
export class SpadayRegularLayout extends BaseRegularLayout {
  #pendingLayout: Layout | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.style.display ||= "block";
    if (this.#pendingLayout) {
      this.restoreSync(this.#pendingLayout);
      this.#pendingLayout = null;
    }
  }

  get layout(): Layout {
    return this.save();
  }

  set layout(value: Layout | null) {
    if (!value) return;
    if (this.isConnected) {
      void this.restore(value);
    } else {
      this.#pendingLayout = value;
    }
  }
}

if (!customElements.get("spaday-regular-layout")) {
  customElements.define("spaday-regular-layout", SpadayRegularLayout);
}
