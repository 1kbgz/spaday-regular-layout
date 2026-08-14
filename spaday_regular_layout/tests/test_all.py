import ast
from pathlib import Path

from spaday import generate
from spaday.bootstrap import bootstrap

from spaday_regular_layout import RegularLayout, RegularLayoutFrame, package


def test_layout_serializes_state_and_named_frames():
    state = {"type": "tab-layout", "tabs": ["main"]}
    node = RegularLayout(RegularLayoutFrame("Main", name="main"), layout=state).to_node()
    assert node["tag"] == "spaday-regular-layout"
    assert node["slots"]["default"][0]["tag"] == "regular-layout-frame"
    assert node["props"]["layout"]["Map"]["type"] == {"Str": "tab-layout"}


def test_package_drives_bootstrap_assets():
    html = bootstrap(packages=[package])
    assert 'href="/components/regular-layout/css/lorax.css"' in html
    assert 'src="/components/regular-layout/cdn/index.js"' in html


def test_generated_components_are_current():
    root = Path(__file__).parent.parent
    fresh = generate(str(root / "components.cem.json"))
    assert ast.dump(ast.parse(fresh)) == ast.dump(ast.parse((root / "components.py").read_text(encoding="utf-8")))
