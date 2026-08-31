# Fila de Extras — estrutura correta para Vercel

Suba estes arquivos na raiz do repositório GitHub.

## Estrutura obrigatória

```txt
api/
  auth-coordenador.js
  store.js
  notificar-extra.js
  fechamento-mensal.js
  teste-fechamento-mensal.js

docs/
fila.html
index.html
index-coordenador.html
index-membro.html
manifest.json
manifest-coordenador.json
manifest-membro.json
style.css
icon.png
icon-64.png
icon-128.png
icon-144.png
icon-256.png
gol-logo.png
smiles-logo.png
package.json
vercel.json
```

## URLs para o Trello

Power-Up Coordenador:

```txt
https://trello-fila-extras.vercel.app/index-coordenador.html
```

Power-Up Membro:

```txt
https://trello-fila-extras.vercel.app/index-membro.html
```

## APIs para testar depois do deploy

```txt
https://trello-fila-extras.vercel.app/api/store?boardId=teste
https://trello-fila-extras.vercel.app/api/auth-coordenador?username=SEU_USUARIO_TRELLO
```

Se as APIs responderem JSON, o Power-Up está publicado corretamente.

## Atualização v108

- CTA **Configurar** reposicionado no topo do modal **Gerar extra**, ao lado do título, para ficar sempre visível.
- O botão abre o modal de configuração de responsáveis, squads e atendimentos.

## Atualização v109

- Modal Configurar Gerar extra reorganizado com campos dinâmicos.
- Responsável solicitante usa campo individual com botão +.
- Squad usa linha com Nome da Squad à esquerda e Nome do atendimento à direita.
- Cada squad permite adicionar vários nomes de atendimento com botão +.
