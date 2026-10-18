# ARCHITECTURE.md — Estrutura técnica do front-end

> Complementa o PROJECT_CONTEXT.md. Este documento é sobre **como** o código é organizado,
> não sobre as regras do jogo. Atualizado para a ERS MVP 1 — V2 (08/10/2026).

## 1. Estrutura de pastas

```
src/
├── api/                # cliente REST fino (fetch): auth, perfil, inventário, loja, salas
├── assets/             # sons (Howler), imagens, ícones, fontes
├── components/         # componentes reutilizáveis e "burros" (sem lógica de negócio)
│   ├── ui/              # botões, modais, inputs, toast, banner — puramente visuais
│   └── layout/          # LandscapeShell (safe-area, sem overflow) e o aviso "Gire o celular"
├── features/           # lógica de domínio, isolada por área do jogo
│   ├── auth/            # login, cadastro, sessão
│   ├── hub/             # Hub, menu lateral, Como Jogar, Instalar App
│   ├── profile/         # Perfil: apelido, estatísticas, coleção
│   ├── shop/            # Loja, demonstração de habilidade, compra de Coins
│   ├── lobby/           # criar/entrar em sala, código numérico de 4 dígitos, Sala de Espera
│   ├── draft/           # Preparação: personagem (com bloqueio) e 2 habilidades iniciais
│   ├── board/           # tabuleiro 4×4, células e seus estados
│   ├── powers/          # sorteio da 3ª, deck, mira e efeitos visuais das 10 habilidades
│   ├── match/           # Arena: turnos, timer, placar MD3, Morte Súbita, banners
│   ├── results/         # Resultado, Coins, revanche
│   ├── characters/      # os 6 personagens em SVG (estilo neon) + paleta
│   └── vitao/           # Vitão: arte, animação, falas e reações, atrás da flag VITAO_ENABLED
├── sockets/            # cliente STOMP + servidor simulado (mock/) com a mesma interface
├── lib/                # lógica pura, sem React (testável isolado)
│   ├── winCheck.ts       # verificação de vitória N×N/K, ignorando peças congeladas
│   ├── timer.ts          # cálculo do tempo restante a partir do timestamp do servidor
│   └── match.ts          # regras da MD3: fim da partida, quem começa, match point, Coins
├── constants/          # valores fixos do jogo (seção 4)
├── hooks/              # hooks customizados (useStomp, useServerTimer, useShouldRotateDevice...)
├── stores/             # Zustand — estado global (seção 3)
├── types/              # tipos TypeScript compartilhados (seção 5)
├── routes/             # páginas roteáveis (seção 2)
├── styles/             # tokens neon, temas, animações globais reutilizáveis
└── App.tsx
```

**Por que separar `components/` de `features/`:** cada feature tem seus próprios componentes e
hooks isolados. Quem pega "powers" não esbarra no código de quem pega "board", reduzindo conflito
de merge.

**Por que `lib/` existe:** regras puras (como a verificação de vitória) precisam ser testáveis
sem renderizar nada. Lembrete: a vitória oficial é decidida pelo back `[RNF-ARQ-02]`; o
`winCheck` do front serve para testes, demonstrações (Como Jogar, Loja) e para destacar a linha
vencedora que o servidor confirmou.

## 2. Rotas (React Router)

```
/entrar          → Acesso (login / criar conta / esqueci minha senha). Sem sessão, toda rota
                   redireciona para cá
/redefinir-senha → Nova senha, aberta pelo link enviado por e-mail (`?token=...`)
/                → Hub com a aba Jogar
/loja            → Hub com a aba Loja
/perfil          → Hub com a aba Perfil
/sala/:codigo    → Sala (Sala de Espera, Preparação, Arena e Resultado)
/vitrine         → Vitrine dos tokens e componentes base (consulta do time, sem sessão)
*                → "Página não encontrada" com botão "Voltar ao Hub"
```

- A tabela de rotas fica em `src/routes/routes.tsx` e os caminhos em `src/routes/paths.ts`
  (`PATHS`, `roomPath(code)`): usar as constantes em vez de strings soltas.
- Guardas: `RequireAuth` (sem sessão → `/entrar`) e `RequireGuest` (`/entrar` logado → Hub ou
  sala pendente). Um 401 da API derruba a sessão pelo `authStore` e cai no `/entrar`.
- Link direto: `/sala/4821`. Se não houver sessão, o código fica guardado no `roomStore`
  (`pendingRoomCode`, no `sessionStorage`), o jogador passa pelo Acesso e volta para a sala.
- Código de sala inválido (`/sala/abc`, `/sala/12345`) mostra "Página não encontrada".
- **[A VALIDAR COM O BACK]** Dentro de `/sala/:codigo`, a tela é escolhida pelo campo `phase` que
  o servidor manda no snapshot da sala, em vez de rotas separadas para jogo e resultado. Assim,
  ao recarregar ou reconectar, o jogador cai direto na fase certa:

```ts
switch (room.phase) {
  case 'WAITING':  return <WaitingRoom />
  case 'MATCHED':  return <WaitingRoom matched />   // "MATCH FEITO!" + 3s
  case 'DRAFT':    return <Preparation />
  case 'RESULT':   return <Result />
  default:         return <Arena />                  // VERSUS, ROUND_DRAW, PLAYING, ROUND_END
}
```

Implementado na FE-28 em `src/routes/RoomPage.tsx`: ao abrir `/sala/:codigo`, a página chama
`joinRoom` e, ao sair, `leaveRoom`. Sala de Espera, Preparação e Resultado ainda são placeholders
(`src/routes/room/RoomPlaceholders.tsx`) que a FE-26, a FE-09 e a FE-15 substituem. No W.O., a
Arena segura o banner por `RESULT_HOLD_SECONDS` antes do Resultado; no empate absoluto também
(PROJECT_CONTEXT §9). Os efeitos da Morte Súbita ficam em `SuddenDeathLayer` (FE-13).
A Arena fica em `src/features/match/Arena.tsx`, com as regiões prontas para as faixas e banners
(FE-05), o deck (FE-11) e a mira (FE-27).

Revanche e saída (FE-29) ficam em `src/features/results/`: o `RematchPanel` (Revanche, Aceitar /
Recusar com a barra dos 15s e Voltar ao Lobby) entra na tela de Resultado da FE-15, e o
`useRoomExit` (usado pelo `RoomPage`) avisa e leva ao Hub quem teve o pedido cancelado ou viu a
sala ser encerrada fora do Resultado. A revanche aceita chega como `PHASE_CHANGE` para `DRAFT`.

## 3. Stores (Zustand)

| Store          | Guarda                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| `authStore`    | token, usuário logado, status da sessão                                                                |
| `profileStore` | apelido, personagem favorito, Coins, inventário (personagens e habilidades), stats                     |
| `roomStore`    | código da sala, `phase`, jogadores, meu lado (`mySlot`), conexão, queda do oponente, link pendente     |
| `draftStore`   | personagens reservados por lado, quem está pronto, prazo dos 20s                                       |
| `matchStore`   | round, placar MD3, Morte Súbita, quem começa, estouros (0–3), fim do round, resultado, Coins, revanche |
| `boardStore`   | as 16 casas com efeitos e contadores, linha vencedora, última habilidade resolvida                     |
| `powersStore`  | opções do sorteio, meu deck da rodada, mira em andamento                                               |
| `timerStore`   | de quem é o turno, prazo do turno (timestamp do servidor), duração (10s/5s)                            |
| `clockStore`   | diferença entre o relógio do servidor e o do aparelho (`syncWithServer` a cada msg)                    |
| `toastStore`   | fila de toasts na tela (só interface, não reflete o servidor)                                          |

Regras:

- Cada store reflete **o que o servidor confirmou**, nunca o que o jogador tentou fazer.
- Mensagens do servidor entram por um único ponto, `applyServerEvent` em
  `src/stores/serverEvents.ts`, chamado pelo cliente STOMP ou pelo servidor simulado, e são
  distribuídas para as stores. Componentes não assinam destinos STOMP diretamente.
- As stores de jogo não têm setters: nada muda sem evento. Placar e vencedor vêm prontos do
  servidor (`ROUND_END`, `MATCH_END`); as regras da MD3 em `src/lib/match.ts` servem ao servidor
  simulado e à exibição (ex: "MATCH POINT"), nunca para calcular o estado.
- A mira de habilidade (`powersStore`) é o único estado "local" da Arena: escolher o alvo é
  interface; a resolução vem do servidor.

## 4. Constantes (`constants/`)

Todo valor fixo do jogo fica aqui, nunca espalhado pelo código. A fonte é o próprio código:

| Arquivo                       | O que tem                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/constants/game.ts`       | tabuleiro, tempos (10s/5s/20s/8s/15s), W.O., deck, habilidades e personagens iniciais, Coins, preço das habilidades, `VITAO_ENABLED` |
| `src/constants/abilities.ts`  | as 10 habilidades: nome, tipo, alvo, se pede casa de destino, se o Campo de Força anula, descrição                                   |
| `src/constants/characters.ts` | os 6 personagens: nome, cor oficial e preço                                                                                          |

Os identificadores de habilidade e personagem (`'BOMBA'`, `'CAMPO_DE_FORCA'`, `'TRIANGULO'`...) devem
bater com os enums do back — confirmar na FE-17.

## 5. Tipos principais (`types/`)

| Arquivo                | O que tem                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/types/game.ts`    | `AbilityId`, `CharacterId`, `RoomPhase`, `Cell`, `PlayerState`, `DeckSlot`, `TurnState`, `MatchOutcome`, `RoomSnapshot` |
| `src/types/events.ts`  | `ServerEvent` (eventos do servidor), `ServerEnvelope` e `ClientCommand` (intenções do cliente)                          |
| `src/sockets/types.ts` | `GameConnection`: a interface que o cliente STOMP real e o servidor simulado implementam                                |

Os tipos de eventos são o rascunho do contrato da seção 6 e mudam junto com ele.

## 6. Contrato com o back (rascunho — validar antes de implementar)

Existe para mitigar o risco R02 do TAP. **Não implementar a integração real até isto estar
confirmado com o time de back.** Os nomes abaixo são proposta do front; cadastro e login já foram
implementados no back (revisão de telas, 06/10), então usar as rotas e payloads reais deles.

### REST (`VITE_API_URL`)

| Método | Rota                    | Uso                                                         |
| ------ | ----------------------- | ----------------------------------------------------------- |
| POST   | `/auth/register`        | criar conta (usuário, e-mail, senha) — já existe no back    |
| POST   | `/auth/login`           | login com e-mail **ou** usuário + senha → token — já existe |
| POST   | `/auth/forgot-password` | envia o link de recuperação para o e-mail                   |
| POST   | `/auth/reset-password`  | troca a senha a partir do token do link                     |
| GET    | `/me`                   | perfil, Coins, inventário, estatísticas, favorito           |
| PATCH  | `/me`                   | trocar apelido e personagem favorito                        |
| GET    | `/shop/catalog`         | itens, preços e pacotes de Coins                            |
| POST   | `/shop/purchase`        | comprar personagem ou habilidade `[RF-LOJ-02]`              |
| POST   | `/shop/coins`           | compra simbólica de Coins `[RN-LOJ-04]`                     |
| POST   | `/rooms`                | criar sala → código de 4 dígitos `[RF-HUB-04]`              |
| POST   | `/rooms/{code}/join`    | entrar na sala; erros: não existe, lotada, já começou       |

### STOMP (`VITE_WEBSOCKET_URL`)

- `CONNECT` com o token no header `Authorization`.
- **Assinaturas:** `/topic/rooms/{code}` (eventos públicos da sala), `/user/queue/room` (eventos
  privados: opções do meu sorteio, meu deck) e `/user/queue/errors` (erros das minhas ações, já
  existente no back).
- **Envio (cliente → servidor), prefixo `/app/rooms/{code}`:**
  - `/draft/character` `{ character }`
  - `/draft/abilities` `{ abilities: [AbilityId, AbilityId] }`
  - `/draw/pick` `{ ability }`
  - `/move` `{ cell }`
  - `/ability` `{ ability, targetCell?, destinationCell? }`
  - `/rematch/request`, `/rematch/respond` `{ accept }`
  - `/leave`
- **Eventos (servidor → cliente)**, num envelope `{ type, payload, serverTime }`:
  - `ROOM_SNAPSHOT` — estado completo (ao entrar e ao reconectar): fase, jogadores, round, placar,
    tabuleiro, turno, meu deck e resultado; e, pedidos na FE-20, o prazo e o "pronto" da
    Preparação, as minhas 3 cartas do sorteio, os Coins e o pedido de revanche em aberto
  - `PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED` (`{ slot }`, sem
    prazo: quem cai segue a regra dos 3 estouros)
  - `PHASE_CHANGE` — nova `phase` da sala (proposto na FE-12)
  - `DRAFT_UPDATE` — personagens bloqueados e status de cada jogador
  - `DRAW_OPTIONS` (privado) — 3 habilidades e prazo de 8s
  - `ROUND_START` — round, quem começa, Morte Súbita
  - `DECK_UPDATE` (privado) — meu deck, no início do round e depois de cada habilidade (proposto
    na FE-12: fora do `ROUND_START`, que é público)
  - `TURN_START` — jogador, timestamp de início, duração e os estouros seguidos de cada lado
    (valor oficial; proposto na FE-12 para o front não deduzir quando zeram)
  - `BOARD_UPDATE` — casas e efeitos depois de uma ação
  - `ABILITY_RESOLVED` — quem usou, qual, alvo, se foi anulada pelo Campo de Força, se ficou sem
    efeito
  - `TURN_TIMEOUT` — jogador e estouros consecutivos (x/3)
  - `ROUND_END` — vencedor ou empate, linha vencedora, placar
  - `MATCH_END` — resultado (vitória, empate absoluto, W.O.) e Coins de cada um
  - `REMATCH_REQUESTED`, `REMATCH_CANCELLED`, `ROOM_CLOSED`
  - `ERROR` — código e mensagem

Ponto de partida para discussão com o Victor Hugo (back). Não é definitivo até ser validado dos
dois lados.

**Contrato do back (15/10):** o back mantém `docs/contrato-integracao.md` no repositório dele,
com o status de cada rota e evento (✅ disponível, 📝 proposta) e as datas por card. Ele é a fonte
do que já existe. Já confirmado:

- REST com prefixo **`/api`** (ex: `POST /api/auth/login`): `VITE_API_URL` termina em `/api`.
- Erro único no REST: `{ code, message, status, timestamp, path, fields? }`.
- Ids das habilidades no campo `code`, iguais aos do front.
- STOMP em `/ws` (sem `/api`), com `/topic` e `/queue`. Os erros das minhas ações chegam em
  `/user/queue/errors`, no formato do REST e fora do envelope; o front traduz para `ERROR`.
- Temporário até a BE-009.1: sala com `?playerId=` e erros `ROOM_BAD_REQUEST` (inclusive sala
  inexistente) e `ROOM_CONFLICT`.
- Respostas do Victor (15/10): tópico no plural (`/topic/rooms/{code}`), `MATCH_END` (não
  `GAME_OVER`), erros STOMP com o mesmo catálogo de códigos do REST, "casa adjacente" inclui as
  diagonais, desconexão segue a regra dos 3 estouros (PROJECT_CONTEXT §6) e o cadastro não devolve
  token (o front faz o login logo depois). BE-040 (JWT no `CONNECT`) e o `ROOM_SNAPSHOT` mínimo
  antes de 22/10.

### Servidor simulado (FE-35)

Enquanto o back não está pronto, o front roda contra um **servidor simulado** que vive no próprio
front (`src/sockets/mock/`). Ele fica **ligado por padrão até a FE-18** e desliga com
`VITE_USE_MOCK_SERVER=false`.

- Implementa a mesma `GameConnection` do cliente STOMP real e emite os eventos do contrato acima.
  Faz o papel do servidor autoritativo: decide jogada, vitória, placar, timeout e as 10
  habilidades com as regras de `src/lib`. Você é sempre o P1; o P2 é um oponente automático.
- Cenários prontos, por `?cenario=` na URL ou `VITE_MOCK_SCENARIO`: `normal`, `vitoria`,
  `empate-absoluto`, `morte-subita`, `virada` e `wo`.
- O que o bot faz no Resultado, por `?revanche=` ou `VITE_MOCK_REMATCH`: `aceita` (padrão),
  `recusa`, `ignora`, `pede` e `sai` (FE-29).
- As telas usam só `src/sockets/gameClient.ts` (`joinRoom`, `sendCommand`, `leaveRoom`) e as
  stores. Nunca sabem se estão falando com o simulado ou com o real.
- "Casa adjacente" (Tornado, Troca Rápida) inclui as diagonais, como no back.
- Quedas (FE-20): `?queda=volta` (o bot cai no primeiro turno dele e volta) ou `?queda=wo` (não
  volta e perde por W.O.). Na vitrine, os botões "Minha conexão cai" e "Robô cai" usam
  `getMockControls()` do `gameClient`, que só existe no simulado.

### Cliente STOMP real (FE-18)

`src/sockets/stompConnection.ts` implementa a mesma `GameConnection` com o `@stomp/stompjs`:
token no `CONNECT` a cada tentativa, assinatura de `/topic/rooms/{code}` e `/user/queue/room`,
`/app/rooms/{code}/connect` para pedir o snapshot (de novo a cada reconexão), status
`RECONNECTING` quando a rede cai e erro local `NOT_CONNECTED` ao mandar intenção sem conexão.
Erros gerados no próprio front vêm com `local: true` e não sincronizam o relógio. O simulado e o
real são carregados sob demanda pelo `gameClient`.

Reconexão (FE-20): a cada volta as assinaturas antigas morrem com a conexão e são refeitas uma
vez só; o `ROOM_SNAPSHOT` remonta todas as stores (`applyServerEvent`). Enquanto o status é
`RECONNECTING`, o `RoomPage` mostra "Reconectando…" e a Arena bloqueia o tabuleiro. Para o aviso
"Oponente desconectado" (FE-05), o hook `useOpponentDisconnect()` de `src/features/match` diz se
o oponente caiu e quantos estouros ele tem.

## 7. Setup

O setup inicial (FE-01) já está na `dev`: Vite + React + TS, Tailwind, Framer Motion, Zustand,
Howler, React Router, oxlint + Prettier, Husky + lint-staged, Vitest, CI e deploy na Vercel.

A base da ERS V2 (FE-22) trocou o `socket.io-client` pelo `@stomp/stompjs`, criou as pastas novas,
as constantes, os tipos, o cliente REST (`src/api/`) e ligou o modo `strict` do TypeScript.

Pendente: configurar o PWA (manifest com `"orientation": "landscape"`, ícones e service worker) —
card FE-16.
