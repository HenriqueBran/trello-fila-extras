# Power-Ups separados — Fila de Extras

Esta versão separa o acesso em dois Power-Ups diferentes, mas ambos continuam usando o mesmo banco e os mesmos dados por quadro do Trello.

## Power-Up 1 — Coordenador

Use este conector no Power-Up Admin Portal:

https://trello-fila-extras.vercel.app/index-coordenador.html

Função:
- abre direto no Modo Coordenador;
- mantém validação pela variável `COORDENADORES_TRELLO`;
- permite gerenciar fila, gerar extras, cancelar solicitações e consultar histórico completo.

## Power-Up 2 — Membro

Use este conector no Power-Up Admin Portal:

https://trello-fila-extras.vercel.app/index-membro.html

Função:
- abre direto no Modo Membro;
- permite ver fila pública;
- mostra somente extras direcionadas ao usuário Trello logado;
- permite aceitar ou recusar extra;
- permite consultar histórico público.

## Importante

Os dois Power-Ups continuam interligados porque ambos usam a mesma API e a mesma chave de armazenamento baseada no `boardId` do Trello.

Ou seja:
- o coordenador gera a extra no Power-Up Coordenador;
- o membro vê e responde no Power-Up Membro;
- aceite, recusa, redirecionamento, histórico e notificações continuam compartilhados.


## Fila individual no Modo Membro

O Power-Up Membro agora mostra a seção "Minha fila".

Essa seção identifica o usuário Trello logado e procura o vínculo correspondente na fila. Quando encontra, exibe:
- posição individual do membro;
- nome vinculado;
- usuário Trello;
- status se é a pessoa da vez;
- quantidade de pessoas até chegar sua vez;
- aviso quando existe extra disponível para resposta.

Se o usuário ainda não estiver vinculado, o membro deve localizar o próprio nome na fila pública e clicar em "Sou eu".
