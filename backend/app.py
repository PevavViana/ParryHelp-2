import os
import secrets

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import inspect, text

from models import Usuario, db
from controllers import (
    usuario_controller_bp,
    avaliacao_controller_bp,
    produto_controller_bp,
    categoria_controller_bp,
    tutoria_controller_bp,
)

def create_app():
    load_dotenv()

    instance_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance")
    app = Flask(__name__, instance_path=instance_path)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    CORS(app)

    banco_padrao = "sqlite:///" + os.path.join(instance_path, "parryhelp.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL") or banco_padrao
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    app.register_blueprint(usuario_controller_bp)
    app.register_blueprint(avaliacao_controller_bp)
    app.register_blueprint(produto_controller_bp)
    app.register_blueprint(categoria_controller_bp)
    app.register_blueprint(tutoria_controller_bp)

    @app.get("/")
    def home():
        return jsonify({
            "mensagem": "API Flask + SQLAlchemy funcionando.",
            "rotas": {
                "usuarios": "GET/POST /usuarios, GET/PUT/DELETE /usuarios/<id>",
                "login": "POST /usuarios/login",
                "avaliacoes": "GET /avaliacoes, GET/PUT/DELETE /avaliacoes/<id>",
                "criar_avaliacao": "POST /usuarios/<usuario_id>/avaliacoes",
                "produtos": "GET/POST /produtos, GET/PUT/DELETE /produtos/<id>",
                "produtos_mais_avaliados": "GET /produtos/mais-avaliados",
                "produtos_por_categoria": "GET /categorias/<id>/produtos",
                "categorias": "GET/POST /categorias, GET/PUT/DELETE /categorias/<id>",
                "adicionar_produto_categoria": "POST /categorias/<id>/produtos",
                "mover_produto_categoria": "DELETE /categorias/<id>/produtos",
                "tutoria": "POST /api/tutoria",
            }
        })

    with app.app_context():
        db.create_all()
        if "criado_por_id" not in {coluna["name"] for coluna in inspect(db.engine).get_columns("produtos")}:
            with db.engine.begin() as conexao:
                conexao.execute(text("ALTER TABLE produtos ADD COLUMN criado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL"))
        Usuario.migrar_senhas_legadas()

    return app

app = create_app()

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "True") == "True"
    app.run(debug=debug, host="0.0.0.0", port=5000)
