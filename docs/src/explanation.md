# Why layouts are serialized

A resizable workspace has two kinds of state: component content and spatial arrangement. Component
content already lives in spaday's tree. Regular Layout represents arrangement as a separate split/tab
tree that can be saved, transported, and restored.

Keeping the layout serializable means Python never manages drag gestures or element measurements.
Those interactions remain local to the browser. Only the compact result—frame names, nesting,
orientation, and sizes—needs to cross a wire or enter persistent storage.

Frame names connect the two models. A `RegularLayoutFrame` owns the live DOM content, while tab nodes
refer to its stable name. Restoring a different layout moves those live frames instead of asking Python
to rebuild their contents.

An alternative is to encode the full workspace directly in the spaday component tree. That works for a
fixed layout, but every browser resize would become application-tree state. The wrapper instead treats
Regular Layout as an imperative browser subsystem with one serializable boundary: `layout`.
