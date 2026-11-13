"""Run after extracting the deployment ZIP on PythonAnywhere."""

from pathlib import Path
import os
import secrets

ROOT = Path(__file__).resolve().parent.parent
environment = ROOT / "backend" / ".env"
if not environment.exists():
    descriptor = os.open(environment, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as file:
        file.write(
            "SECRET_KEY=" + secrets.token_hex(48) + "\n"
            "FLASK_DEBUG=False\n"
            "GEMINI_API_KEY=\n"
            "GEMINI_MODEL=gemini-3.6-flash\n"
        )

(ROOT / "backend" / "instance").mkdir(exist_ok=True)
wsgi = ROOT / "deploy" / "pythonanywhere_wsgi.txt"
wsgi.write_text(
    "import sys\n"
    f"sys.path.insert(0, {str(ROOT / 'backend')!r})\n"
    "from wsgi import application\n"
)
print("Preparado. Configuração WSGI disponível em:", wsgi)
print("Configure o virtualenv no painel Web e copie esse arquivo para o WSGI do site.")
