import asyncio

import httpx
import pytest

from spaday_regular_layout import example


async def request(method: str, path: str, **kwargs):
    transport = httpx.ASGITransport(app=example.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://example") as client:
        return await client.request(method, path, **kwargs)


def test_example_serves_layout_and_synchronizes_both_directions(monkeypatch):
    response = asyncio.run(request("GET", "/tree.json"))
    assert response.status_code == 200
    assert "spaday-regular-layout" in response.text

    sleeps = 0

    class StreamComplete(Exception):
        pass

    async def one_tick(_delay):
        nonlocal sleeps
        sleeps += 1
        if sleeps > 1:
            raise StreamComplete

    monkeypatch.setattr(example.asyncio, "sleep", one_tick)
    with pytest.raises(StreamComplete):
        asyncio.run(example.rotate_layout())
    assert example.layout_feed.layout == example.alternate_layout

    browser_layout = {"type": "tab-layout", "tabs": ["workspace"]}
    response = asyncio.run(request("POST", "/api/layout", json=browser_layout))
    assert response.status_code == 200
    assert response.json() == {"saved": True}
    assert example.layout_feed.layout == browser_layout
