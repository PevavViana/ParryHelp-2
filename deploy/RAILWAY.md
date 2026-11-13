# Railway

O Dockerfile da raiz instala o backend e o Gunicorn e serve frontend e API no
mesmo domínio. Ele não inclui banco local, uploads nem arquivos `.env` na imagem.
A instalação nova começa com o catálogo vazio.

1. Envie `Dockerfile`, `.dockerignore`, `backend/wsgi.py` e
   `deploy/requirements-production.txt` para o repositório conectado ao Railway.
2. Em Settings, deixe **Root Directory** na raiz do repositório (`/`). Remova
   comandos personalizados antigos de build e start. O Railway detecta o
   Dockerfile automaticamente.
3. A aplicação gera automaticamente uma chave privada de sessão no diretório
   `backend/instance`. Opcionalmente, em Variables, defina `SECRET_KEY` com um
   valor privado e aleatório, mantido entre deploys. Você pode gerar um com:

   ```bash
   python -c 'import secrets; print(secrets.token_hex(48))'
   ```

   Para IA, adicione também `GEMINI_API_KEY` e, opcionalmente, `GEMINI_MODEL`.
   Não copie essas chaves para o código ou para o GitHub.
4. Adicione um **Volume** ao serviço, montado em `/app/backend/instance`, para
   preservar o SQLite e as imagens enviadas entre deploys. Não defina
   `DATABASE_URL` para usar o SQLite padrão.
5. Execute o deploy. Em Settings → Networking, use **Generate Domain** e, se
   solicitado, informe a mesma porta do processo (8080 caso `PORT` não esteja
   definida). O servidor aceita a porta fornecida pelo Railway via `PORT`.
6. Verifique home, catálogo, cadastro, login, produto, upload e avaliação no
   domínio público. Uma conta em Limited Trial pode restringir chamadas ao Gemini.

O teste gratuito termina ao esgotar o crédito ou o prazo do plano. A existência
do crédito não garante disponibilidade por um período fixo, pois depende do uso.

Referências: [Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[Flask](https://railway.com/guides/flask),
[teste gratuito](https://docs.railway.com/pricing/free-trial).
