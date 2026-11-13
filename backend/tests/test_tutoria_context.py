import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from services.tutoria.resumo_avaliacoes_produto_service import ResumoAvaliacoesProdutoService
from services.tutoria.resumo_produtos_em_alta_service import ResumoProdutosEmAltaService


class TutoriaContextTest(unittest.TestCase):
    def test_catalog_sends_only_purchase_signals(self):
        products = [{"id": 12, "nome": "Notebook", "categoria_nome": "Notebooks", "media_notas": 8.5,
                     "total_avaliacoes": 6, "descricao": "Texto de cadastro"}]
        with patch("services.tutoria.resumo_produtos_em_alta_service.ProdutoRepository.produtos_em_alta", return_value=products), \
             patch("services.tutoria.resumo_produtos_em_alta_service.GeminiService.gerar_tutoria", return_value="Panorama curto.") as generate:
            result = ResumoProdutosEmAltaService().executar()
        data = json.loads(generate.call_args.args[0].split("DADOS_JSON:\n", 1)[1])
        self.assertEqual(data, [{key: products[0][key] for key in ("nome", "categoria_nome", "media_notas", "total_avaliacoes")}])
        self.assertEqual(result["resumo"], "Panorama curto.")

    def test_review_context_excludes_reviewer_identifiers(self):
        reviews = [{"id": 1, "usuario_id": 77, "produto_id": 12, "titulo": "Boa bateria",
                    "descricao": "Durou o dia todo.", "nota": 9, "data": "2026-11-13"}]
        with patch("services.tutoria.resumo_avaliacoes_produto_service.Produto.buscar_por_id", return_value=SimpleNamespace(nome="Celular")), \
             patch("services.tutoria.resumo_avaliacoes_produto_service.AvaliacaoRepository.por_produto", return_value=reviews), \
             patch("services.tutoria.resumo_avaliacoes_produto_service.GeminiService.gerar_tutoria", return_value="Síntese curta.") as generate:
            result = ResumoAvaliacoesProdutoService().executar(12)
        data = json.loads(generate.call_args.args[0].split("DADOS_JSON:\n", 1)[1])
        self.assertEqual(data, {"produto": "Celular", "avaliacoes": [{"titulo": "Boa bateria", "descricao": "Durou o dia todo.", "nota": 9}]})
        self.assertEqual(result["resumo"], "Síntese curta.")

    def test_empty_catalog_does_not_call_ai(self):
        with patch("services.tutoria.resumo_produtos_em_alta_service.ProdutoRepository.produtos_em_alta", return_value=[]), \
             patch("services.tutoria.resumo_produtos_em_alta_service.GeminiService.gerar_tutoria") as generate:
            with self.assertRaises(ValueError):
                ResumoProdutosEmAltaService().executar()
        generate.assert_not_called()

    def test_missing_reviews_do_not_call_ai(self):
        with patch("services.tutoria.resumo_avaliacoes_produto_service.Produto.buscar_por_id", return_value=SimpleNamespace(nome="Celular")), \
             patch("services.tutoria.resumo_avaliacoes_produto_service.AvaliacaoRepository.por_produto", return_value=[]), \
             patch("services.tutoria.resumo_avaliacoes_produto_service.GeminiService.gerar_tutoria") as generate:
            with self.assertRaises(ValueError):
                ResumoAvaliacoesProdutoService().executar(12)
        generate.assert_not_called()
