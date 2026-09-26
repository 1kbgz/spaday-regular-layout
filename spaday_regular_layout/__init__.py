import json
from pathlib import Path

from spaday import ComponentPackage, Token

from .components import RegularLayoutFrame, SpadayRegularLayout

__version__ = "0.2.7"

# the exact version of each JS library the package serves, written by its JS build
_VERSIONS = Path(__file__).parent / "extension" / "versions.json"

package = ComponentPackage(
    name="regular-layout",
    assets_dir=Path(__file__).parent / "extension",
    assets=(("css", "css/lorax.css"), ("css", "css/spa.css"), ("js", "cdn/index.js")),
    components=(SpadayRegularLayout, RegularLayoutFrame),
    provides=json.loads(_VERSIONS.read_text(encoding="utf-8")) if _VERSIONS.exists() else {},
)

RegularLayout = SpadayRegularLayout

#: ``css()`` kwarg → (CSS custom property, what it controls). Applies to layouts wearing the ``spa`` theme
#: (``classes("spa")``); each token defaults to the shell token it belongs to, so re-theming the
#: shell carries the panel chrome with it. The ``--spa-rl-*`` spelling still works as an alias.
TOKENS = {
    "spa_regular_layout_surface": Token("--spa-regular-layout-surface", "panel / frame background", fallback="--spa-surface"),
    "spa_regular_layout_surface_2": Token("--spa-regular-layout-surface-2", "titlebar / tab-strip background", fallback="--spa-surface-2"),
    "spa_regular_layout_border": Token("--spa-regular-layout-border", "panel and tab borders", fallback="--spa-border"),
    "spa_regular_layout_muted": Token("--spa-regular-layout-muted", "inactive tab / titlebar text", fallback="--spa-muted"),
    "spa_regular_layout_shadow": Token("--spa-regular-layout-shadow", "panel drop shadow color"),
}

__all__ = ["TOKENS", "RegularLayout", "RegularLayoutFrame", "package"]
