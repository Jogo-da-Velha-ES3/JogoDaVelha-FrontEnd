# Jogo da Velha Front-end

Front-end do jogo multiplayer Jogo do Velho, desenvolvido com React, TypeScript e Vite para o projeto acadêmico da Fatec-SP.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Zustand
- Socket.IO Client
- React Router
- Howler.js
- Vitest (testes unitários) + oxlint + Prettier

## Desenvolvimento

Requer a versão do Node definida em `.nvmrc` (`nvm use`).

```bash
npm install
cp .env.example .env
npm run dev
```

## Validação

```bash
npm run lint          # oxlint, falha com qualquer warning
npm run format:check  # Prettier
npm test              # Vitest (src/**/*.test.ts[x])
npm run build
```

O pre-commit (Husky + lint-staged) roda oxlint e Prettier nos arquivos alterados. O CI
(`.github/workflows/ci.yml`) roda a validação completa em todo PR para `dev` e `master`.

## Fluxo de branches

`feat/`, `fix/`, `refactor/`, `docs/` ou `chore/` → PR para `dev` (1 aprovação) → `master`.
Detalhes em [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Deploy (Vercel)

| Ambiente    | Branch   | URL                                         |
| ----------- | -------- | ------------------------------------------- |
| Produção    | `master` | https://jogodavelha-frontend.vercel.app     |
| Homologação | `dev`    | https://jogodavelha-frontend-dev.vercel.app |

Todo PR também recebe uma URL de preview própria, comentada pela Vercel no próprio PR.

A documentação de arquitetura, convenções e backlog está em [docs/](docs/).
