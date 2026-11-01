# CLAUDE.md — Jogo do Velho (front-end)

PWA do Jogo do Velho: jogo da velha 4×4 multiplayer em tempo real, com habilidades, em React +
TypeScript + Vite. Projeto acadêmico (Fatec-SP, ES III). A fonte da verdade das regras é a ERS
MVP 1 — V2, resumida em `docs/PROJECT_CONTEXT.md`.

## Leia antes de qualquer tarefa

@docs/PROJECT_CONTEXT.md
@docs/ARCHITECTURE.md
@docs/CONVENTIONS.md

O resumo do backlog está em `docs/INITIAL_BACKLOG.md`; o detalhe de cada card (FE-XX), com
critérios de aceite, está nas issues do GitHub.

## Comandos

```bash
npm run dev           # servidor de desenvolvimento
npm run lint          # oxlint, falha com qualquer warning
npm run format:check  # Prettier
npm test              # Vitest
npm run build         # tsc + vite build
```

Antes de dar uma tarefa como pronta: `npm run lint`, `npm run format:check`, `npm test` e
`npm run build` sem erros.

## Regras que não podem ser quebradas

- **Servidor autoritativo:** o front envia intenções e só muda o estado quando o servidor
  confirma. Nada de atualização otimista de jogada, habilidade, placar, compra ou Coins.
- **Timer vem do servidor:** calcular o tempo restante a partir do timestamp recebido; o front
  nunca decide timeout ou W.O.
- **Comunicação:** REST (`src/api/`) para conta, perfil, loja e Coins; STOMP (`src/sockets/`)
  para sala e partida. Não usar Socket.IO. Não implementar integração real antes do contrato
  (ARCHITECTURE.md §6) ser validado com o back — até lá, usar mocks.
- **Paisagem:** toda tela precisa funcionar no celular deitado (~330–390px de altura) e no
  desktop, sem overflow horizontal.
- **Vitão atrás da flag:** desde 15/10 o Vitão entra no MVP 1 pelos cards FE-41 a FE-45 (grupo de
  Personalidade). A flag `VITAO_ENABLED` foi ligada em 31/10, com a FE-44, para o time ver o Vitão
  enquanto faz falas, animação e voz; com `false`, ele sai da Arena. O balão nunca cobre o
  tabuleiro.
- **Fora do MVP 1:** cosméticos, habilidades por personagem, login com Google,
  modo convidado. Questionar antes de implementar.
- Regras puras ficam em `src/lib/`, sem React, com testes no Vitest.
- Textos da interface em português do Brasil.
- Citar os identificadores da ERS (ex: `[RF-ARN-03]`) e o card (`FE-XX`) em PRs e commits quando
  fizer sentido.

## Git

- Branch própria a partir da `dev` (`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`). Nunca
  commitar direto na `dev` ou na `master`.
- Commits pequenos, em português, no formato `tipo: descrição` (ex: `feat: cria componente Cell`).
- PR para a `dev` seguindo `.github/pull_request_template.md`.
