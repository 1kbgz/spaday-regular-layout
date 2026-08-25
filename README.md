<a href="https://github.com/1kbgz/spaday-regular-layout">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/1kbgz/spaday-regular-layout/raw/main/docs/img/logo-dark.png?raw=true">
    <img alt="spaday-regular-layout logo, a picnic blanket and basket inside a browser window" src="https://github.com/1kbgz/spaday-regular-layout/raw/main/docs/img/logo-light.png?raw=true" width="800">
  </picture>
</a>

Serializable, resizable panel layouts for spaday, powered by `regular-layout`.

[![Build Status](https://github.com/1kbgz/spaday-regular-layout/actions/workflows/build.yaml/badge.svg?branch=main&event=push)](https://github.com/1kbgz/spaday-regular-layout/actions/workflows/build.yaml)
[![codecov](https://codecov.io/gh/1kbgz/spaday-regular-layout/branch/main/graph/badge.svg)](https://codecov.io/gh/1kbgz/spaday-regular-layout)
[![License](https://img.shields.io/github/license/1kbgz/spaday-regular-layout)](https://github.com/1kbgz/spaday-regular-layout)
[![PyPI](https://img.shields.io/pypi/v/spaday-regular-layout.svg)](https://pypi.python.org/pypi/spaday-regular-layout)

## Documentation

- [Build a resizable workspace](docs/src/tutorial.md) — guided first layout.
- [Persist user layout changes](docs/src/how-to.md) — task-focused state synchronization.
- [API reference](docs/src/reference.md) — layout nodes, components, and events.
- [Why layouts are serialized](docs/src/explanation.md) — wrapper design and state model.

## Quick example

```python
from spaday import serve
from spaday_regular_layout import RegularLayout, RegularLayoutFrame

layout = {
    "type": "split-layout",
    "orientation": "horizontal",
    "sizes": [0.3, 0.7],
    "children": [
        {"type": "tab-layout", "tabs": ["nav"]},
        {"type": "tab-layout", "tabs": ["main"]},
    ],
}

page = RegularLayout(
    RegularLayoutFrame("Navigation", name="nav"),
    RegularLayoutFrame("Main", name="main"),
    layout=layout,
    style="height: 32rem",
).prop("class", "lorax")
serve(page, packages=["regular-layout"])
```

`layout` is the serializable split/tab tree returned by upstream `save()`. Bind it to application state to restore layouts reactively. Browser changes emit `regular-layout-update`; use a spaday event action to persist `event.detail`.

## Run the local example

```bash
python -m pip install -e ".[examples]"
python -m spaday_regular_layout.example
```

Open `http://127.0.0.1:8013` to resize and rearrange the [complete three-panel example](spaday_regular_layout/example.py). It
receives a new server layout every five seconds and persists browser rearrangements back to Python. It passes
the local package descriptor directly, so it does not install or resolve the integration from GitHub.
