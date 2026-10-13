# INITIAL_BACKLOG.md — Backlog do Front-end (v2.1 — ERS MVP 1 V2)

> Resumo do backlog. O detalhe de cada card (descrição, validação, critérios de aceite, datas e
> responsáveis) está nas issues do GitHub. Atualizado em 13/10/2026.

## Como o trabalho está organizado

1. **Base do jogo (Rafael, em sequência, 14/10 a 23/10):** estrutura, visual, rotas, personagens,
   tabuleiro, timer, estado da partida, servidor simulado e o esqueleto da Arena.
2. **Complementos (Vini, Matheus e Lucas):** cada um entra assim que a parte da base de que a sua
   tarefa depende fica pronta, e constrói telas e funcionalidades em cima dela, usando o servidor
   simulado no lugar do back.
3. **Integração real (Rafael, a partir de 24/10):** troca o servidor simulado pelo back de verdade.

## Base do jogo — sequência do Rafael

| Ordem | Card  | Entrega                                                     | Data     |
| ----- | ----- | ----------------------------------------------------------- | -------- |
| —     | FE-17 | Contrato REST/STOMP com o back (em paralelo)                | 14–16/10 |
| 1     | FE-22 | Base ERS V2: STOMP, constantes, tipos, pastas, cliente REST | 14/10    |
| 2     | FE-23 | Tokens neon, componentes base e layout em paisagem          | 15/10    |
| 3     | FE-07 | Rotas e guarda de sessão                                    | 16/10    |
| 4     | FE-24 | Os 6 personagens neon                                       | 16–17/10 |
| 5     | FE-04 | winCheck                                                    | 17/10    |
| 6     | FE-02 | Cell (todos os estados da casa)                             | 18/10    |
| 7     | FE-03 | Tabuleiro 4×4                                               | 19/10    |
| 8     | FE-08 | Timer pelo timestamp do servidor                            | 19/10    |
| 9     | FE-12 | Estado da partida (stores e regras da MD3)                  | 20–21/10 |
| 10    | FE-35 | Servidor simulado (mock) para desenvolvimento               | 21–22/10 |
| 11    | FE-28 | Esqueleto da Arena ligado ao servidor simulado              | 22–23/10 |

Depois: FE-18 (sala e jogada via STOMP, até o Marco 4), FE-19 (habilidades e timer), FE-20
(reconexão) e FE-29 (revanche).

## Quando cada pessoa entra

| Pessoa  | Cards (em ordem)                                                                                                            | Começa quando estiver pronto |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Vini    | FE-25 Acesso → FE-06 Hub → FE-26 Sala de Espera → FE-30 REST → FE-16 PWA → FE-31 Loja                                       | FE-23 e FE-07 (16/10)        |
| Matheus | FE-09 Preparação → FE-10 sorteio → FE-11 deck → FE-27 mira e efeitos → FE-33 Perfil                                         | FE-23 e FE-24 (17/10)        |
| Lucas   | FE-34 Como Jogar → FE-36 recuperação de senha → FE-05 faixas e banners → FE-13 Morte Súbita → FE-15 Resultado → FE-32 Coins | FE-03 (19/10)                |
| Todos   | FE-21 homologação                                                                                                           | 05/11                        |

## O que mudou da v1 para a v2

- **Saiu:** mata-mata após empate no round 3 (FE-14 fechada), código alfanumérico, Socket.IO,
  sorteio com descarte, sorteio pós-rodada "trocar ou manter".
- **Mudou:** 10 habilidades em vez de 6; código numérico de 4 dígitos; STOMP; Preparação em 2
  etapas com 20s; sorteio de 8s em todo round; W.O. com 3 estouros; nova regra da MD3 (empate
  absoluto); revanche com 15s e reinício completo.
- **Entrou:** base da ERS V2, tokens neon e paisagem, personagens neon, servidor simulado, Acesso
  (e-mail ou usuário + senha), recuperação de senha, Sala de Espera, Arena, mira e efeitos das 10 habilidades, revanche, REST de
  conta, Loja, Coins simbólicos, Perfil e Como Jogar.
