# ARCHITECTURE.md — Estrutura técnica do front-end

> Complementa o PROJECT_CONTEXT.md. Este documento é sobre **como** o código é organizado,
> não sobre as regras do jogo.

## 1. Estrutura de pastas

```
src/
├── assets/            # sons (Howler), imagens, ícones, fontes
├── components/        # componentes reutilizáveis e "burros" (sem lógica de negócio)
│   └── ui/             # botões, modais, inputs — puramente visuais
├── features/           # lógica de domínio, isolada por área do jogo
│   ├── board/           # tabuleiro 4x4, células, verificação visual de linha vencedora
│   ├── powers/          # deck de habilidades, sorteio, ativação, efeitos visuais
│   ├── lobby/           # criação/entrada de sala, código alfanumérico de 4 caracteres
│   └── results/         # tela de resultado, coins, revanche
├── sockets/            # conexão socket.io, listeners, emitters, contrato de eventos
├── lib/                # lógica pura, sem UI e sem dependência de React (testável isolado)
│   ├── winCheck.ts       # verificação genérica de vitória (N×N, alinhar K)
│   └── timer.ts          # utilitários de contagem regressiva
├── constants/           # valores fixos do jogo (ver seção 4 abaixo)
├── hooks/              # hooks customizados (useSocket, useTimer, useRoundState...)
├── stores/             # Zustand — estado global (ver seção 3)
├── types/              # interfaces TypeScript compartilhadas (ver seção 5)
├── routes/             # páginas roteáveis (ver seção 2) — substitui "pages/" tradicional
├── styles/             # config Tailwind, temas neon, animações globais reutilizáveis
└── App.tsx
```

**Por que separar `components/` de `features/`:** cada feature (board, powers, lobby, results)
tem seus próprios componentes e hooks isolados. Isso importa especialmente agora que as
tarefas vão ser divididas entre pessoas do time — quem pega "powers" não esbarra no código
de quem pega "board", reduzindo conflito de merge.

**Por que `lib/` existe separado de `features/`:** a verificação de vitória (alinhar 4 em
qualquer direção) é regra do jogo, não componente de tela. Ela precisa ser testável sozinha,
sem precisar renderizar nada — e pode ser validada com testes unitários simples.

## 2. Rotas (React Router)

Decisão da equipe: sala pode ser acessada por **link direto** ou por **código digitado
manualmente**. Isso exige rotas de verdade:

```
/                       → Menu (criar sala / digitar código)
/sala/:codigo           → Entra direto numa sala existente (link direto)
/sala/:codigo/jogo      → Tela de partida em andamento
/sala/:codigo/resultado → Tela de resultado final
```

Se alguém abre `/sala/:codigo` sem estar logado/sem personagem escolhido ainda, o fluxo
redireciona pra seleção de personagem/pick inicial primeiro, e só entra na sala depois —
o código da sala fica retido no estado (`roomStore`) durante esse trajeto.

## 3. Stores (Zustand)

Sugestão inicial — cada um pode crescer conforme a implementação:

- **`roomStore`** — código da sala, status de conexão socket, se é o Jogador 1 ou 2
- **`matchStore`** — placar da MD3 (rounds ganhos por cada jogador), round atual (1/2/3),
  se está em sudden death
- **`boardStore`** — estado do tabuleiro 4×4 atual, de quem é o turno, peças bloqueadas/
  congeladas (efeitos de Escudo/Congelar)
- **`powersStore`** — deck ativo do jogador (até 3 habilidades), quais já foram usadas no
  round atual, opções do sorteio pendente
- **`timerStore`** — contagem regressiva atual (10s ou 5s), se está em W.O.

Cada store deve refletir **o que o servidor confirmou**, não o que o jogador tentou fazer.
O front envia a intenção (`emit`) e só atualiza o estado real quando o servidor responde —
nunca atualiza otimisticamente o resultado de uma jogada ou habilidade sem confirmação,
porque a lógica de vitória e validação é autoritativa no back (ver PROJECT_CONTEXT.md, seção 2).

## 4. Constantes (`constants/`)

Centralizar aqui pra não espalhar "números mágicos" pelo código:

```ts
export const BOARD_SIZE = 4
export const WIN_LENGTH = 4
export const TURN_DURATION_SECONDS = 10
export const SUDDEN_DEATH_TURN_DURATION_SECONDS = 5
export const MAX_INACTIVE_TURNS_BEFORE_WO = 2
export const INITIAL_ABILITIES_TO_PICK = 2
export const MAX_ACTIVE_DECK_SIZE = 3
export const ROUNDS_TO_WIN_MATCH = 2 // melhor de 3
export const ABILITY_BLOCK_DURATION_ROUNDS = 2 // Escudo e Congelar

export const ABILITIES = [
  'bomba',
  'escudo',
  'tornado',
  'buraco_negro',
  'ampulheta',
  'congelar',
] as const
```

## 5. Tipos principais (`types/`)

Rascunho inicial — ajustar assim que o contrato de eventos com o back for validado:

```ts
export type Symbol = 'X' | 'O'

export type AbilityId = 'bomba' | 'escudo' | 'tornado' | 'buraco_negro' | 'ampulheta' | 'congelar'

export interface Ability {
  id: AbilityId
  usedThisRound: boolean
}

export interface Cell {
  row: number
  col: number
  symbol: Symbol | null
  frozen: boolean // efeito Congelar
  blocked: boolean // efeito Escudo
}

export interface RoundState {
  roundNumber: 1 | 2 | 3
  isSuddenDeath: boolean
  board: Cell[][]
  currentTurn: Symbol
  turnDurationSeconds: number
  winner: Symbol | 'draw' | null
}

export interface MatchState {
  roomCode: string
  players: { symbol: Symbol; deck: Ability[] }[]
  score: { X: number; O: number } // rounds ganhos, não pontos
  currentRound: RoundState
  matchWinner: Symbol | null
}
```

## 6. Contrato de eventos WebSocket (rascunho — validar com o back antes de implementar)

Isso existe pra mitigar o risco R02 do TAP (gargalo de integração front×back). **Não
implementar a integração real até isso estar confirmado com o time de backend.**

**Cliente → Servidor:**

- `room:create`
- `room:join` `{ roomCode }`
- `ability:pick_initial` `{ abilityIds: [AbilityId, AbilityId] }`
- `ability:draft_choice` `{ accept: boolean, abilityId: AbilityId }`
- `board:move` `{ row, col }`
- `ability:activate` `{ abilityId, targetCell? }`

**Servidor → Cliente:**

- `room:state` — estado completo da sala (para sincronizar ao entrar/reconectar)
- `round:start` `{ roundNumber, startingPlayer }`
- `board:update` — novo estado do tabuleiro após jogada/habilidade validada
- `turn:timeout` — jogada passada automaticamente por tempo esgotado
- `player:disqualified` — W.O. por 2 turnos consecutivos de inatividade
- `round:end` `{ winner: Symbol | "draw", score }`
- `match:end` `{ winner: Symbol, finalScore }`

Esse contrato é um **ponto de partida pra discussão com o Victor Hugo (back)** — não é
definitivo até ser validado dos dois lados.

## 7. Setup inicial recomendado (primeiro PR, antes de distribuir tarefas)

1. `npm create vite@latest . -- --template react-ts`
2. Instalar dependências: `tailwindcss`, `framer-motion`, `zustand`, `socket.io-client`,
   `howler`, `react-router-dom`
3. Criar a estrutura de pastas acima (vazias, com `.gitkeep` onde precisar)
4. Configurar lint + formatação — **oxlint** (no lugar do ESLint) + Prettier
5. Configurar Husky + lint-staged (pre-commit hook)
6. Criar `.env.example` com `VITE_API_URL` e `VITE_WEBSOCKET_URL`
7. Criar `.nvmrc` com a versão do Node usada
8. Configurar testes unitários com **Vitest** (`npm test`) — base para `lib/winCheck.ts`
9. Conectar o repositório no Vercel (preview deployment por PR)
10. Configurar branch protection (`master` e `dev`) conforme CONVENTIONS.md

Esse setup deve ser **um PR único, mergeado por você mesmo (autorrevisão registrada, já que
é infraestrutura inicial)**, antes de distribuir as primeiras tarefas reais do backlog —
assim ninguém começa tendo que montar a estrutura do zero.
