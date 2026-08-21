import ast
from pathlib import Path

from spaday import generate
from spaday.bootstrap import bootstrap

from spaday_regular_layout import RegularLayout, RegularLayoutFrame, package


def _generated_ast(source: str) -> str:
    class Normalize(ast.NodeTransformer):
        def visit_ImportFrom(self, node):
            if node.module == "typing":
                node.names = [name for name in node.names if name.name != "Optional"]
            return node

        def visit_Subscript(self, node):
            node = self.generic_visit(node)
            if isinstance(node.value, ast.Name) and node.value.id == "Optional":
                return ast.BinOp(left=node.slice, op=ast.BitOr(), right=ast.Constant(value=None))
            return node

        def visit_Assign(self, node):
            node = self.generic_visit(node)
            if any(isinstance(target, ast.Name) and target.id == "__all__" for target in node.targets):
                node.value.elts.sort(key=ast.unparse)
            return node

    return ast.dump(Normalize().visit(ast.parse(source)))


def test_layout_serializes_state_and_named_frames():
    state = {"type": "tab-layout", "tabs": ["main"]}
    node = RegularLayout(RegularLayoutFrame("Main", name="main"), layout=state).to_node()
    assert node["tag"] == "spaday-regular-layout"
    assert node["slots"]["default"][0]["tag"] == "regular-layout-frame"
    assert node["props"]["layout"]["Map"]["type"] == {"Str": "tab-layout"}


def test_package_drives_bootstrap_assets():
    html = bootstrap(packages=[package])
    assert [schema.tag for schema in package.catalog] == ["spaday-regular-layout", "regular-layout-frame"]
    assert 'href="/components/regular-layout/css/lorax.css"' in html
    assert 'href="/components/regular-layout/css/spa.css"' in html  # the shell-aligned light/dark theme
    assert 'src="/components/regular-layout/cdn/index.js"' in html


def test_generated_components_are_current():
    root = Path(__file__).parent.parent
    fresh = generate(str(root / "components.cem.json"))
    assert _generated_ast(fresh) == _generated_ast((root / "components.py").read_text(encoding="utf-8"))
