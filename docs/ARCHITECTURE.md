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
│   └── vitao/           # só o espaço reservado + feature flag (desligado no MVP 1)
├── sockets/            # cliente STOMP + servidor simulado (mock/) com a mesma interface
├── lib/                # lógica pura, sem React (testável isolado)
│   ├── winCheck.ts       # verificação de vitória N×N/K, ignorando peças congeladas
│   └── timer.ts          # cálculo do tempo restante a partir do timestamp do servidor
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
```

- Link direto: `/sala/4821`. Se não houver sessão, o código fica guardado no `roomStore`, o
  jogador passa pelo Acesso e volta para a sala.
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

## 3. Stores (Zustand)

| Store          | Guarda                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| `authStore`    | token, usuário logado, status da sessão                                            |
| `profileStore` | apelido, personagem favorito, Coins, inventário (personagens e habilidades), stats |
| `roomStore`    | código da sala, `phase`, jogadores, status da conexão STOMP, se sou Host ou Guest  |
| `draftStore`   | personagens bloqueados, minhas escolhas, status do oponente, prazo dos 20s         |
| `matchStore`   | round atual, placar MD3, Morte Súbita, quem começa, estouros consecutivos (0–3)    |
| `boardStore`   | as 16 casas e seus efeitos (escudo, congelada, reforço) com contadores             |
| `powersStore`  | opções do sorteio, deck da rodada, habilidades usadas, mira em andamento           |
| `timerStore`   | de quem é o turno, prazo do turno (timestamp do servidor), duração (10s/5s)        |
| `toastStore`   | fila de toasts na tela (só interface, não reflete o servidor)                      |

Regras:

- Cada store reflete **o que o servidor confirmou**, nunca o que o jogador tentou fazer.
- Mensagens do servidor entram por um único ponto (o cliente STOMP) e são distribuídas para as
  stores. Componentes não assinam destinos STOMP diretamente.
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
- **Assinaturas:** `/topic/rooms/{code}` (eventos públicos da sala) e `/user/queue/room` (eventos
  privados: opções do meu sorteio, meu deck, erros).
- **Envio (cliente → servidor), prefixo `/app/rooms/{code}`:**
  - `/draft/character` `{ character }`
  - `/draft/abilities` `{ abilities: [AbilityId, AbilityId] }`
  - `/draw/pick` `{ ability }`
  - `/move` `{ cell }`
  - `/ability` `{ ability, targetCell?, destinationCell? }`
  - `/rematch/request`, `/rematch/respond` `{ accept }`
  - `/leave`
- **Eventos (servidor → cliente)**, num envelope `{ type, payload, serverTime }`:
  - `ROOM_SNAPSHOT` — estado completo (ao entrar e ao reconectar)
  - `PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_DISCONNECTED`, `PLAYER_RECONNECTED`
  - `DRAFT_UPDATE` — personagens bloqueados e status de cada jogador
  - `DRAW_OPTIONS` (privado) — 3 habilidades e prazo de 8s
  - `ROUND_START` — round, quem começa, Morte Súbita
  - `TURN_START` — jogador, timestamp de início e duração
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

### Servidor simulado (FE-35)

Enquanto o back não está pronto, o front roda contra um **servidor simulado** que vive no próprio
front (`src/sockets/mock/`), ligado por `VITE_USE_MOCK_SERVER=true`:

- Expõe **a mesma interface** do cliente STOMP real (conectar, assinar, enviar) e emite os mesmos
  eventos do contrato acima, com um oponente automático.
- Tem cenários prontos (vitória, empate absoluto, W.O., Morte Súbita) para testar cada tela.
- As telas nunca sabem se estão falando com o simulado ou com o real. Trocar um pelo outro é só
  mudar a variável de ambiente.

## 7. Setup

O setup inicial (FE-01) já está na `dev`: Vite + React + TS, Tailwind, Framer Motion, Zustand,
Howler, React Router, oxlint + Prettier, Husky + lint-staged, Vitest, CI e deploy na Vercel.

A base da ERS V2 (FE-22) trocou o `socket.io-client` pelo `@stomp/stompjs`, criou as pastas novas,
as constantes, os tipos, o cliente REST (`src/api/`) e ligou o modo `strict` do TypeScript.

Pendente: configurar o PWA (manifest com `"orientation": "landscape"`, ícones e service worker) —
card FE-16.
