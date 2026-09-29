# PROJECT_CONTEXT.md — Jogo do Velho (nome provisório) — Front-end

> Documento de contexto para o Claude Code. Leia isto antes de qualquer tarefa.
> Projeto acadêmico (Fatec-SP, Engenharia de Software III). Front-end liderado por Rafael
> (líder técnico de front, Equipe 03). Este documento reflete o GDD v3 (versão final decidida
> pela equipe) e as decisões técnicas já fechadas — não é um rascunho.

## 1. O que é o jogo

Jogo da Velha online multiplayer em tempo real, com um sistema de habilidades especiais
(deck-building leve, sorteado ao longo da partida) que transforma o jogo clássico — que costuma
terminar em empates previsíveis — em algo estratégico e competitivo, **100% sem pay-to-win**.

- **Plataforma:** Web (desktop + mobile), com suporte a PWA instalável
- **Público-alvo:** jogadores casuais, partidas de 2 a 5 minutos
- **Estética:** inspirada no UNO (Steam) — neon, alto contraste, sensação de pressão/competição
- **Multiplayer:** 2 jogadores por partida, em dispositivos diferentes, via WebSocket

## 2. Regras da partida (fechadas — não inventar variações)

### Tabuleiro e vitória

- Grade **4×4**
- Vence quem **alinhar 4 símbolos** iguais (horizontal, vertical ou diagonal)
- **Formato: Melhor de 3 rounds (MD3)**
- Round empatado (tabuleiro cheio, ninguém alinhou 4) = **round neutro, ninguém pontua**,
  a MD3 segue normalmente pro próximo round (não há replay do round)
- Placar final possível: 2×0 ou 2×1
- **Round 3 acontece sempre que ninguém tiver fechado 2 rounds vencidos após os rounds 1 e 2**
  (isso inclui o cenário 0×0)
  - Round 3 = **Sudden Death**: timer reduzido de 10s para **5s por turno**, UI de alerta
    (interface vermelha, "trilha tensa"). Se o Round 3 terminar empatado, começa um
    mata-mata com novos tabuleiros até um jogador vencer. O jogador inicial alterna a cada
    novo desempate, e o timer permanece em 5s por turno.
  - **Há um novo sorteio pós-rodada antes do Round 3, igual acontece entre os Rounds 1 e 2**
    (correção: a versão anterior deste documento dizia que o Round 3 reaproveitava o deck
    do Round 2 sem sorteio novo — isso estava errado). O deck ativo continua sendo mantido
    durante o mata-mata.

### Turnos e timer

- Turnos alternados: Jogador 1 (X) vs Jogador 2 (O)
- **10 segundos por turno** (5s no round 3 / sudden death)
- Tempo esgotado → jogada passa automaticamente pro oponente
- **2 turnos consecutivos de inatividade → derrota por desqualificação (W.O.)**
- Quem começa cada round é sorteado

### Regra de negócio importante

- O **servidor é autoritativo**: valida toda jogada e todo uso de habilidade via WebSocket.
  O front nunca decide sozinho se uma jogada é válida ou se alguém venceu — só envia a
  intenção e reage ao estado que o servidor confirma. Isso é motivado pelo próprio TAP
  (RF03 — gestão de sessões pelo backend).

## 3. Sistema de habilidades (o coração da inovação do jogo)

### Fluxo de seleção (draft ao longo da partida)

1. Antes da partida: jogador escolhe **2 habilidades iniciais** (de um pool de 6)
2. Sorteio da **3ª habilidade**: sistema mostra 3 cartas do pool, jogador escolhe 1 ou descarta
   → isso forma o **deck ativo (máximo 3 habilidades)** pro round que vai começar
3. Ao fim de cada round (exceto o round 3, que é o último): novo sorteio pós-rodada
   (mesma mecânica: mostra opção nova, jogador escolhe pegar ou descartar)

### Regra de uso

- Ativar uma habilidade **consome o turno** do jogador (é a ação do turno, não é "grátis")
- **Cada habilidade do deck ativo pode ser usada 1x por round — o uso reseta a cada round novo**
  (ou seja, uma habilidade "gasta" no round 1 volta a ficar disponível no round 2, se ainda
  estiver no deck)
- No mata-mata após um empate no Round 3, não há novo sorteio nem reset de habilidades:
  permanecem disponíveis apenas as habilidades que não foram usadas no Round 3.
- Nenhuma habilidade garante vitória instantânea — todas têm contra-jogo possível

### Catálogo de habilidades (pool do MVP — os 6 únicos habilitados nesta fase)

| Habilidade       | Efeito                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Bomba**        | Remove uma peça do oponente do tabuleiro (casa volta a ficar vazia)                                                |
| **Escudo**       | Bloqueia uma casa vazia por 2 rounds — oponente não pode ocupá-la                                                  |
| **Tornado**      | Move uma peça do oponente para uma casa **adjacente** vazia                                                        |
| **Buraco Negro** | Suga uma peça do oponente e a reposiciona numa casa vazia **aleatória**                                            |
| **Ampulheta**    | Reduz o tempo de jogada do oponente no próximo turno dele (10s → 5s)                                               |
| **Congelar**     | Congela uma peça do oponente por 2 rounds — ela continua visível no tabuleiro mas é ignorada no cálculo de vitória |

### Habilidades de personagem — FORA DO MVP (decisão explícita da equipe)

A tela de seleção de personagem (X, O, Triângulo, Quadrado, Estrela, Coração) existe no
GDD com uma habilidade única nomeada por personagem (ex: "Energy Strike", "Stasis Sphere").
**Isso foi decidido como pós-MVP**: no MVP, a escolha de personagem é **puramente visual/skin**
— todo mundo usa o catálogo genérico de 6 habilidades acima, independente do personagem
escolhido. Habilidades exclusivas por personagem só entram se sobrar tempo depois do MVP
funcional. **Não implementar lógica de habilidade por personagem nesta fase.**

## 4. Economia e monetização (cosmético, pós-MVP)

- Moedas virtuais ("Coins"): +50 vitória, +20 empate, +10 derrota, contabilizadas por MD3
  completa e com saldo persistente já no MVP.
- Loja cosmética 100% visual, sem vantagem competitiva: skins de símbolo, avatares/molduras,
  efeitos de jogada, estilos de tabuleiro (Neon, Cyberpunk, Metalizado)
- A loja cosmética não faz parte do MVP. O saldo persistente de Coins faz parte do MVP,
  mas a loja e os gastos de Coins ficam para uma versão posterior.

## 5. Sistema de salas e navegação

- Sala criada com **código alfanumérico de 4 caracteres**
- **Duas formas de entrar na sala** (decisão da equipe, ambas devem existir):
  1. **Link direto** (ex: `/sala/A3F9`) — melhor experiência pra convidar amigo
  2. **Campo de digitar o código manualmente** — alternativa dentro do menu
- Isso implica **React Router** no projeto (ver ARCHITECTURE.md)

### Fluxo de telas (conforme Imagem 4 do GDD)

```
Menu (Criar Sala / Inserir Código / Link direto)
  → Seleção de Personagem/Símbolo (visual)
  → Pick Inicial (escolher 2 habilidades)
  → Sorteio do Round (3 cartas, escolher 1 ou descartar → monta deck ativo)
  → Início do Match (sorteio de quem começa)
  → Tabuleiro / HUD em partida (jogada normal OU ativar habilidade, 1x por habilidade por round)
     → [fim do round 1 ou 2] → Sorteio Pós-Rodada → volta pro Sorteio do Round
     → [ninguém fechou 2 vitórias após 2 rounds] → Sorteio Pós-Rodada → Round 3 Sudden Death
       (timer 5s, UI de alerta, deck mantido)
     → [Round 3 empatado] → Mata-mata com novos tabuleiros, sem novo sorteio ou reset de
       habilidades, alternando o jogador inicial até haver um vencedor
     → [placar final 2x0 ou 2x1] → Tela de Resultado
  → Resultado Final (vencedor, coins, botões "Revanche" ou "Voltar ao Lobby")
```

## 6. Stack técnica (decisão fechada)

- **React + TypeScript + Vite**
- **Tailwind CSS** (estilização) + **Framer Motion** (animações)
- **Zustand** (estado global)
- **Socket.io-client** (comunicação em tempo real com o backend Java Spring Boot)
- **Howler.js** (efeitos sonoros)
- **React Router** (rotas — necessário por causa do link direto de sala)
- **Deploy:** Vercel (Hobby na fase acadêmica; ver decisions-and-ways-of-working para o
  porquê dessa escolha em vez de AWS)

## 7. Restrições do projeto (vêm do TAP — não são opcionais)

- **RF01:** comunicação em tempo real via WebSocket, dois jogadores simultâneos
- **RF02:** interface responsiva (desktop + mobile) e instalável como PWA
- **RF03:** backend gerencia estado das salas, reconexões e condições de vitória/empate
  (front não decide isso sozinho)
- **RNF01:** baixa latência nas trocas de mensagem
- **RNF02:** compatível com Chrome, Firefox, Safari, Edge
- **R02 (risco do TAP):** gargalo de integração front×back×WebSocket — mitigação é definir o
  contrato de eventos/API **antes** de implementar a integração (ver ARCHITECTURE.md,
  seção de contrato de socket — precisa ser validado com o time de back antes de codar)
- **Prazos:** Marco 4 (27/10) = lógica core + WebSocket funcionando · Marco 5 (03/11) = PWA +
  testes · Marco 6 (10/11) = publicação em produção

## 8. Prioridade de implementação (MVP primeiro, sempre)

1. Tabuleiro 4×4 + lógica de vitória (alinhar 4) funcionando localmente (sem rede ainda)
2. Conexão WebSocket + sala com código alfanumérico de 4 caracteres (link + manual)
3. Sincronização de jogadas em tempo real entre 2 jogadores
4. Timer de turno (10s) com W.O. automático
5. Sistema de MD3 (placar, round neutro em empate, round 3 sudden death)
6. Sistema de habilidades (pick inicial, sorteio, deck ativo, uso 1x/round)
7. PWA (instalável, responsivo mobile)
8. Polimento visual (neon, animações, sons)
9. **Pós-MVP / stretch:** habilidades por personagem e loja cosmética. A economia de Coins
   persistente faz parte do MVP.

Qualquer item da lista 9 (pós-MVP) que alguém propuser implementar antes do item 8 estar
pronto deve ser questionado — é desvio de escopo do que foi combinado com o time.
