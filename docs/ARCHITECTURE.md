# ARCHITECTURE.md — Estrutura técnica do front-end

> Complementa o PROJECT_CONTEXT.md. Este documento é sobre **como** o código é organizado,
> não sobre as regras do jogo. Atualizado para a ERS MVP 1 — V2 (08/10/2026).

## 1. Estrutura de pastas

```
src/
├── api/                # cliente REST fino (fetch): auth, perfil, inventário, loja, salas
├── assets/             # sons (Howler), imagens, ícones, fontes
├── components/         # componentes reutilizáveis e "burros" (sem lógica de negócio)
│   ├── ui/              # botões, modais, inputs, toast, banner, ícones (cadeado, pausa) — puramente visuais
│   └── layout/          # LandscapeShell (safe-area, sem overflow) e o aviso "Gire o celular"
├── features/           # lógica de domínio, isolada por área do jogo
│   ├── auth/            # login, cadastro, sessão
│   ├── hub/             # Hub, menu lateral, Como Jogar, Instalar App
│   ├── profile/         # Perfil: apelido, estatísticas, coleção
│   ├── shop/            # Loja, demonstração de habilidade, compra de Coins
│   ├── lobby/           # criar/entrar em sala, código numérico de 4 dígitos, Sala de Espera
│   ├── draft/           # Preparação: personagem (com bloqueio) e 2 habilidades iniciais
│   ├── board/           # tabuleiro 4×4, células e seus estados
│   ├── powers/          # sorteio da 3ª, deck, mira, ícones neon (`AbilityIcon`) e, em `effects/`, a animação de cada uma das 10 habilidades
│   ├── match/           # Arena: turnos, timer, placar MD3, Morte Súbita, banners
│   ├── results/         # Resultado, Coins, revanche
│   ├── characters/      # os 6 personagens em SVG (estilo neon) + paleta
│   ├── settings/        # modal de Configurações (som, música, voz, Vitão, filtro, vibração)
│   └── vitao/           # Vitão: arte, animação, falas e reações, atrás da flag VITAO_ENABLED
├── sockets/            # cliente STOMP + servidor simulado (mock/) com a mesma interface
├── pwa/                # convite de instalação (beforeinstallprompt); o service worker vem do vite-plugin-pwa
├── lib/                # lógica pura, sem React (testável isolado)
│   ├── winCheck.ts       # verificação de vitória N×N/K, ignorando peças congeladas
│   ├── abilityTargets.ts # casas vizinhas e os alvos que a mira deixa tocar
│   ├── timer.ts          # cálculo do tempo restante a partir do timestamp do servidor
│   ├── match.ts          # regras da MD3: fim da partida, quem começa, match point, Coins
│   ├── vitao.ts          # quando e o que o Vitão fala (6s, prioridade, 1 em 3 jogadas, Diabo)
│   └── vitaoMoments.ts   # momentos do Vitão a partir da mudança das stores
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
- Dentro de `/sala/:codigo`, a tela é escolhida pelo campo `phase` que o servidor manda no
  snapshot da sala (e no `PHASE_CHANGE`), em vez de rotas separadas para jogo e resultado. Assim,
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
`joinRoom` e, ao sair, `leaveRoom`. Sala de Espera e Preparação ainda são placeholders
(`src/routes/room/RoomPlaceholders.tsx`) que a FE-26 e a FE-09 substituem; o Resultado (FE-15) já é
tela de verdade. No W.O., a
Arena segura o banner por `RESULT_HOLD_SECONDS` antes do Resultado; no empate absoluto também
(PROJECT_CONTEXT §9). Os efeitos da Morte Súbita ficam em `SuddenDeathLayer` (FE-13).
A Arena fica em `src/features/match/Arena.tsx`, com as regiões prontas para as faixas e banners
(FE-05), o deck (FE-11) e a mira (FE-27).

A mira (FE-27) fica em `src/features/powers/useAbilityAim.ts`: alvos da etapa atual (com
`getAimTargets`, de `src/lib/abilityTargets.ts`), o envio da intenção e a espera pelo servidor,
com o tabuleiro travado até o `ABILITY_RESOLVED` ou um erro. O resultado aparece em duas peças: a
animação da habilidade no tabuleiro, por `ABILITY_IMPACT_SECONDS`, e o `AbilityNotice`, o aviso na
coluna direita por `ABILITY_NOTICE_SECONDS`.

As animações (FE-47) ficam em `src/features/powers/effects/`, uma por arquivo (`BombEffect`,
`TornadoEffect`...), mais a anulada, a sem efeito e a versão parada para "reduzir movimento". O
`AbilityEffect` escolhe qual tocar e é desenhado **dentro do grid do tabuleiro**: cada camada se
posiciona pela linha e coluna da casa (por isso as casas também têm posição explícita no `Board`).
O tabuleiro já chega com o estado final, então a peça que a habilidade levou fica escondida no
destino (`pieceHidden`) até a animação terminar de levá-la, e a peça que a Bomba removeu é
desenhada por cima só para explodir. O `AbilityEffect` não lê store: a vitrine (aba Habilidades)
mostra cada animação com o cenário de `abilityDemo.ts`, que a Loja (FE-31) também pode usar.

Revanche e saída (FE-29) ficam em `src/features/results/`: o `RematchPanel` (Revanche, Aceitar /
Recusar com a barra dos 15s e Voltar ao Lobby) entra na tela de Resultado da FE-15, e o
`useRoomExit` (usado pelo `RoomPage`) avisa e leva ao Hub quem teve o pedido cancelado ou viu a
sala ser encerrada fora do Resultado. A revanche aceita chega como `PHASE_CHANGE` para `DRAFT`.

A tela de Resultado (FE-15) é `ResultScreen`, em `src/features/results/`. Ela só lê as stores e não
altera saldo nem armazenamento. O `useLiveResult` decide uma vez, quando o resultado aparece, se ele
acabou de chegar (`outcomeReceivedAt`): só então tocam a comemoração e a contagem de Coins. Quem
reconecta vê o estado final parado, e uma memória por partida (sala, início do último round,
resultado e Coins) evita repetir a festa se a tela for desmontada e montada de novo.

O motor de reações do Vitão (FE-44) fica em `src/features/vitao/` e `src/lib/`. As regras são puras
(`lib/vitao.ts`: 1 fala a cada 6s, momentos grandes primeiro, 1 em 3 jogadas de peça, "Diabo" na
Morte Súbita, filtro) e a detecção dos momentos também (`lib/vitaoMoments.ts`, pela diferença entre
dois retratos das stores). O hook `useVitaoReactions` observa as stores, que só mudam por evento do
servidor, e entrega a fala atual ao `VitaoSlot`. O momento grande fala na hora, mesmo dentro da
pausa de 6s, no lugar da fala atual. As falas provisórias estão em `features/vitao/vitaoLines.ts` (a
FE-43 troca pelas frases do Rafik de `constants/texts.ts` e tira as piadas dos banners). A flag
`VITAO_ENABLED` foi ligada em 31/10, com a FE-44.

O desenho do Vitão (FE-42) é o `VitaoView`, que não lê store: recebe a expressão, a fala e o `id` da
fala, respira parado, toca a reação de cada expressão a cada fala nova e encolhe a cabeça para o
balão caber no espaço sem cobrir as faixas. O `VitaoSlot` liga o motor ao `VitaoView`, e a vitrine
(aba Vitão) usa o `VitaoView` direto.

## 3. Stores (Zustand)

| Store           | Guarda                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `authStore`     | token, usuário logado, status da sessão                                                                |
| `profileStore`  | apelido, personagem favorito, Coins, inventário (personagens e habilidades), stats                     |
| `roomStore`     | código da sala, `phase`, jogadores, meu lado (`mySlot`), conexão, queda do oponente, link pendente     |
| `draftStore`    | personagens reservados por lado, quem está pronto, prazo dos 20s                                       |
| `matchStore`    | round, placar MD3, Morte Súbita, quem começa, estouros (0–3), fim do round, resultado, Coins, revanche |
| `boardStore`    | as 16 casas com efeitos e contadores, linha vencedora, última habilidade resolvida                     |
| `powersStore`   | opções do sorteio, meu deck da rodada, mira em andamento                                               |
| `timerStore`    | de quem é o turno, prazo do turno (timestamp do servidor), duração (10s/5s)                            |
| `clockStore`    | diferença entre o relógio do servidor e o do aparelho (`syncWithServer` a cada msg)                    |
| `toastStore`    | fila de toasts na tela (só interface, não reflete o servidor)                                          |
| `settingsStore` | preferências das Configurações, guardadas no aparelho (só interface, FE-39)                            |

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
| `src/constants/texts.ts`      | as frases da interface por tela e as falas do narrador, sem filtro e com filtro (FE-40, guia em `docs/VOICE_GUIDE.md`)               |

O filtro de linguagem é lido por um hook só, `useLanguageFilter` (`src/hooks/useLanguageFilter.ts`),
que o Vitão também usa. Ele lê o filtro de palavrões das Configurações (`settingsStore`, FE-39),
desligado por padrão. Nos componentes, `useVoice()` escolhe a versão de cada fala.

As Configurações (FE-39) ficam em `src/features/settings/SettingsModal.tsx` e abrem pelo Hub
(engrenagem na barra lateral) e pela pausa da Arena. O `settingsStore` guarda as preferências no
aparelho e funciona sem armazenamento (aba anônima). Quem lê: o motor de som (volume e mudo de
música e efeitos, em `initSound`), `useLanguageFilter`, a vibração da Morte Súbita
(`useVibration`) e o `VitaoSlot` (Vitão desligado some, mesmo com a flag `VITAO_ENABLED` ligada). O
volume da voz fica guardado para a FE-48.

Os identificadores de habilidade e personagem (`'BOMBA'`, `'CAMPO_DE_FORCA'`, `'TRIANGULO'`...) devem
bater com os enums do back — confirmar na FE-17.

## 5. Tipos principais (`types/`)

| Arquivo                | O que tem                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/types/game.ts`    | `AbilityId`, `CharacterId`, `RoomPhase`, `Cell`, `PlayerState`, `DeckSlot`, `TurnState`, `MatchOutcome`, `RoomSnapshot` |
| `src/types/events.ts`  | `ServerEvent` (eventos do servidor), `ServerEnvelope` e `ClientCommand` (intenções do cliente)                          |
| `src/sockets/types.ts` | `GameConnection`: a interface que o cliente STOMP real e o servidor simulado implementam                                |

Os tipos de eventos seguem o contrato da seção 6, no vocabulário do front.

## 6. Contrato com o back (V2, validado em 06/11)

A fonte é o `docs/contrato-integracao-v2.md` do repositório do back. Ele foi validado na FE-17
(PR #129 do back) com o back rodando e partidas inteiras entre dois jogadores
(`docs/LOCAL_INTEGRATION.md`). Os nomes do back ficam só na tradução: `src/sockets/destinations.ts`
(o que o front manda) e `src/sockets/envelope.ts` (o que chega). O resto do front usa os tipos de
`src/types/events.ts`, e as mensagens reais capturadas ficam em
`src/sockets/__fixtures__/backMessages.ts`, nos testes da tradução.

### REST (`VITE_API_URL`, termina em `/api`)

| Método | Rota                            | Uso                                                                 |
| ------ | ------------------------------- | ------------------------------------------------------------------- |
| POST   | `/auth/register`                | criar conta (usuário, e-mail, senha); não devolve token             |
| POST   | `/auth/login`                   | login com e-mail **ou** usuário + senha → token                     |
| POST   | `/auth/forgot-password`         | envia o link de recuperação (200, mensagem genérica)                |
| POST   | `/auth/reset-password`          | `{ token, newPassword, confirmPassword }`                           |
| GET    | `/profile`                      | apelido, saldo, avatar, personagem mais usado e o equipado          |
| GET    | `/profile/stats`                | partidas, vitórias, sequências e taxa de vitória                    |
| PATCH  | `/profile/username`             | trocar apelido → 204                                                |
| GET    | `/shop/{categoria}`             | catálogo (`characters` ou `skills`) com `owned`/`equipped`          |
| POST   | `/shop/{cat}/{id}/purchase`     | comprar personagem ou habilidade `[RF-LOJ-02]`                      |
| PUT    | `/shop/characters/{id}/equip`   | equipar o personagem favorito                                       |
| GET    | `/coins/balance`                | saldo `{ coinsBalance }`                                            |
| GET    | `/coins/packages`               | pacotes simbólicos `{ id, coins, priceInReais }`                    |
| POST   | `/coins/packages/{id}/purchase` | compra simbólica → 200 `{ coinsBalance }` `[RN-LOJ-04]`             |
| POST   | `/rooms`                        | criar sala → código de 4 dígitos `[RF-HUB-04]`                      |
| POST   | `/rooms/{code}/join`            | entrar; erros `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_ALREADY_STARTED` |

Erro único: `{ code, message, status, timestamp, path, fields? }`. Ids das habilidades no campo
`code`, iguais aos do front. O ajuste fino do REST de perfil, loja e Coins é a FE-49; o da
recuperação de senha (código `INVALID_RESET_TOKEN`), a FE-36.

### STOMP (`VITE_WEBSOCKET_URL`, a raiz do back; o cliente usa `/ws`)

- `CONNECT` com `Authorization: Bearer <token>`: a identidade vem do token, nunca do corpo.
- **Assinaturas:** `/topic/rooms/{code}` (eventos públicos), `/user/queue/room` (privados: o
  snapshot completo, as minhas cartas do sorteio, o meu deck, a queda do oponente) e
  `/user/queue/errors` (erros das minhas ações, no formato do REST, sem envelope).
- **Envio, prefixo `/app/rooms/{code}`** (`toBackCommand`):

  | Intenção do front                    | Destino e corpo do back                                           |
  | ------------------------------------ | ----------------------------------------------------------------- |
  | entrar ou voltar                     | `/connect` → responde com o `ROOM_SNAPSHOT` privado               |
  | `DRAFT_CHARACTER`, `DRAFT_ABILITIES` | `/draft/character` `{ character }`, `/draft/abilities`            |
  | `DRAW_PICK`                          | `/draw/pick` `{ ability }` (sai a sorteada anterior)              |
  | `MOVE` `{ cell }`                    | `/move` `{ position }`                                            |
  | `USE_ABILITY`                        | `/ability` `{ skillCode, targetPosition?, destinationPosition? }` |
  | `REMATCH_REQUEST`                    | `/rematch/request`                                                |
  | `REMATCH_RESPOND` `{ accept }`       | `/rematch/accept` ou `/rematch/decline`                           |
  | `LEAVE`                              | `/leave`, em qualquer fase (abaixo)                               |

- **Eventos**, no envelope `{ type, payload, serverTime }` (ms). O que a tradução muda:
  - `ROOM_SNAPSHOT`: o público (tópico, sem `mySlot`) é descartado; vale o privado. Um snapshot
    mais antigo que o último aplicado também (`roomStore.snapshotTime`). O snapshot que o back
    manda depois do `MATCH_END` e a cada pedido de revanche não apaga o fim da partida que a tela
    ainda mostra (a hora do resultado, o fim do round, a linha vencedora).
  - `PLAYER_JOINED`: vira o jogador P2 (`{ player }`); o snapshot logo depois completa o resto.
  - `ROUND_START`: `firstPlayer` vira `startingPlayer`.
  - `ABILITY_RESOLVED`: `skillCode`/`targetPosition`/`destinationPosition` viram
    `ability`/`targetCell`/`destinationCell` (null quando a habilidade não tem alvo).
  - `ROUND_END`: o empate vem sem `winningLine`, que vira null.
  - `DRAFT_UPDATE` traz `version`: um aviso mais antigo que o último aplicado é descartado (com os
    dois escolhendo juntos, eles chegam fora de ordem). Cada Preparação começa em 0.
  - `TURN_START` traz os estouros e o `silenced` oficiais de cada lado.
  - `ROOM_CLOSED` traz o motivo como código: `PLAYER_LEFT`, `RETURN_TO_LOBBY`, `REMATCH_DECLINED`,
    `REMATCH_EXPIRED`, `REMATCH_DISCONNECTED`, `HOST_LEFT` ou `EXPIRED`. O back não tem evento de
    revanche cancelada: a sala encerrada com um pedido em aberto cancela o pedido
    (`serverEvents`), e o aviso vem de `roomClosedMessage` (`features/results`).
  - Os demais (`PHASE_CHANGE`, `DRAW_OPTIONS`, `DECK_UPDATE`, `BOARD_UPDATE`, `TURN_TIMEOUT`,
    `MATCH_END`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED`) já vêm no formato do front.
- **Saída (`/leave`):** na Sala de Espera, o host encerra a sala; no MATCH FEITO e na Preparação,
  a sala é encerrada sem partida (`PLAYER_LEFT`); na partida, é desistência e o outro vence por
  W.O.; no Resultado, é voltar ao lobby. O `leaveRoom()` do `gameClient` manda sempre o mesmo.
- **Tempos do servidor:** 3s de "MATCH FEITO" antes de os 20s da Preparação começarem, 3s de VS
  antes do round 1, 2,5s de apresentação antes do primeiro `TURN_START` de cada round
  (`ROUND_INTRO_SECONDS`) e 2,5s depois do `ROUND_END`. O `MATCH_END` chega antes do
  `PHASE_CHANGE` para `RESULT`; no W.O., na hora.
- **Regras:** MD3 da ERS (depois do round 2 quem está na frente vence; round 3 só com placar
  igual), "casa adjacente" com diagonais, desconexão pela regra dos 3 estouros, e o deck do round
  = 2 iniciais + 1 sorteada (a nova entra no lugar da anterior).

### Servidor simulado (FE-35)

Enquanto o back não está pronto, o front roda contra um **servidor simulado** que vive no próprio
front (`src/sockets/mock/`). Ele fica **ligado por padrão** e desliga com
`VITE_USE_MOCK_SERVER=false`, que liga o front no back de verdade (`docs/LOCAL_INTEGRATION.md`).

- Implementa a mesma `GameConnection` do cliente STOMP real e emite os eventos do contrato acima.
  Faz o papel do servidor autoritativo: decide jogada, vitória, placar, timeout e as 10
  habilidades com as regras de `src/lib`. Você é sempre o P1; o P2 é um oponente automático.
- Cenários prontos, por `?cenario=` na URL ou `VITE_MOCK_SCENARIO`: `normal`, `vitoria`,
  `empate-absoluto`, `morte-subita`, `virada` e `wo`.
- Cenários de derrota (FE-15): `derrota` (o bot vence por 0×2; Coins 10 e 50) e `derrota-wo` (você
  não joga: seus turnos duram 2s e os 3 estouros seguidos dão W.O. ao bot; Coins 0 e 30).
- O que o bot faz no Resultado, por `?revanche=` ou `VITE_MOCK_REMATCH`: `aceita` (padrão),
  `recusa`, `ignora`, `pede` e `sai` (FE-29).
- As telas usam só `src/sockets/gameClient.ts` (`joinRoom`, `sendCommand`, `leaveRoom`) e as
  stores. Nunca sabem se estão falando com o simulado ou com o real.
- "Casa adjacente" (Tornado, Troca Rápida) inclui as diagonais, como no back.
- Conta do jogador (FE-30): `src/api/profile.ts` e `src/api/shop.ts` usam as rotas reais do back
  (BE-027, `ShopController` e `CoinController`, conferidas na `dev` do back em 02/11); no
  simulado, respondem pela conta guardada no aparelho (`src/api/mockAccount.ts`, no
  `localStorage`), com 300ms de espera e os mesmos `code` de erro do back. Cada apelido que entra
  pelo simulado tem a sua conta. O servidor simulado credita os Coins e a partida nela antes do
  `MATCH_END`, como o back. O `profileStore` só grava a resposta de cada chamada; ele recarrega
  saldo e estatísticas depois do `MATCH_END` e zera ao Sair. O Hub carrega o perfil ao abrir, e a
  Preparação libera só os itens com `owned: true` (antes de carregar, só os iniciais).
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

### PWA (FE-16)

O jogo é instalável pelo **vite-plugin-pwa** (configurado em `vite.config.ts`), que gera o manifest
e o service worker (Workbox) no `npm run build`. O registro fica em `src/pwa/registerServiceWorker.ts`.

- **Manifest** (no `vite.config.ts`): nome, `display: "fullscreen"`, `orientation: "landscape"`,
  cores no `--color-bg-deep` (`#07060e`) e os ícones de `public/icons/` (192, 512 e um "maskable"
  para o Android recortar). O iPhone usa o `apple-touch-icon` e as metas `apple-mobile-web-app-*`
  do `index.html`.
- **Service worker:** `registerType: "autoUpdate"`. Guarda o app (JS, CSS, HTML e imagens) para
  abrir sem rede; sons ficam de fora. Toda rota cai no `index.html`, e
  `/api/` nunca passa pelo cache. Partida e sala vão por WebSocket, que o service worker não toca.
- **Versão nova:** depois de um deploy, o jogo abre com a versão do cache e o service worker novo
  assume em segundos, apagando os arquivos velhos. Por isso a página recarrega nessa hora
  (`onNeedReload`): sem isso, o primeiro arquivo carregado sob demanda (a conexão da sala) não
  existe mais e a sala não abre. Dentro da sala não recarrega, para não derrubar a partida; o
  código dela já carregou, e a versão nova entra na próxima vez que o jogo abrir.
- Só existe no build: no `npm run dev` e nos testes ele fica desligado. Para testar a instalação,
  use o preview da Vercel (HTTPS).
- `src/pwa/installPrompt.ts` guarda o `beforeinstallprompt` desde o `main.tsx`, porque o navegador
  manda o evento logo no carregamento, antes do Hub existir. O `useInstallPrompt` e o
  `InstallAppButton` do Hub decidem o botão pela regra pura de `src/lib/installPlatform.ts`: janela
  de instalação do navegador (Chrome/Edge/Android), passo a passo do Compartilhar (iPhone/iPad) ou
  botão escondido (já instalado, ou navegador que não instala sites, como o Firefox no computador).
