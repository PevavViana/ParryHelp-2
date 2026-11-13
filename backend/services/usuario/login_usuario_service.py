from models import Usuario

class LoginUsuarioService:
    def executar(self, dados):
        if not isinstance(dados, dict):
            raise ValueError("Usuario/Senha Invalida")
        email = dados.get("email")
        senha = dados.get("senha")

        usuario = Usuario.buscar_por_email(email)

        if usuario is None or not usuario.verificar_senha(senha):
            raise ValueError("Usuario/Senha Invalida")

        return usuario.to_dict()
