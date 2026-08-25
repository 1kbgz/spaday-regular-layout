from pathlib import Path

from spaday import ComponentPackage

from .components import RegularLayoutFrame, SpadayRegularLayout

__version__ = "0.2.1"

package = ComponentPackage(
    name="regular-layout",
    assets_dir=Path(__file__).parent / "extension",
    assets=(("css", "css/lorax.css"), ("css", "css/spa.css"), ("js", "cdn/index.js")),
    components=(SpadayRegularLayout, RegularLayoutFrame),
)

RegularLayout = SpadayRegularLayout

__all__ = ["RegularLayout", "RegularLayoutFrame", "package"]
