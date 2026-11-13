"""Production entry point: the frontend and API share one origin."""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from flask import send_from_directory

BACKEND = Path(__file__).resolve().parent
FRONTEND = BACKEND.parent / "frontend"
load_dotenv(BACKEND / ".env")
if not os.environ.get("SECRET_KEY"):
    # A fresh deployment also works without manually entering a session secret.
    # Mount backend/instance on persistent storage to retain it across deploys.
    instance = BACKEND / "instance"
    instance.mkdir(parents=True, exist_ok=True)
    secret_file = instance / ".secret_key"
    try:
        descriptor = os.open(secret_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(descriptor, "w") as file:
            file.write(secrets.token_hex(48))
    os.environ["SECRET_KEY"] = secret_file.read_text().strip()
    if not os.environ["SECRET_KEY"]:
        raise RuntimeError("A chave de sessão persistida está vazia; configure SECRET_KEY.")

from app import app as application

application.config.update(DEBUG=False, TESTING=False)


def home():
    return send_from_directory(FRONTEND, "index.html")


# Replace the API's local diagnostic root only in this production entry point.
application.view_functions["home"] = home

for page in FRONTEND.glob("*.html"):
    application.add_url_rule(
        "/" + page.name,
        endpoint="frontend_" + page.stem,
        view_func=lambda filename=page.name: send_from_directory(FRONTEND, filename),
    )


def asset(directory, filename):
    return send_from_directory(FRONTEND / directory, filename)


for directory in ("css", "js", "assets", "legal"):
    application.add_url_rule(
        f"/{directory}/<path:filename>",
        endpoint="frontend_" + directory,
        defaults={"directory": directory},
        view_func=asset,
    )
