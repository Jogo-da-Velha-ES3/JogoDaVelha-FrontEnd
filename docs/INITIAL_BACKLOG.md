# INITIAL_BACKLOG.md — Backlog inicial do Front-end

> Base pra criar os cards no Trello (usar o template em CONVENTIONS.md). Ordem sugere
> prioridade de execução — dependências estão marcadas. Tudo aqui é MVP, exceto a seção 9.

## 0. Setup (Rafael — antes de distribuir o resto)

- [ ] Scaffold do projeto (Vite + React + TS), estrutura de pastas, oxlint/Prettier, Vitest, Husky,
      `.env.example`, `.nvmrc`, conexão com Vercel, branch protection — ver ARCHITECTURE.md §7

## 1. Tabuleiro (`features/board`)

| Tarefa                                                                          | Categoria      | Depende de |
| ------------------------------------------------------------------------------- | -------------- | ---------- |
| Componente `Cell` (célula clicável, estados: vazia/X/O/bloqueada/congelada)     | Componentes/UI | Setup      |
| Grid 4×4 renderizando estado local (sem rede ainda)                             | Componentes/UI | Cell       |
| `lib/winCheck.ts` — verificação genérica de vitória (alinhar 4, todas direções) | Estado Global  | Setup      |
| Indicador visual de turno atual (de quem é a vez)                               | Componentes/UI | Grid 4x4   |

## 2. Lobby e Salas (`features/lobby`)

| Tarefa                                                                          | Categoria            | Depende de                   |
| ------------------------------------------------------------------------------- | -------------------- | ---------------------------- |
| Tela de Menu — criar sala / digitar código alfanumérico de 4 caracteres         | Roteamento           | Setup                        |
| Rotas com React Router (`/`, `/sala/:codigo`, etc.)                             | Roteamento           | Setup                        |
| Conexão de socket + estados de conexão (conectando/conectado/erro/reconectando) | Integração WebSocket | Contrato validado com o back |

## 3. Timer

| Tarefa                                                                          | Categoria      | Depende de                   |
| ------------------------------------------------------------------------------- | -------------- | ---------------------------- |
| Componente de barra de progresso (circular ou linear), 10s / 5s                 | Componentes/UI | Setup                        |
| Hook `useTimer` sincronizado com o tempo do servidor (não confiar só no client) | Estado Global  | Contrato validado com o back |

## 4. Habilidades (`features/powers`)

| Tarefa                                                                                                 | Categoria      | Depende de   |
| ------------------------------------------------------------------------------------------------------ | -------------- | ------------ |
| Tela de Pick Inicial — escolher 2 das 6 habilidades                                                    | Componentes/UI | Setup        |
| Componente de Sorteio (3 cartas, escolher 1 ou descartar) — usado no início e pós-rodada               | Componentes/UI | Pick Inicial |
| HUD do deck ativo (até 3 habilidades, indicador "usado" no round atual)                                | Componentes/UI | Sorteio      |
| Feedback visual de ativação por habilidade (Bomba, Escudo, Tornado, Buraco Negro, Ampulheta, Congelar) | Estilização    | HUD do deck  |

## 5. Fluxo de Partida / MD3 (`features/board` + estado global)

| Tarefa                                                                                     | Categoria      | Depende de           |
| ------------------------------------------------------------------------------------------ | -------------- | -------------------- |
| Placar da MD3 (rounds ganhos por jogador)                                                  | Componentes/UI | Grid 4x4             |
| Transição entre rounds + tela de "round neutro" em caso de empate                          | Componentes/UI | Placar MD3           |
| UI de Round 3 / Sudden Death (alerta vermelho, timer 5s)                                   | Estilização    | Placar MD3, Timer    |
| Mata-mata após empate no Round 3, mantendo habilidades não usadas e alternando quem começa | Estado Global  | Round 3, Habilidades |

## 6. Resultado (`features/results`)

| Tarefa                                                                                  | Categoria      | Depende de                             |
| --------------------------------------------------------------------------------------- | -------------- | -------------------------------------- |
| Tela de Resultado Final (vencedor, coins persistentes), botões Revanche/Voltar ao Lobby | Componentes/UI | Fluxo MD3                              |
| Saldo persistente de Coins por resultado da MD3                                         | Estado Global  | Tela de Resultado, contrato com o back |

## 7. PWA

| Tarefa                                             | Categoria | Depende de            |
| -------------------------------------------------- | --------- | --------------------- |
| `manifest.json`, ícones, service worker básico     | PWA       | Setup                 |
| Teste de responsividade real em dispositivo mobile | Testes    | Board + Lobby prontos |

## 8. Integração WebSocket (transversal — depende do contrato com o back)

| Tarefa                                                                        | Categoria            | Depende de                     |
| ----------------------------------------------------------------------------- | -------------------- | ------------------------------ |
| Validar contrato de eventos com o Victor Hugo (back) — ver ARCHITECTURE.md §6 | Integração WebSocket | —                              |
| Emitir/receber eventos de jogada (`board:move` / `board:update`)              | Integração WebSocket | Contrato validado, Grid 4x4    |
| Emitir/receber eventos de habilidade (`ability:activate`)                     | Integração WebSocket | Contrato validado, HUD do deck |
| Sincronizar timer com o servidor (`turn:timeout`)                             | Integração WebSocket | Contrato validado, Timer       |
| Tratar desconexão/reconexão (RF03 do TAP)                                     | Integração WebSocket | Contrato validado              |

## 9. Pós-MVP / Stretch (não iniciar antes do item 8 estar funcional)

- Habilidades exclusivas por personagem (X, O, Triângulo, Quadrado, Estrela, Coração)
- Loja cosmética (skins, avatares, efeitos, estilos de tabuleiro)

---

**Sugestão de divisão inicial:** dá pra montar de 2 a 3 frentes paralelas assim que o setup
(item 0) e o contrato de WebSocket (item 8, primeira linha) estiverem prontos:

- Pessoa A: Tabuleiro + Fluxo MD3 (itens 1 e 5)
- Pessoa B: Lobby + PWA (itens 2 e 7)
- Pessoa C: Habilidades (item 4)
- Você (Rafael): integração WebSocket transversal (item 8) + revisão de todos os PRs

Isso evita que uma pessoa fique bloqueada esperando a outra — cada frente pode desenvolver
com dados mockados localmente até a integração real do item 8 entrar.
