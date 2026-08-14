# How to persist user layout changes

This guide shows how to send a resized or rearranged layout back through a spaday wire.

Attach a `SendPatch` action to `regular-layout-update`. The event detail is the complete saved layout:

```python
from spaday import SendPatch, event_value
from spaday_regular_layout import RegularLayout

workspace = (
    RegularLayout(layout=initial_layout)
    .child(*frames)
    .on(
        "regular-layout-update",
        SendPatch("workspace", "layout", event_value()),
    )
)
```

Bind the same prop to the mirrored field so server-side updates restore it:

```python
workspace.bind("layout", "workspace.layout")
```

If the store is namespaced differently, use that field path in the binding. Keep frame `name` values
stable across snapshots; each tab node refers to those names.

Select the package when serving:

```python
app = serve(workspace, packages=["regular-layout"], wire=wire)
```

Refer to the [API reference](reference.md) for layout node shapes and event names.
