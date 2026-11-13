import json
import os
import unittest
from unittest.mock import patch

import requests
from flask import Flask

from controllers.tutoria_controller import tutoria_controller_bp
from services.tutoria.gemini_service import GeminiError, GeminiService


def response(status=200, payload=None, headers=None):
    result = requests.Response()
    result.status_code = status
    result._content = json.dumps(payload if payload is not None else {
        "status": "completed",
        "steps": [{"type": "model_output", "content": [{"type": "text", "text": "Resumo confirmado."}]}],
    }).encode()
    result.headers.update(headers or {})
    return result


class GeminiServiceTest(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {"GEMINI_API_KEY": " dummy-private-key ", "GEMINI_MODEL": " gemini-3.6-flash "})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        for name in ("post", "sleep", "uniform"):
            target = {"post": "requests.post", "sleep": "time.sleep", "uniform": "random.uniform"}[name]
            replacement = patch(f"services.tutoria.gemini_service.{target}")
            setattr(self, name, replacement.start())
            self.addCleanup(replacement.stop)
        self.uniform.return_value = 0
        self.post.return_value = response()

    def test_request_and_rest_text_extraction(self):
        self.assertEqual(GeminiService().gerar_tutoria("Resuma os produtos."), "Resumo confirmado.")
        args, options = self.post.call_args
        self.assertEqual(args[0], GeminiService.URL)
        self.assertEqual(options["headers"]["x-goog-api-key"], "dummy-private-key")
        self.assertEqual(options["json"], {"model": "gemini-3.6-flash", "input": "Resuma os produtos."})
        self.sleep.assert_not_called()

    def test_recovers_from_overload(self):
        self.post.side_effect = [response(503, {"error": {"message": "High demand"}}), response()]
        self.assertEqual(GeminiService().gerar_tutoria("Resumo"), "Resumo confirmado.")
        self.assertEqual(self.post.call_count, 2)
        self.sleep.assert_called_once_with(1)

    def test_retries_are_bounded_and_error_is_specific(self):
        self.post.return_value = response(503, {"error": {"message": "dummy-private-key"}})
        with self.assertRaises(GeminiError) as caught:
            GeminiService().gerar_tutoria("Resumo")
        self.assertEqual(self.post.call_count, 3)
        self.assertEqual([call.args[0] for call in self.sleep.call_args_list], [1, 2])
        self.assertEqual(caught.exception.status_code, 503)
        self.assertIn("sobrecarregado", str(caught.exception))
        self.assertNotIn("dummy-private-key", str(caught.exception))

    def test_respects_short_retry_after(self):
        self.post.side_effect = [response(429, {}, {"Retry-After": "3"}), response()]
        GeminiService().gerar_tutoria("Resumo")
        self.sleep.assert_called_once_with(3)

    def test_does_not_hold_request_through_long_quota_cooldown(self):
        self.post.return_value = response(429, {}, {"Retry-After": "60"})
        with self.assertRaises(GeminiError) as caught:
            GeminiService().gerar_tutoria("Resumo")
        self.assertEqual(caught.exception.status_code, 429)
        self.assertIn("cota", str(caught.exception))
        self.post.assert_called_once()
        self.sleep.assert_not_called()

    def test_configuration_errors_are_not_retried(self):
        for code, expected in [(400, "configuração"), (401, "chave"), (403, "acesso"), (404, "modelo")]:
            with self.subTest(code=code):
                self.post.reset_mock()
                self.post.return_value = response(code, {"error": {"message": "dummy-private-key"}})
                with self.assertRaises(GeminiError) as caught:
                    GeminiService().gerar_tutoria("Resumo")
                self.assertIn(expected, str(caught.exception))
                self.assertNotIn("dummy-private-key", str(caught.exception))
                self.post.assert_called_once()

    def test_invalid_key_reason_from_google(self):
        self.post.return_value = response(400, {"error": {"details": [{"reason": "API_KEY_INVALID"}]}})
        with self.assertRaisesRegex(GeminiError, "chave.*inválida"):
            GeminiService().gerar_tutoria("Resumo")

    def test_timeout_is_bounded(self):
        self.post.side_effect = requests.Timeout()
        with self.assertRaises(GeminiError) as caught:
            GeminiService().gerar_tutoria("Resumo")
        self.assertEqual(caught.exception.status_code, 504)
        self.assertEqual(self.post.call_count, 3)

    def test_recovers_from_connection_error(self):
        self.post.side_effect = [requests.ConnectionError(), response()]
        self.assertEqual(GeminiService().gerar_tutoria("Resumo"), "Resumo confirmado.")

    def test_missing_key_does_not_send_request(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "  "}):
            with self.assertRaisesRegex(GeminiError, "não configurada"):
                GeminiService().gerar_tutoria("Resumo")
        self.post.assert_not_called()

    def test_supported_text_formats(self):
        for payload in [{"output_text": " Texto. "}, {"outputs": [{"type": "text", "text": "Texto."}]}, {
            "steps": [{"type": "thought", "content": [{"type": "text", "text": "Interno"}]},
                      {"type": "model_output", "content": [{"type": "text", "text": "Texto."}]}],
        }]:
            with self.subTest(payload=payload):
                self.post.return_value = response(payload=payload)
                self.assertEqual(GeminiService().gerar_tutoria("Resumo"), "Texto.")

    def test_empty_malformed_and_incomplete_results_are_not_success(self):
        for payload in [[], {}, {"steps": None}, {"status": "incomplete", "output_text": "Parcial"}]:
            with self.subTest(payload=payload):
                self.post.return_value = response(payload=payload)
                with self.assertRaises(GeminiError):
                    GeminiService().gerar_tutoria("Resumo")

    def test_invalid_json_is_safe(self):
        self.post.return_value = response()
        self.post.return_value._content = b"not json"
        with self.assertRaisesRegex(GeminiError, "resposta inválida"):
            GeminiService().gerar_tutoria("Resumo")


class GeminiControllerTest(unittest.TestCase):
    def test_transient_status_is_preserved_by_route(self):
        app = Flask(__name__)
        app.register_blueprint(tutoria_controller_bp)
        with patch("controllers.tutoria_controller.ResumoProdutosEmAltaService.executar", side_effect=GeminiError("Sobrecarregado", 503)):
            result = app.test_client().post("/api/tutoria", json={"tipo": "produtos_em_alta"})
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.get_json(), {"erro": "Sobrecarregado"})
