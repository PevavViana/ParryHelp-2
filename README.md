# Parry Help
Projeto de avaliações de produtos de tecnologia, com frontend web e API Flask

## Estrutura
```text
backend/
├── controllers/
├── database/
├── models/
├── repositories/
├── services/
├── app.py
└── requirements.txt

frontend/
├── assets/
├── css/
├── js/
├── index.html
├── catalogo.html
├── produto.html
├── comparar.html
├── conta.html
└── gerenciar.html
```

## Funcionalidades Implementadas
1. Cadastro de usuário
2. Login
3. Consultar diversos dados relevantes da própria conta
4. Atualizar os dados da conta
5. Excluir a conta e suas avaliações
6. Listar produtos do catálogo
7. Consultar os detalhes de um produto
8. Listar categorias
9. Consultar as avaliações de um produto
10. Publicar uma avaliação
11. Editar uma avaliação
12. Excluir uma avaliação
13. Consultar o histórico de avaliações do usuário
14. Cadastrar produto
15. Atualizar produto, incluindo sua categoria
16. Excluir produto e suas avaliações
17. Cadastrar categoria
18. Atualizar categoria
19. Excluir categoria sem produtos associados
20. Gerar resumo por IA das avaliações de um produto

## Arquitetura 
Controllers com classes baseadas em `MethodView`, separadas por recurso. Cada ação chama seu Service mas mantendo az regras de validação que permanecem nos Services, a persistência CRUD fica nas Models e consultas especiais ficam nos Repositories. A integração com o Gemini está encapsulada em um Service.

## Configuração local
As senhas são armazenadas como hashes scrypt com salt aleatório. Ao iniciar a API, senhas antigas em texto puro são convertidas automaticamente, preservando as credenciais existentes. O CPF continua no banco para o cadastro, mas não é retornado pela API. A listagem pública de usuários retorna apenas ID e nome; consultar os dados de uma conta, alterá-la ou excluí-la exige um token válido do próprio titular. O frontend também remove o CPF de sessões antigas salvas no navegador.

O login e o cadastro retornam um token assinado válido por 8 horas. Para cadastrar produtos (`POST /produtos`) ou enviar imagens (`POST /produtos/imagem`), o cliente envia `Authorization: Bearer <token>`. O frontend faz isso automaticamente. A validação e a persistência dos produtos continuam no service e na model existentes; as imagens são validadas e salvas pelo `SalvarImagemProdutoService` em `backend/instance/uploads/produtos/`, e o banco guarda o endereço no campo `imagem_url`.

Opcionalmente, defina uma `SECRET_KEY` aleatória e privada em `backend/.env` para manter os tokens válidos ao reiniciar a API. Sem essa configuração, a API gera uma chave temporária por processo e será necessário entrar novamente após cada reinício. Sessões anteriores a essa alteração também precisam de um novo login. A autenticação adicionada cobre o cadastro de produtos e o upload; as demais rotas mantêm o comportamento anterior.

Para verificar login, proteção do cadastro, validação, persistência e upload, execute `python -m unittest discover -s tests` dentro de `backend`, com as dependências instaladas. Os testes usam SQLite em memória e uma pasta temporária, sem alterar o banco do projeto.

1. Na raiz do projeto, crie um ambiente virtual com uma versão estável do Python e instale as dependências:
   ```powershell
   py -3.14 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
   ```
2. O banco padrão é SQLite, localizado em `backend/instance/parryhelp.db` quando a API é iniciada a partir da pasta `backend`. Para usar esse banco, não defina `DATABASE_URL` em `backend/.env`. O script `backend/database/create_database.sql` é destinado a MySQL/MariaDB e não é necessário para o SQLite padrão.
3. Opcionalmente, configure `GEMINI_API_KEY` em `backend/.env` para habilitar os recursos de IA.
   O modelo pode ser definido em `GEMINI_MODEL` (padrão: `gemini-3.6-flash`). Reinicie o backend após alterar essas variáveis. A integração faz até três tentativas para falhas temporárias, com espera progressiva. Erros de sobrecarga (503), cota (429), acesso negado ou modelo indisponível são apresentados separadamente; um 503 não exige trocar a chave. Consulte a [orientação de diagnóstico do Gemini](https://ai.google.dev/gemini-api/docs/troubleshooting).
4. Em um terminal aberto na raiz do projeto, inicie a API a partir da pasta `backend`:
   ```powershell
   Set-Location .\backend
   ..\.venv\Scripts\python.exe .\app.py
   ```
5. Em outro terminal também aberto na raiz do projeto, sirva o frontend por HTTP local:
   ```powershell
   Set-Location .\frontend
   py -3.14 -m http.server 8000
   ```
6. Acesse `http://127.0.0.1:8000` no navegador. Mantenha os dois servidores em execução enquanto usar o site.
