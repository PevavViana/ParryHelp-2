import os
import random
import time

import requests


class GeminiError(RuntimeError):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


class GeminiService:
    URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
    MAX_ATTEMPTS = 3
    RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}
    MAX_RETRY_DELAY = 8

    @classmethod
    def _retry_delay(cls, response, attempt):
        retry_after = response.headers.get("Retry-After") if response is not None else None
        if retry_after is not None:
            try:
                delay = float(retry_after)
                # Long quota cooldowns should not hold a web request open.
                if delay > cls.MAX_RETRY_DELAY:
                    return None
                if 0 <= delay <= cls.MAX_RETRY_DELAY:
                    return delay
            except (TypeError, ValueError):
                pass
        return min(2 ** attempt + random.uniform(0, 0.25), cls.MAX_RETRY_DELAY)

    @staticmethod
    def _http_error(response):
        code = response.status_code
        try:
            data = response.json()
        except ValueError:
            data = {}
        error = data.get("error", {}) if isinstance(data, dict) else {}
        details = error.get("details", []) if isinstance(error, dict) else []
        reasons = {item.get("reason") for item in details if isinstance(item, dict) and isinstance(item.get("reason"), str)} if isinstance(details, list) else set()
        # Never expose raw provider errors: they may contain credentials or URLs.
        if "API_KEY_INVALID" in reasons or code == 401:
            return GeminiError("A chave da API do Gemini é inválida. Confira GEMINI_API_KEY no backend.")
        if code == 403:
            return GeminiError("O Gemini negou acesso ao projeto. Confira a chave, as permissões e a situação da conta no Google AI Studio.")
        if code == 404:
            return GeminiError("O modelo configurado no Gemini não está disponível. Confira GEMINI_MODEL no backend.")
        if code == 429:
            return GeminiError("O limite de uso do Gemini foi atingido. Aguarde e confira a cota do projeto no Google AI Studio.", 429)
        if code == 503:
            return GeminiError("O Gemini está temporariamente sobrecarregado. Tente novamente em instantes.", 503)
        if code in (408, 504):
            return GeminiError("O Gemini demorou demais para responder. Tente novamente em instantes.", 504)
        if code >= 500:
            return GeminiError("O Gemini está temporariamente indisponível. Tente novamente em instantes.", 503)
        return GeminiError("O Gemini recusou a solicitação. Confira a configuração do modelo e da API no backend.")

    @staticmethod
    def _text_parts(parts):
        if not isinstance(parts, list):
            return ""
        return "\n".join(
            part["text"].strip()
            for part in parts
            if isinstance(part, dict) and part.get("type") == "text"
            and isinstance(part.get("text"), str) and part["text"].strip()
        )

    @staticmethod
    def _extract_text(data):
        if not isinstance(data, dict):
            raise GeminiError("O Gemini retornou uma resposta inválida. Tente novamente.")
        if data.get("status") is not None and data["status"] != "completed":
            raise GeminiError("O Gemini não concluiu o resumo. Tente novamente.")
        text = data.get("output_text")
        if isinstance(text, str) and text.strip():
            return text.strip()
        steps = data.get("steps", [])
        for step in reversed(steps if isinstance(steps, list) else []):
            if not isinstance(step, dict) or step.get("type") != "model_output":
                continue
            text = GeminiService._text_parts(step.get("content", []))
            if text:
                return text
        # Earlier Interactions versions returned text in an outputs list.
        text = GeminiService._text_parts(data.get("outputs", []))
        if text:
            return text
        raise GeminiError("O Gemini não retornou texto para o resumo. Tente novamente.")

    def gerar_tutoria(self, prompt):
        key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not key:
            raise GeminiError("GEMINI_API_KEY não configurada no backend.")
        headers = {"Content-Type": "application/json", "x-goog-api-key": key}
        body = {"model": (os.getenv("GEMINI_MODEL") or "").strip() or "gemini-3.6-flash", "input": prompt}
        for attempt in range(self.MAX_ATTEMPTS):
            response = None
            try:
                response = requests.post(self.URL, headers=headers, json=body, timeout=(5, 25))
            except requests.Timeout:
                failure = GeminiError("O Gemini demorou demais para responder. Tente novamente em instantes.", 504)
            except requests.ConnectionError:
                failure = GeminiError("Não foi possível conectar ao Gemini. Confira a conexão do servidor.")
            except requests.RequestException:
                raise GeminiError("Não foi possível acessar o Gemini. Confira a conexão do servidor.") from None
            else:
                if response.ok:
                    try:
                        data = response.json()
                    except ValueError:
                        raise GeminiError("O Gemini retornou uma resposta inválida. Tente novamente.") from None
                    return self._extract_text(data)
                failure = self._http_error(response)
                if response.status_code not in self.RETRYABLE_STATUS:
                    raise failure
            if attempt == self.MAX_ATTEMPTS - 1:
                raise failure from None
            delay = self._retry_delay(response, attempt)
            if delay is None:
                raise failure
            time.sleep(delay)
