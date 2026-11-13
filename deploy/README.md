# PythonAnywhere

O pacote serve a página inicial original e a API no mesmo domínio, sem alterar
o HTML da home. O banco SQLite e as imagens ficam em `backend/instance`, no disco
da conta. O ZIP não inclui banco local, imagens enviadas por usuários ou segredos:
uma instalação nova começa com o catálogo vazio. Importar dados existentes deve
ser decidido separadamente.

1. Gere o ZIP local com `python deploy/build_package.py` e envie
   `dist/parryhelp-pythonanywhere.zip` pela aba Files da sua conta.
2. Abra um console Bash no PythonAnywhere e execute:

   ```bash
   unzip -n ~/parryhelp-pythonanywhere.zip -d ~/
   cd ~/parryhelp
   python3.13 -m venv .venv
   .venv/bin/pip install -r backend/requirements.txt
   .venv/bin/python deploy/prepare_pythonanywhere.py
   ```

3. Em **Web → Add a new web app**, escolha **Manual configuration** e Python
   3.13 (a mesma versão do virtualenv). Configure o virtualenv como
   `/home/SEU_USUARIO/parryhelp/.venv`.
4. No arquivo WSGI indicado no painel, substitua o conteúdo pelo arquivo
   `/home/SEU_USUARIO/parryhelp/deploy/pythonanywhere_wsgi.txt` gerado no passo 2.
5. Para habilitar a IA, edite `backend/.env` pelo painel e preencha
   `GEMINI_API_KEY`. Preserve a `SECRET_KEY` gerada. Não publique esse arquivo.
6. Ative **Force HTTPS**, clique em **Reload** e abra o endereço da aba Web.
   Não é necessário cadastrar mapeamentos estáticos: o WSGI já serve esses arquivos.

Teste a home, catálogo, cadastro, login, criação de produto, envio de imagem e
avaliação no endereço público. O sucesso local não confirma a conectividade com
o Gemini no provedor. Renove a aplicação gratuita antes do vencimento exibido
no painel.

Para atualizar, faça backup de `backend/instance` e `backend/.env` primeiro.
Substitua somente os arquivos de código, preservando essas duas localizações,
e use **Reload**. O comando `unzip -n` acima destina-se à primeira instalação,
pois não substitui arquivos existentes.

Configuração baseada na [documentação oficial de Flask no PythonAnywhere](https://help.pythonanywhere.com/pages/Flask/).
