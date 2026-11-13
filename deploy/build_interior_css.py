"""Flatten the interior styles in their original cascade order; home stays intact."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"
modules = re.findall(r'@import url\("([^"]+)"\);', (CSS / "site.css").read_text())
parts = [(CSS / "interior-fonts.css").read_text()]
for name in [*modules, "catalog-create-product.css", "interior.css"]:
    source = (CSS / name).read_text()
    source = re.sub(r'@import\s+url\([^)]*\)\s*;', '', source)
    parts.append(f"/* {name} */\n{source}")
(CSS / "interior-bundle.css").write_text("\n".join(parts))
