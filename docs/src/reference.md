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
