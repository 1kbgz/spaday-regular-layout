# Build a resizable workspace

In this tutorial, we will serve two named panels in a horizontal layout and resize them in the browser.

## Install the packages

```bash
pip install "spaday[examples]" spaday-regular-layout
```

## Create the workspace

Save this as `layout_app.py`:

```python
import uvicorn

from spaday.backends.starlette import serve
from spaday_regular_layout import RegularLayout, RegularLayoutFrame

layout = {
    "type": "split-layout",
    "orientation": "horizontal",
    "sizes": [0.3, 0.7],
    "children": [
        {"type": "tab-layout", "tabs": ["navigation"]},
        {"type": "tab-layout", "tabs": ["content"]},
    ],
}

page = RegularLayout(
    RegularLayoutFrame("Navigation", name="navigation"),
    RegularLayoutFrame("Content", name="content"),
    layout=layout,
    style="height: 32rem",
).prop("class", "lorax")

app = serve(page, packages=["regular-layout"])

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

Run it:

```bash
python layout_app.py
```

Open `http://127.0.0.1:8000`. You should see **Navigation** and **Content** separated by a draggable
divider. Drag the divider; both frames remain mounted while their sizes change.

You now have a workspace whose structure is ordinary serializable data. Continue with
[Persist user layout changes](how-to.md) to save browser edits.

For a nested workspace with timed server layouts and browser-to-server persistence, run the
[complete layout example](../../spaday_regular_layout/example.py).
