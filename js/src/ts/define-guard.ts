/** Tolerate another bundle having already registered the engine's custom elements.
 *
 * Perspective 5's viewer bundles the same `regular-layout` engine and registers
 * `regular-layout` / `regular-layout-frame` / `regular-layout-tab` at import. Whichever
 * bundle loads second would throw from `customElements.define` and die entirely —
 * taking the `spaday-regular-layout` wrapper with it. Importing this module FIRST makes
 * `define` idempotent (skip names that already exist); `restoreDefine()` puts the real
 * one back immediately after the engine import, so the guard never leaks to other
 * scripts. Both bundles pin the engine to the same exact version, so adopting the other
 * copy's registration is adopting identical code.
 */

const original = customElements.define.bind(customElements);

customElements.define = (
  name: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
) => {
  if (!customElements.get(name)) original(name, ctor, options);
};

export function restoreDefine(): void {
  customElements.define = original;
}
