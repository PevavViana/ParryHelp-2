"""Build blocking stylesheets without nested requests; preserve page designs."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"
modules = [
    "foundation.css", "shared-responsive.css", "themes-and-shared.css",
    "page-styles.css", "page-refinements.css", "auth-and-terms.css",
    "page-layout-and-management.css", "home-landing.css", "navigation-stability.css",
]
parts = [(CSS / "interior-fonts.css").read_text()]
for name in modules:
    source = (CSS / name).read_text()
    source = re.sub(r'@import\s+url\([^)]*\)\s*;', '', source)
    parts.append(f"/* {name} */\n{source}")
(CSS / "site.css").write_text("\n".join(parts))
for name in ["catalog-create-product.css", "interior.css"]:
    parts.append(f"/* {name} */\n{(CSS / name).read_text()}")
(CSS / "interior-bundle.css").write_text("\n".join(parts))
