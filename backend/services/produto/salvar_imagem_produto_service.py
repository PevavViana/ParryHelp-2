from pathlib import Path
from uuid import uuid4


class ImagemMuitoGrandeError(ValueError):
    pass


class SalvarImagemProdutoService:
    LIMITE = 5 * 1024 * 1024

    def executar(self, arquivo, pasta):
        if arquivo is None or not arquivo.filename:
            raise ValueError("Selecione uma imagem.")
        conteudo = arquivo.read(self.LIMITE + 1)
        if len(conteudo) > self.LIMITE:
            raise ImagemMuitoGrandeError("A imagem deve ter no máximo 5 MB.")
        if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
            extensao = "png"
        elif conteudo.startswith(b"\xff\xd8\xff"):
            extensao = "jpg"
        elif conteudo.startswith((b"GIF87a", b"GIF89a")):
            extensao = "gif"
        elif conteudo.startswith(b"RIFF") and conteudo[8:12] == b"WEBP":
            extensao = "webp"
        else:
            raise ValueError("Selecione uma imagem PNG, JPG, GIF ou WebP.")
        nome = f"{uuid4().hex}.{extensao}"
        pasta = Path(pasta)
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / nome).write_bytes(conteudo)
        return nome
