from . import db
from .base import ModeloBase
from werkzeug.security import check_password_hash, generate_password_hash


class Usuario(ModeloBase):
    __tablename__ = "usuarios"

    nome = db.Column(db.String(40), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)
    cpf = db.Column(db.String(14), unique=True, nullable=False)

    avaliacoes = db.relationship(
        "Avaliacao", back_populates="usuario", cascade="all, delete-orphan"
    )
    termos_aceitos = db.relationship(
        "TermoAceite", back_populates="usuario", cascade="all, delete-orphan"
    )

    def atualizar(self, nome=None, email=None, senha=None, cpf=None):
        if nome is not None:
            self.nome = nome
        if email is not None:
            self.email = email
        if senha is not None:
            self.senha = self.gerar_hash_senha(senha)
        if cpf is not None:
            self.cpf = cpf

        db.session.commit()

    @staticmethod
    def gerar_hash_senha(senha):
        if not isinstance(senha, str) or not 6 <= len(senha) <= 1024:
            raise ValueError("A senha deve ter entre 6 e 1024 caracteres.")
        return generate_password_hash(senha, method="scrypt:32768:8:1")

    def verificar_senha(self, senha):
        return (
            isinstance(senha, str)
            and len(senha) <= 1024
            and check_password_hash(self.senha, senha)
        )

    @classmethod
    def migrar_senhas_legadas(cls):
        alterado = False
        for usuario in cls.listar_todos():
            if not usuario.senha.startswith(("scrypt:", "pbkdf2:")):
                usuario.senha = generate_password_hash(
                    usuario.senha, method="scrypt:32768:8:1"
                )
                alterado = True
        if alterado:
            db.session.commit()

    @staticmethod
    def buscar_por_email(email):
        return Usuario.query.filter_by(email=email).first()

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
        }
