import asyncio
import logging
from copy import deepcopy
from typing import Any

import transports
import uvicorn
from pydantic import BaseModel
from spaday import CallEndpoint, If, Wire, element, event_value, not_, prop, this
from spaday.backends.starlette import serve
from starlette.responses import JSONResponse
from starlette.routing import Route, WebSocketRoute

from spaday_regular_layout import RegularLayout, RegularLayoutFrame, package

logger = logging.getLogger("uvicorn.error")

initial_layout = {
    "type": "split-layout",
    "orientation": "horizontal",
    "sizes": [0.28, 0.72],
    "children": [
        {"type": "tab-layout", "tabs": ["navigation"], "selected": 0},
        {
            "type": "split-layout",
            "orientation": "vertical",
            "sizes": [0.68, 0.32],
            "children": [
                {"type": "tab-layout", "tabs": ["workspace"], "selected": 0},
                {"type": "tab-layout", "tabs": ["activity"], "selected": 0},
            ],
        },
    ],
}

alternate_layout = {
    "type": "split-layout",
    "orientation": "vertical",
    "sizes": [0.65, 0.35],
    "children": [
        {"type": "tab-layout", "tabs": ["workspace", "navigation"], "selected": 0},
        {"type": "tab-layout", "tabs": ["activity"], "selected": 0},
    ],
}


class LayoutFeed(BaseModel):
    layout: dict[str, Any]


layout_feed = LayoutFeed(layout=initial_layout)
session = transports.Session()
session.host(layout_feed)
server = transports.Server(session)


async def rotate_layout() -> None:
    layouts = (alternate_layout, initial_layout)
    index = 0
    while True:
        await asyncio.sleep(5)
        layout_feed.layout = deepcopy(layouts[index])
        logger.info("Server pushed layout %s", index + 1)
        index = (index + 1) % len(layouts)


async def save_layout(request):
    updated = await request.json()
    if updated != layout_feed.layout:
        layout_feed.layout = updated
        logger.info("Layout received from browser: %s", updated)
    return JSONResponse({"saved": True})


def panel(title: str, copy: str, name: str) -> RegularLayoutFrame:
    return RegularLayoutFrame(
        element("h2").text(title),
        element("p").text(copy),
        name=name,
        style="padding: 1rem; box-sizing: border-box; font-family: system-ui",
    )


page = (
    RegularLayout(
        panel("Navigation", "Drag this panel's tab to rearrange it.", "navigation"),
        panel("Workspace", "Drop another tab here to create a stack.", "workspace"),
        panel("Activity", "Drag either divider to resize nested splits.", "activity"),
        layout=initial_layout,
        style="height: calc(100vh - 2rem); margin: 1rem",
    )
    .prop("class", "spa")  # the shell-aligned theme; upstream's novelty themes (lorax, ...) still apply by class
    .bind("layout", "layout")
    .on(
        "regular-layout-update",
        If(not_(prop(this(), "restoring")), CallEndpoint("POST", "/api/layout", event_value())),
    )
)

app = serve(
    page,
    packages=[package],
    wire=[Wire("/ws", flatten=False)],
    routes=[
        WebSocketRoute("/ws", transports.ws_endpoint(server)),
        Route("/api/layout", save_layout, methods=["POST"]),
    ],
    background=[transports.autosync(server), rotate_layout()],
    title="spaday-regular-layout example",
)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8013)
