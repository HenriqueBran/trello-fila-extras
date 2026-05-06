# Fila de Extras v15 - API Central

Esta versão usa uma API central na Vercel para todos os usuários do mesmo quadro enxergarem a mesma fila.

## Importante
Para persistência real entre contas e deploys, configure um KV/Redis na Vercel/Upstash e adicione estas variáveis de ambiente no projeto da Vercel:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Sem essas variáveis, a API usa memória temporária do servidor. Serve apenas para teste rápido e pode perder dados.

## URLs no Trello

Iframe connector URL:
`https://SUA-URL.vercel.app/index.html`

Manifest URL:
`https://SUA-URL.vercel.app/manifest.json`

## Como usar

1. Suba este projeto na Vercel.
2. Configure as variáveis KV se quiser persistência real.
3. Atualize o Power-Up no Trello.
4. Abra o quadro e clique em Fila de Extras.
5. Cada usuário escolhe seu modo: Coordenador ou Membro.
