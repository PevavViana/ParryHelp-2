"""Build a source-only upload, excluding local secrets and user data."""

from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
output = ROOT / "dist" / "parryhelp-pythonanywhere.zip"
output.parent.mkdir(exist_ok=True)

with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for directory in ("backend", "frontend", "deploy"):
        for path in sorted((ROOT / directory).rglob("*")):
            if not path.is_file() or path.is_symlink():
                continue
            relative = path.relative_to(ROOT)
            if any(part.startswith(".") or part in {"instance", "__pycache__"} for part in relative.parts):
                continue
            if path.suffix in {".pyc", ".pyo", ".zip"} or path.name == "pythonanywhere_wsgi.txt":
                continue
            archive.write(path, Path("parryhelp") / relative)
    archive.write(ROOT / "README.md", "parryhelp/README.md")

print(output)
