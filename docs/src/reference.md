# API reference

## `RegularLayout`

Tag: `<spaday-regular-layout>`.

| Prop     | Type    | Description                                          |
| -------- | ------- | ---------------------------------------------------- |
| `layout` | mapping | Serializable split/tab tree restored by the element. |

Assigning `layout` before connection queues the value. Assigning it after connection calls upstream
`restore()`. Reading the browser property returns upstream `save()`.

```{eval-rst}
.. autoclass:: spaday_regular_layout.RegularLayout
   :members:
```

## `RegularLayoutFrame`

Tag: `<regular-layout-frame>`.

| Prop   | Type  | Description                               |
| ------ | ----- | ----------------------------------------- |
| `name` | `str` | Stable name referenced by tab node lists. |

Frames are default-slot children of `RegularLayout`.

The frame's content area (`::part(container)`) computes to `display: block` with a definite height,
so `flex: 1` on slotted children silently does nothing. Use `height: 100%` on slotted content to
fill the panel.

## Layout nodes

A tab node has `type="tab-layout"` and a `tabs` list of frame names. A split node has
`type="split-layout"`, `orientation`, `sizes`, and a `children` list containing tab or split nodes.

## Events

| Event                          | Detail                      |
| ------------------------------ | --------------------------- |
| `regular-layout-update`        | Complete saved layout tree  |
| `regular-layout-before-update` | Pending layout tree         |
| `regular-layout-select`        | `{name}` for selected frame |

## `package`

The `spa` theme marks the selected application tab with a three-pixel top inset and semibold
text. This distinguishes outer layout navigation from a nested Perspective workspace's tabs.
The marker follows the tab's text color in light and dark modes. Dragging a nested Perspective
tab stays within that workspace; this styling does not enable cross-workspace moves.

`spaday_regular_layout.package` is named `regular-layout`. It serves the Lorax theme followed by the
self-contained browser registration bundle. Its catalog contains `SpadayRegularLayout` and
`RegularLayoutFrame`, including their property, event, and slot schemas.

## Place and size panels

`await layout.ensurePanel(name, {beside, side, stackBelow})` inserts an absent frame
beside the named panel's tab stack and selects it. `side` is `left`, `right`
(default), `top`, or `bottom`. Below `stackBelow` pixels of **layout width**, initial
placement switches to `bottom`. Calls for an existing panel select it without
moving it or resetting its split sizes. Resizing the window does not move existing
panels. Calls are serialized, including concurrent requests for the same panel.
Both frames must already be children of the layout; `beside` must be laid out.

```python
from spaday import Invoke, by_id, element
from spaday_regular_layout import RegularLayoutFrame

editor = RegularLayoutFrame(
    name="editor", min_width="26rem", preferred_width="32rem", max_width="40rem"
)
open_editor = element("button").text("Open editor").on(
    "click",
    Invoke(by_id("layout"), "ensurePanel", "editor",
           {"beside": "workspace", "side": "right", "stackBelow": 800}),
)
```

Frames accept `min_width`, `preferred_width`, `max_width` and equivalent height
properties (HTML attributes use hyphens). Values support `px`, `rem`, `em`, and
percentages of the layout. Unsupported units are ignored. Preferred sizes apply
when `ensurePanel` inserts a frame; saved layouts retain their proportions within
min/max bounds. The selected frame determines a tab stack's bounds. Constraints
apply on restore, after divider release, when bounds change, and on host resize.
If bounds cannot fit the container, available space takes precedence: minima or
maxima are scaled proportionally so panels fill the container without overlap.
