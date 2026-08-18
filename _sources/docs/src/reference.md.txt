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

`spaday_regular_layout.package` is named `regular-layout`. It serves the Lorax theme followed by the
self-contained browser registration bundle. Its catalog contains `SpadayRegularLayout` and
`RegularLayoutFrame`, including their property, event, and slot schemas.
