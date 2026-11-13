from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from models import Usuario


class AutenticacaoError(ValueError):
    pass


class AutenticacaoService:
    def _assinador(self):
        return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="parryhelp-login")

    def emitir_token(self, usuario_id):
        return self._assinador().dumps({"usuario_id": usuario_id})

    def autenticar(self, authorization):
        esquema, _, token = (authorization or "").partition(" ")
        if esquema.lower() != "bearer" or not token:
            raise AutenticacaoError("Entre na sua conta para continuar.")
        try:
            dados = self._assinador().loads(token, max_age=8 * 60 * 60)
        except (BadSignature, SignatureExpired):
            raise AutenticacaoError("Sua sessão expirou ou é inválida. Entre novamente.") from None
        usuario = Usuario.buscar_por_id(dados["usuario_id"])
        if usuario is None:
            raise AutenticacaoError("Usuário não encontrado. Entre novamente.")
        return usuario
