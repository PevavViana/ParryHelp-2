from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory, url_for
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from models import db
from services.usuario.autenticacao_service import AutenticacaoError, AutenticacaoService
from services.produto.salvar_imagem_produto_service import ImagemMuitoGrandeError, SalvarImagemProdutoService
from services import (
    AtualizarProdutoService,
    BuscarProdutoService,
    CriarProdutoService,
    DeletarProdutoService,
    ListarProdutosService,
    ProdutosMaisAvaliadosService,
    ProdutosPorCategoriaService,
)

produto_controller_bp = Blueprint("produto_controller", __name__)


@produto_controller_bp.post("/produtos/imagem")
def enviar_imagem_produto():
    try:
        AutenticacaoService().autenticar(request.headers.get("Authorization"))
        limite = SalvarImagemProdutoService.LIMITE
        if request.content_length and request.content_length > limite + 65536:
            raise ImagemMuitoGrandeError("A imagem deve ter no máximo 5 MB.")
        pasta = Path(current_app.instance_path) / "uploads" / "produtos"
        nome = SalvarImagemProdutoService().executar(request.files.get("imagem"), pasta)
        return jsonify({"imagem_url": url_for("produto_controller.imagem_produto", nome=nome, _external=True)}), 201
    except AutenticacaoError as erro:
        return jsonify({"erro": str(erro)}), 401
    except ImagemMuitoGrandeError as erro:
        return jsonify({"erro": str(erro)}), 413
    except ValueError as erro:
        return jsonify({"erro": str(erro)}), 400
    except OSError:
        return jsonify({"erro": "Não foi possível salvar a imagem."}), 500


@produto_controller_bp.get("/uploads/produtos/<nome>")
def imagem_produto(nome):
    pasta = Path(current_app.instance_path) / "uploads" / "produtos"
    return send_from_directory(pasta, nome)


class ProdutosController(MethodView):
    def get(self):
        produtos = ListarProdutosService().executar()
        return jsonify(produtos), 200

    def post(self):
        try:
            usuario = AutenticacaoService().autenticar(request.headers.get("Authorization"))
            dados = request.get_json() or {}
            produto = CriarProdutoService().executar(dados, usuario.id)
            return jsonify(produto), 201
        except AutenticacaoError as erro:
            return jsonify({"erro": str(erro)}), 401
        except ValueError as erro:
            return jsonify({"erro": str(erro)}), 400
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"erro": "Erro ao salvar produto no banco de dados."}), 500


class ProdutoController(MethodView):
    def get(self, produto_id):
        try:
            produto = BuscarProdutoService().executar(produto_id)
            return jsonify(produto), 200
        except ValueError as erro:
            return jsonify({"erro": str(erro)}), 404

    def put(self, produto_id):
        try:
            dados = request.get_json() or {}
            produto = AtualizarProdutoService().executar(produto_id, dados)
            return jsonify(produto), 200
        except ValueError as erro:
            return jsonify({"erro": str(erro)}), 400
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"erro": "Erro ao atualizar produto no banco de dados."}), 500

    def delete(self, produto_id):
        try:
            DeletarProdutoService().executar(produto_id)
            return "", 204
        except ValueError as erro:
            return jsonify({"erro": str(erro)}), 404
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"erro": "Erro ao deletar produto no banco de dados."}), 500


class ProdutosMaisAvaliadosController(MethodView):
    def get(self):
        limite = request.args.get("limite", default=5, type=int)
        produtos = ProdutosMaisAvaliadosService().executar(limite)
        return jsonify(produtos), 200


class ProdutosPorCategoriaController(MethodView):
    def get(self, categoria_id):
        try:
            produtos = ProdutosPorCategoriaService().executar(categoria_id)
            return jsonify(produtos), 200
        except ValueError as erro:
            return jsonify({"erro": str(erro)}), 404


produto_controller_bp.add_url_rule(
    "/produtos",
    view_func=ProdutosController.as_view("produtos"),
)
produto_controller_bp.add_url_rule(
    "/produtos/<int:produto_id>",
    view_func=ProdutoController.as_view("produto"),
)
produto_controller_bp.add_url_rule(
    "/produtos/mais-avaliados",
    view_func=ProdutosMaisAvaliadosController.as_view("produtos_mais_avaliados"),
)
produto_controller_bp.add_url_rule(
    "/categorias/<int:categoria_id>/produtos",
    view_func=ProdutosPorCategoriaController.as_view("produtos_por_categoria"),
)
