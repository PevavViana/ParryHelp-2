from models import Usuario

class ListarUsuariosService:
    def executar(self):
        usuarios = Usuario.listar_todos()
        return [{"id": usuario.id, "nome": usuario.nome} for usuario in usuarios]
