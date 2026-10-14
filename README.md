# Jogo da Velha Front-end

Front-end do jogo multiplayer Jogo do Velho, desenvolvido com React, TypeScript e Vite para o projeto acadêmico da Fatec-SP.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Zustand
- STOMP sobre WebSocket (`@stomp/stompjs`)
- React Router
- Howler.js
- Vitest + Testing Library (jsdom) + oxlint + Prettier

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

Os testes rodam no jsdom com `@testing-library/react`; o setup fica em `src/test/setup.ts`
e `src/test/matchMedia.ts` simula a orientação da tela.

## Tokens visuais

As cores, fontes e brilhos neon são tokens do Tailwind, definidos no `@theme` de
`src/index.css`: `text-char-x`, `bg-danger`, `text-coin`, `bg-primary`, `bg-bg-panel`,
`font-display`, `shadow-glow shadow-char-o/50`... O variant `short:` vale para o celular
deitado (altura até 430px) e `px-safe` respeita o notch nas laterais. Componentes base em
`src/components/ui` (Button, Modal, Toaster/`showToast`, Banner) e moldura de tela em
`src/components/layout/LandscapeShell`.

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
