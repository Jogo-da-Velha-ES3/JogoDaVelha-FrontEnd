# INITIAL_BACKLOG.md — Backlog do Front-end (v2.2 — ERS MVP 1 V2)

> Resumo do backlog. O detalhe de cada card (descrição, validação, critérios de aceite, datas e
> responsáveis) está nas issues do GitHub. Atualizado em 14/10/2026: cronograma
> comprimido para todo o front terminar em **30/10**.

## Como o trabalho está organizado

1. **Base do jogo (Rafael, em sequência, 14/10 a 20/10):** estrutura, visual, rotas, personagens,
   tabuleiro, timer, estado da partida, servidor simulado e o esqueleto da Arena.
2. **Complementos (Vini, Matheus e Lucas):** cada um entra assim que a parte da base de que a sua
   tarefa depende fica pronta, e constrói telas e funcionalidades em cima dela, usando o servidor
   simulado no lugar do back.
3. **Integração real (Rafael, 21/10 a 28/10):** troca o servidor simulado pelo back de verdade.

## Base do jogo — sequência do Rafael

| Ordem | Card  | Entrega                                                     | Data     |
| ----- | ----- | ----------------------------------------------------------- | -------- |
| —     | FE-17 | Contrato REST/STOMP com o back (reuniões, em paralelo)      | 15–16/10 |
| 1     | FE-22 | Base ERS V2: STOMP, constantes, tipos, pastas, cliente REST | 14/10 ✓  |
| 2     | FE-23 | Tokens neon, componentes base e layout em paisagem          | 14/10 ✓  |
| 3     | FE-07 | Rotas e guarda de sessão                                    | 14/10 ✓  |
| 4     | FE-24 | Os 6 personagens neon                                       | 14/10 ✓  |
| 5     | FE-04 | winCheck                                                    | 15/10    |
| 6     | FE-02 | Cell (todos os estados da casa)                             | 15/10    |
| 7     | FE-03 | Tabuleiro 4×4                                               | 16/10    |
| 8     | FE-08 | Timer pelo timestamp do servidor                            | 16/10    |
| 9     | FE-12 | Estado da partida (stores e regras da MD3)                  | 17–18/10 |
| 10    | FE-35 | Servidor simulado (mock) para desenvolvimento               | 19/10    |
| 11    | FE-28 | Esqueleto da Arena ligado ao servidor simulado              | 20/10    |

Depois: FE-18 (sala e jogada via STOMP, 21–22/10), FE-19 (habilidades e timer, 23–24/10), FE-20
(reconexão, 25–26/10) e FE-29 (revanche, 27–28/10). Homologação de todos em 29–30/10.

Fora da sequência: FE-46 (ícones neon das 10 habilidades e fim dos emojis na interface, 28/10 ✓),
aberta na revisão da FE-11. A Loja (FE-31) usa o mesmo `AbilityIcon`. FE-47 (animação própria de
cada uma das 10 habilidades, 29/10–02/11), aberta na revisão da FE-27; a demonstração em loop da
Loja (FE-31) pode reusar o `AbilityEffect` e o cenário `abilityDemo`.

## Quando cada pessoa entra

| Pessoa  | Cards (em ordem, com datas)                                                          | Começa quando estiver pronto |
| ------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| Vini    | FE-25 15–17 → FE-06 18–20 → FE-26 21–22 → FE-30 23–24 → FE-16 25–26 → FE-31 27–28/10 | FE-23 e FE-07 (prontas)      |
| Matheus | FE-09 15–17 → FE-10 18–19 → FE-11 21–22 → FE-27 23–26 → FE-33 27–28/10               | FE-23 e FE-24 (prontas)      |
| Lucas   | FE-36 15–16 → FE-34 17–18 → FE-15 19–20 → FE-05 21–23 → FE-13 24–26 → FE-32 27/10    | FE-07 (pronta)               |
| Todos   | FE-21 (homologação) 29–30/10                                                         | 29/10                        |

## Personalidade: som, voz e Vitão (terceiro grupo)

Decidido com o GP em 15/10. Corre em paralelo e não depende da base, que já está pronta. O Vitão
é feito atrás da flag `VITAO_ENABLED`, ligada em 31/10 com a FE-44 (antes da FE-42 e da FE-43, para
o time ver o Vitão enquanto faz as falas, a animação e a voz).

| Card  | Entrega                                                      | Data     | Depende de          |
| ----- | ------------------------------------------------------------ | -------- | ------------------- |
| FE-37 | Motor de som (Howler, um som por evento do servidor)         | 16–18/10 | —                   |
| FE-38 | Banco de sons e trilhas (licença livre)                      | 16–20/10 | —                   |
| FE-39 | Modal de Configurações (som, música, vibração, filtro)       | 19–20/10 | —                   |
| FE-40 | Voz do jogo: textos e humor num arquivo único                | 16–20/10 | —                   |
| FE-41 | Arte do Vitão (cabeça real + corpo de bonequinho)            | 16–21/10 | ok do Vitão         |
| FE-42 | Bonequinho animado (andar, reações, balão)                   | 22–24/10 | FE-41               |
| FE-43 | Falas do Vitão por momento da partida                        | 21–22/10 | FE-40               |
| FE-44 | Motor de reações (1 fala a cada 6s, "Diabo" na Morte Súbita) | 25–26/10 | FE-42, FE-43        |
| FE-45 | Voz gravada do Vitão                                         | 27–28/10 | FE-37, FE-43, FE-44 |

## O que mudou da v1 para a v2

- **Saiu:** mata-mata após empate no round 3 (FE-14 fechada), código alfanumérico, Socket.IO,
  sorteio com descarte, sorteio pós-rodada "trocar ou manter".
- **Mudou:** 10 habilidades em vez de 6; código numérico de 4 dígitos; STOMP; Preparação em 2
  etapas com 20s; sorteio de 8s em todo round; W.O. com 3 estouros; nova regra da MD3 (empate
  absoluto); revanche com 15s e reinício completo.
- **Entrou:** base da ERS V2, tokens neon e paisagem, personagens neon, servidor simulado, Acesso
  (e-mail ou usuário + senha), recuperação de senha, Sala de Espera, Arena, mira e efeitos das 10 habilidades, revanche, REST de
  conta, Loja, Coins simbólicos, Perfil, Como Jogar e os ícones neon das habilidades.
