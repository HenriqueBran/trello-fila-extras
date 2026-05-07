# Instalação - Fila de Extras Trello Power-Up

## 1. Subir o projeto

Suba estes arquivos no GitHub e conecte o repositório à Vercel.

Depois do deploy, use no Trello:

```txt
Iframe connector URL:
https://SUA-URL-VERCEL.vercel.app/index.html
```

## 2. Variáveis obrigatórias para uso real

Para manter os dados salvos de forma persistente, configure o KV/Upstash na Vercel e adicione:

```txt
KV_REST_API_URL
KV_REST_API_TOKEN
```

## 3. Coordenadores autorizados

Para bloquear o acesso ao Modo Coordenador, configure na Vercel:

```txt
COORDENADORES_TRELLO
```

Exemplo de valor:

```txt
henriquebrandaodearruda,danilo.operacao,joao.coordenador
```

Regras:

- use o usuário Trello sem `@`;
- se tiver mais de um coordenador, separe por vírgula;
- depois de editar essa variável, faça **Redeploy** na Vercel;
- quem não estiver nessa lista não conseguirá entrar como Coordenador;
- o Modo Membro continua liberado para todos.

## 4. Ativar recursos no Trello

No painel do Power-Up, ative:

```txt
Botões do quadro
Botões do cartão
Mostrar configurações
```

## 5. Teste recomendado

1. Entre com uma conta autorizada e clique em **Modo Coordenador**.
2. Entre com uma conta não autorizada e tente clicar em **Modo Coordenador**.
3. A conta não autorizada deve receber **Acesso negado**.
4. A conta não autorizada ainda deve conseguir entrar como **Modo Membro**.
