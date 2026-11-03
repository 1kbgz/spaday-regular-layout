import type { Layout } from "regular-layout";

type Axis = "width" | "height";
type Bounds = [number, number];

/** Frame dimensions accept px, rem, em, or percentages of the layout. */
export function frameLength(
  frame: Element | undefined,
  attribute: string,
  total: number,
): number | undefined {
  const value = frame?.getAttribute(attribute);
  if (!value) return;
  const match = /^(\d+(?:\.\d+)?)(px|rem|em|%)$/.exec(value.trim());
  if (!match) return;
  const scale =
    match[2] === "%"
      ? total / 100
      : match[2] === "rem"
        ? parseFloat(getComputedStyle(document.documentElement).fontSize)
        : match[2] === "em"
          ? parseFloat(getComputedStyle(frame!).fontSize)
          : 1;
  const result = Number(match[1]) * scale;
  return Number.isFinite(result) ? result : undefined;
}

/** Fit split proportions to selected frames' bounds without overflowing the host. */
export function sizePanels(host: HTMLElement, layout: Layout): Layout {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return layout;
  const frames = new Map(
    Array.from(host.children, (frame) => [frame.getAttribute("name"), frame]),
  );
  const bounds = (node: Layout, axis: Axis): Bounds => {
    if (node.type === "tab-layout") {
      const frame = frames.get(node.tabs[node.selected ?? 0]);
      const total = axis === "width" ? width : height;
      const min = frameLength(frame, `min-${axis}`, total) ?? 0;
      return [
        min,
        Math.max(min, frameLength(frame, `max-${axis}`, total) ?? Infinity),
      ];
    }
    const children = node.children.map((child) => bounds(child, axis));
    const parallel = (node.orientation === "horizontal") === (axis === "width");
    return parallel
      ? [
          children.reduce((sum, b) => sum + b[0], 0),
          children.reduce((sum, b) => sum + b[1], 0),
        ]
      : [
          Math.max(...children.map((b) => b[0])),
          Math.min(...children.map((b) => b[1])),
        ];
  };
  const visit = (node: Layout, w: number, h: number): Layout => {
    if (node.type === "tab-layout") return node;
    const horizontal = node.orientation === "horizontal";
    const total = horizontal ? w : h;
    if (total <= 0) return node;
    const limits = node.children.map((child) =>
      bounds(child, horizontal ? "width" : "height"),
    );
    const minSum = limits.reduce((sum, b) => sum + b[0], 0);
    const maxSum = limits.reduce((sum, b) => sum + b[1], 0);
    // Impossible constraints yield to fitting the container. Keep relative minima/maxima.
    let pixels: number[];
    if (minSum > total) pixels = limits.map((b) => (b[0] / minSum) * total);
    else if (maxSum < total && maxSum > 0)
      pixels = limits.map((b) => (b[1] / maxSum) * total);
    else if (maxSum === 0) pixels = node.sizes.map((size) => size * total);
    else {
      // Project the requested sizes onto the bounded simplex. The common offset
      // redistributes space only when a sibling reaches its min or max.
      let low = -total;
      let high = total;
      for (let i = 0; i < 50; i++) {
        const offset = (low + high) / 2;
        const sum = limits.reduce(
          (sum, [min, max], index) =>
            sum +
            Math.min(max, Math.max(min, node.sizes[index] * total + offset)),
          0,
        );
        if (sum > total) high = offset;
        else low = offset;
      }
      pixels = limits.map(([min, max], i) =>
        Math.min(max, Math.max(min, node.sizes[i] * total + (low + high) / 2)),
      );
    }
    const sizes = pixels.map((size, i) =>
      Math.abs(size / total - node.sizes[i]) < 1e-8
        ? node.sizes[i]
        : size / total,
    );
    return {
      ...node,
      sizes,
      children: node.children.map((child, i) =>
        visit(child, horizontal ? pixels[i] : w, horizontal ? h : pixels[i]),
      ),
    };
  };
  return visit(layout, width, height);
}
