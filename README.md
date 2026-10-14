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

O pre-commit (Husky + lint-staged) roda oxlint e Prettier nos arquivos alterados. O CI
(`.github/workflows/ci.yml`) roda a validação completa em todo PR para `dev` e `master`.

## Tokens visuais

As cores, fontes e brilhos neon são tokens do Tailwind, definidos no `@theme` de
`src/index.css`: `text-char-x`, `bg-danger`, `text-coin`, `bg-primary`, `bg-bg-panel`,
`font-display`, `shadow-glow shadow-char-o/50`... O variant `short:` vale para o celular
deitado (altura até 430px) e `px-safe` respeita o notch nas laterais. Componentes base em
`src/components/ui` (Button, Modal, Toaster/`showToast`, Banner) e moldura de tela em
`src/components/layout/LandscapeShell`. Tudo isso aparece em `/vitrine`.

## Personagens

Os 6 personagens no Estilo A (letreiro neon) ficam em `src/features/characters`:

```tsx
<Character id="ESTRELA" />                                  // versão grande, animada
<Character id="X" variant="avatar" className="size-10" />   // avatar no círculo
<Character id="O" variant="piece" className="size-8" />     // peça do tabuleiro
```

A cor vem do `CHARACTER_INFO`; o tamanho, do `className`. Só a versão grande anima por
padrão (`animated` muda isso) e tudo para com `prefers-reduced-motion`. Use `decorative`
quando o nome do personagem já aparece ao lado. Cada desenho fica em `designs/<personagem>.tsx`.

O tabuleiro fica em `src/features/board`. O `<Board>` recebe as casas do servidor, os
personagens de cada lado, a linha vencedora e a mira, e só emite a intenção
(`onCellSelect(índice)`). Ele ocupa o maior quadrado que cabe no pai, que precisa ter altura
definida. Cada casa é um `<Cell>`; a peça congelada usa o token `ice`.

## Timer

O tempo vem sempre do servidor: o front só desenha. O `<TimerBar deadline={{ startedAt,
durationSeconds }} />` (em `src/components/ui`) serve para turno, Morte Súbita, Preparação,
sorteio e revanche, e não tem callback de "acabou": timeout e W.O. são do servidor. A diferença
de relógio do aparelho é corrigida pelo `clockStore`; o cliente STOMP deve chamar
`syncWithServer(serverTime)` a cada mensagem. A conta fica em `src/lib/timer.ts`.

## Servidor simulado

Até o cliente STOMP real (FE-18), a sala roda contra um servidor simulado no próprio front, com
um oponente automático. Ele já vem ligado (`VITE_USE_MOCK_SERVER=false` desliga).

- **Telas:** usam `joinRoom(código)`, `sendCommand(intenção)` e `leaveRoom()` de
  `src/sockets/gameClient.ts`, e leem o estado das stores. O estado só muda com a resposta do
  servidor.
- **Cenários:** `?cenario=` na URL (ou `VITE_MOCK_SCENARIO`):

  | Cenário           | O que acontece                                                   |
  | ----------------- | ---------------------------------------------------------------- |
  | `normal`          | partida inteira contra o bot (padrão)                            |
  | `vitoria`         | rounds automáticos: você vence por 2×0                           |
  | `empate-absoluto` | rounds automáticos 1×1 e empate na Morte Súbita (+20 para cada)  |
  | `morte-subita`    | 1×1 automático; o round 3 é seu, com 5s por turno                |
  | `wo`              | o bot não joga e perde por W.O. (para ver o seu W.O., não jogue) |

- **Para testar:** abra `/vitrine?cenario=vitoria` (ou outro): a seção "Partida simulada" já
  começa a partida.
- **Criar e entrar em sala (Hub):** `createRoom()` e `joinRoomByCode(código)` de
  `src/api/rooms.ts`. No simulado, criar só sorteia o código e entrar sempre funciona; no real,
  os erros já vêm prontos para a tela ("Sala 4821 não encontrada", sala cheia, partida começada).

### Back de verdade (FE-18)

O cliente STOMP real (`src/sockets/stompConnection.ts`) já está pronto. Para usá-lo:

```bash
VITE_USE_MOCK_SERVER=false
VITE_WEBSOCKET_URL=http://localhost:8080   # vira ws://localhost:8080/ws
```

Ele conecta com o token no `CONNECT`, assina a sala e a fila privada, reconecta sozinho
("Reconectando…" na tela) e pede o estado completo de novo ao voltar. Os destinos ficam em
`src/sockets/destinations.ts` e a tradução das mensagens em `src/sockets/envelope.ts`: ajustes do
contrato com o back (FE-17) mudam só esses arquivos.

## Rotas

Tabela em `src/routes/routes.tsx` e caminhos em `src/routes/paths.ts` (detalhes no
[ARCHITECTURE.md §2](docs/ARCHITECTURE.md)). Cada rota ainda é uma página vazia que diz qual
card a preenche. Enquanto a tela de Acesso (FE-25) não existe, o botão **Entrar (simulado)** em
`/entrar` cria uma sessão falsa para navegar pelo Hub e pela sala.

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
