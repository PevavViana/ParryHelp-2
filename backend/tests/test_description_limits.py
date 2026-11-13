import unittest

from flask import Flask

from models import Categoria, Usuario, db
from services.avaliacao.atualizar_avaliacao_service import AtualizarAvaliacaoService
from services.avaliacao.criar_avaliacao_service import CriarAvaliacaoService
from services.produto.atualizar_produto_service import AtualizarProdutoService
from services.produto.criar_produto_service import CriarProdutoService


class DescriptionLimitsTest(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.config.update(SQLALCHEMY_DATABASE_URI="sqlite:///:memory:")
        db.init_app(app)
        self.context = app.app_context()
        self.context.push()
        db.create_all()
        category = Categoria(nome="Tecnologia")
        creator = Usuario(nome="Autor", email="autor@example.test", senha="teste", cpf="11111111111")
        reviewer = Usuario(nome="Leitor", email="leitor@example.test", senha="teste", cpf="22222222222")
        db.session.add_all([category, creator, reviewer])
        db.session.commit()
        self.category_id, self.creator_id, self.reviewer_id = category.id, creator.id, reviewer.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def product(self, description="Descrição inicial"):
        return CriarProdutoService().executar(
            {"nome": "Produto", "descricao": description, "categoria_id": self.category_id},
            self.creator_id,
        )

    def review(self, product_id, description="Experiência inicial"):
        return CriarAvaliacaoService().executar(
            self.reviewer_id,
            {"produto_id": product_id, "titulo": "Minha experiência", "descricao": description, "nota": 8},
        )

    def test_product_accepts_220_characters_on_create_and_update(self):
        product = self.product("a" * 220)
        self.assertEqual(product["descricao"], "a" * 220)
        updated = AtualizarProdutoService().executar(product["id"], {"descricao": "b" * 220})
        self.assertEqual(updated["descricao"], "b" * 220)

    def test_product_rejects_excess_and_empty_descriptions(self):
        product = self.product()
        for description in ["a" * 221, "   "]:
            with self.subTest(length=len(description)):
                with self.assertRaises(ValueError):
                    self.product(description)
                with self.assertRaises(ValueError):
                    AtualizarProdutoService().executar(product["id"], {"descricao": description})

    def test_review_accepts_220_characters_on_create_and_update(self):
        review = self.review(self.product()["id"], "a" * 220)
        self.assertEqual(review["descricao"], "a" * 220)
        updated = AtualizarAvaliacaoService().executar(review["id"], {"descricao": "b" * 220})
        self.assertEqual(updated["descricao"], "b" * 220)

    def test_review_rejects_excess_and_empty_descriptions(self):
        product = self.product()
        review = self.review(product["id"])
        for description in ["a" * 221, "   "]:
            with self.subTest(length=len(description)):
                with self.assertRaises(ValueError):
                    self.review(product["id"], description)
                with self.assertRaises(ValueError):
                    AtualizarAvaliacaoService().executar(review["id"], {"descricao": description})


if __name__ == "__main__":
    unittest.main()
