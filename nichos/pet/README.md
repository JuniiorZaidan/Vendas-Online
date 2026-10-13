# Pet Alegria — loja do nicho pet

Projeto separado por nicho, com 34 produtos demonstrativos para cães, gatos, aves, peixes e pequenos pets. Inclui ilustrações específicas, busca, categorias, ordenação, páginas de produtos, carrinho e backend persistente de pedidos e estoque simulado.

## Organização

- `frontend/`: HTML, CSS, JavaScript e gerador de páginas.
- `frontend/assets/produtos.png`: mídia própria gerada para os 34 itens, apresentada em células por CSS.
- `backend/server.mjs`: API Node.js e servidor do frontend.
- `backend/catalog.json`: fonte única do catálogo, preços em centavos e estoque inicial demonstrativo.
- `backend/data/`: banco SQLite local, criado ao iniciar e ignorado pelo Git.
- `tests/`: testes de validação, preços, estoque e persistência do backend.

## Executar frontend e backend

Requer Node.js 24 ou superior. Não há dependências npm de produção.

```sh
cd nichos/pet
npm run check
npm run build
npm test
npm start
```

A aplicação usa a porta 3000 por padrão. `PORT` altera a porta e `DATA_DIR` escolhe o diretório persistente do SQLite. Em desenvolvimento, o endereço é local; ele não é um link público. O banco inicializa apenas os produtos ausentes, sem zerar pedidos ou estoque ao reiniciar. Alterar o arquivo de catálogo depois da primeira inicialização não atualiza registros existentes; mudanças reais precisam de migração.

## API

- `GET /api/health`: estado do serviço e modo demonstrativo.
- `GET /api/products`: catálogo e estoque simulado atual.
- `POST /api/orders`: registra um pedido demonstrativo e reduz o estoque simulado numa transação.

Exemplo de corpo de pedido:

```json
{"items":[{"productId":1,"quantity":2}]}
```

O backend calcula o total a partir dos preços no banco; não confia no preço enviado pelo cliente. Rejeita produtos inexistentes, duplicados, quantidades inválidas e estoque insuficiente. Pedidos não coletam dados pessoais nem cobram pagamentos. Não há painel administrativo público.

## Publicação

Para publicar frontend **e backend**, use hospedagem Node.js 24 com disco persistente, build `npm run build` e inicialização `node backend/server.mjs`, tendo `nichos/pet` como diretório do projeto. Configure HTTPS e um volume persistente para `DATA_DIR`; faça backups do banco. Uma conta de hospedagem e DNS são necessários para um domínio público.

GitHub armazena o projeto; enviar código não publica automaticamente um site. GitHub Pages e uploads estáticos de `frontend/dist/` exibem a vitrine, mas não executam a API. Os arquivos de Vercel e Netlify em `nichos/pet/` são para a vitrine estática; o registro de pedidos exige o servidor Node. Não use armazenamento temporário de funções serverless para este SQLite.

`SITE_URL` opcional deve conter o domínio HTTPS real durante o build para gerar `sitemap.xml`. O build gera 34 páginas HTML com títulos e descrições; indexação depende da publicação e dos buscadores.

## Mídia e catálogo

As ilustrações foram criadas para este projeto. Não são fotografias de produtos comerciais reais nem representam marcas ou embalagens confirmadas. Preços, descrições e estoque são exemplos. O catálogo não pretende cobrir todos os produtos existentes no mercado pet.

## Limites antes de vender

Esta é uma aplicação demonstrativa, com persistência real de dados de simulação. Não processa pagamentos, frete, notas fiscais ou pedidos comerciais. Para produção, é necessário definir fornecedor e catálogo real, integrar gateway com webhooks verificados, logística, autenticação administrativa, proteção contra abuso, monitoramento, backups e políticas da empresa. Chaves e senhas devem ficar nas configurações seguras da hospedagem, nunca no frontend ou no GitHub.

## Verificação

`npm test` exercita o servidor real e SQLite temporário: catálogo, cálculo de preços, entradas inválidas, rollback, duas compras concorrentes, isolamento de arquivos privados e persistência após reiniciar. O navegador Chromium também foi usado para testar frontend, sacola e responsividade.
