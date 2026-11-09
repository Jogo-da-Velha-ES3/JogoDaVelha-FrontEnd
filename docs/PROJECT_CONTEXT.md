# PROJECT_CONTEXT.md — Jogo do Velho (nome provisório) — Front-end

> Documento de contexto para o Claude Code. Leia isto antes de qualquer tarefa.
> Projeto acadêmico (Fatec-SP, Engenharia de Software III). Front-end liderado por Rafael
> (líder técnico de front, Equipe 03).
>
> **Fonte da verdade:** a _Especificação de Requisitos do Sistema (ERS) — MVP 1 — V2_
> (08/10/2026). Este documento resume a ERS do ponto de vista do front e acrescenta as decisões
> de interface fechadas com a equipe. Os códigos entre colchetes (ex: `[RF-ARN-03]`) são os
> identificadores da ERS — use-os em issues, PRs e comentários de código. Quando a ERS e este
> documento divergirem, vale a ERS. O que ainda precisa ser confirmado com o back está marcado
> como **[A VALIDAR COM O BACK]**.
>
> Também incorpora o documento de **revisão de telas** da equipe (06/10/2026): login, recuperação
> de senha, preços e a forma de mostrar as habilidades na Preparação.

## 1. O que é o jogo

Jogo da Velha online multiplayer em tempo real, num tabuleiro 4×4, com um sistema de
habilidades especiais (deck leve, montado a cada partida) que transforma o jogo clássico em algo
estratégico e competitivo, **sem pay-to-win**.

- **Plataforma:** PWA instalável (desktop + mobile), em **modo paisagem** `[RNF-ARQ-03]`
- **Público-alvo:** jogadores casuais, partidas de 2 a 5 minutos
- **Estética:** neon de alto contraste (base UNO Steam), com toques de Mortal Kombat (tela de VS,
  anúncios gritados, morte súbita intensa)
- **Multiplayer:** 2 jogadores por sala, em dispositivos diferentes, via WebSocket + STOMP
- **Atores** (ERS 1.3): Jogador Host (cria a sala), Jogador Guest (entra com o código), Servidor
  Autoritativo e o NPC espectador **Vitão** (entra no MVP 1 atrás de uma flag — ver seção 9)

### Material de referência visual

- Esboço de telas (fluxo, wireframes, estados da Arena):
  https://claude.ai/artifact/XvxuwC5xwRiCofBbH9oj7H
- Estilos de personagem (o time escolheu o **Estilo A — Letreiro neon**):
  https://claude.ai/artifact/4WycaXbBCDFdH288SQRBzS
- Os dois links são privados: cada pessoa precisa ser convidada pelo menu Share.

## 2. Arquitetura geral e regra de ouro

- **Back-end:** Java Spring Boot (deploy no Render), PostgreSQL (Neon), Redis (Upstash)
- **Comunicação:** REST para conta, perfil, Coins e loja; **WebSocket com subprotocolo STOMP**
  para sala, preparação, partida e pós-jogo, com latência alvo abaixo de 200ms `[RNF-ARQ-01]`
- **Servidor autoritativo** `[RNF-ARQ-02]`: toda validação de regra, temporização, vitória e
  crédito de Coins acontece no back. O front é uma camada visual reativa: envia a **intenção**
  e só atualiza o estado quando o servidor confirma. **Nunca** atualizar otimisticamente o
  resultado de uma jogada, habilidade, compra ou placar.
- O timer de turno é do servidor: ele envia timestamps e o front só desenha a contagem
  `[RF-ARN-02]`.

## 3. Conta e perfil

- **Conta própria, sem convidado e sem Google** no MVP 1. O back já implementou cadastro e login:
  - Cadastro com **3 informações**: nome de usuário, e-mail e senha.
  - **E-mail único** e **nome de usuário único**, comparado sem diferenciar maiúsculas de
    minúsculas.
  - **Login com e-mail ou nome de usuário** + senha (como no GitHub).
  - Não existe ID público visível para o jogador.
- **Manter conectado:** a sessão continua entre os acessos, com um botão de **Sair** claro.
- **Recuperação de senha:** "Esqueci minha senha" → o jogador informa o e-mail → recebe um link →
  o link abre uma tela com "Nova senha" e "Confirmar nova senha" → volta para o login.
- **Perfil** `[RF-PRF-01]` `[RF-PRF-02]`:
  - Nome de usuário (apelido) editável, respeitando a unicidade
  - Estatísticas: total de partidas, vitórias, taxa de vitória (%) e **maior sequência de
    vitórias**. A sequência é interrompida por empate ou derrota; vitória por W.O. conta como
    vitória.
  - Coleção: personagens e habilidades desbloqueados
- **Personagem favorito:** aparece animado no centro do Hub e como avatar no topo `[RF-HUB-02]`
  `[RF-HUB-03]`.

## 4. Personagens

- Seis personagens: **X, O, Triângulo, Quadrado, Estrela, Coração**. As peças no tabuleiro são o
  próprio personagem, em versão simplificada.
- **Todo jogador novo ganha X e O** `[RN-LOJ-01]`. Os outros 4 são comprados na Loja, com
  preços escalonados (seção 8).
- **Personagens não repetem na mesma partida** `[RN-DRAFT-01]`: a escolha é simultânea; quem tiver
  o registro confirmado primeiro no servidor leva, e o personagem fica bloqueado na tela do outro
  na hora, com a etiqueta do nome de quem reservou `[RF-DRAFT-02]`.
- No MVP o personagem é **puramente visual**: não existe habilidade exclusiva por personagem.

### Direção de arte (decidido)

- **Estilo A — Letreiro neon:** personagens feitos de "tubos de neon", rosto de traços (sem olhos
  redondos), brilho e leve cintilação. Referência: X com olhar de canto e O com visor que varre de
  um lado para o outro (página de estilos). Os outros 4 personagens ainda precisam ser desenhados
  nesse estilo.
- **2.5D:** SVG animado com Framer Motion/CSS. Nada de 3D (Three.js) no MVP.
- Cada personagem precisa de: versão grande (seleção, Hub, VS, Resultado), avatar e peça do
  tabuleiro legível em ~40px.
- **Cor do lado = cor do personagem.** Como personagens não repetem, cada jogador usa a cor do
  próprio personagem na interface (faixa, timer, peças, cards):

  | Personagem | Cor       |
  | ---------- | --------- |
  | X          | `#b07cff` |
  | O          | `#2ee6d6` |
  | Triângulo  | `#8be04e` |
  | Quadrado   | `#ff9a3c` |
  | Estrela    | `#ffd84a` |
  | Coração    | `#ff5ca8` |

- Cores de sistema: **vermelho `#ff2d3d` só para perigo** (morte súbita, erros, avisos de W.O.),
  dourado `#ffd257` para Coins, botões principais em branco `#f4f2ff`.

## 5. Habilidades

### Catálogo (10 habilidades) `[RF-ARN-03]`

| Habilidade         | Tipo      | Efeito                                                                                                                             |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Bomba**          | Ofensiva  | Remove 1 peça do oponente, desocupando a casa                                                                                      |
| **Escudo**         | Defensiva | Bloqueia 1 casa vazia por 2 turnos contra marcações do oponente                                                                    |
| **Ampulheta**      | Ofensiva  | Reduz o tempo do próximo turno do oponente para 5s                                                                                 |
| **Tornado**        | Ofensiva  | Move 1 peça do oponente para uma casa adjacente vazia                                                                              |
| **Buraco Negro**   | Ofensiva  | Move 1 peça do oponente para uma casa vazia aleatória (RNG do servidor)                                                            |
| **Congelar**       | Ofensiva  | Congela 1 peça do oponente por 2 turnos: ela fica na tela, mas não conta para a vitória                                            |
| **Campo de Força** | Defensiva | Fica ativo por 2 turnos e anula 100% da primeira habilidade ofensiva recebida, sendo consumido. Nada é rebatido `[RN-ARN-04]`      |
| **Silêncio**       | Ofensiva  | Impede o oponente de usar habilidades no próximo turno dele                                                                        |
| **Troca Rápida**   | Movimento | Move 1 peça **própria** para uma casa adjacente vazia                                                                              |
| **Reforço**        | Defensiva | Protege 1 peça própria contra remoção ou deslocamento (Bomba, Tornado, Buraco Negro) por 2 turnos. **Não** protege contra Congelar |

- Habilidades ofensivas que o Campo de Força anula: Silêncio, Bomba, Tornado, Buraco Negro,
  Congelar e Ampulheta.
- **Tornado e Troca Rápida sem casa adjacente vazia** `[RN-ARN-05]`: a habilidade é executada sem
  efeito, é consumida e o turno termina normalmente.

### Inventário e compra `[RN-LOJ-01]` `[RN-LOJ-02]`

- Todo jogador novo tem as habilidades **Bomba, Escudo e Ampulheta**.
- Comprar uma habilidade é comprar o direito de escolhê-la como **habilidade inicial** na
  Preparação, sem depender da sorte. Ex: quem compra Tornado passa a ter 4 opções e continua
  escolhendo só 2.
- O sorteio usa o **catálogo completo**, menos o deck atual, as 2 iniciais e as cartas que o
  jogador já escolheu em sorteios anteriores da partida, e pode trazer habilidades que ele ainda
  não comprou `[RF-DRAFT-03]` (regra do back, 07/11).
- **Nomenclatura na interface:** "Habilidades Iniciais" (a ERS também chama de "fixas" em
  `[RF-DRAFT-01]`; é a mesma coisa).

### Deck da rodada: 3 habilidades `[RN-DRAFT-02]`

> Em 07/11 o back (Victor) mudou o sorteio a partir do round 2: a carta nova entra no lugar de
> uma habilidade que o jogador escolhe, e o tempo esgotado deixa o deck como está. A equipe segue
> o back (FE-50, 08/11). A ERS falava em "2 iniciais + 1 sorteada" em todo round.

1. **Iniciais (fixas):** na Preparação, o jogador escolhe 2 habilidades entre as que já
   desbloqueou.
2. **Sorteio:** **no início de cada round**, o servidor mostra 3 cartas visíveis
   `[RN-DRAFT-03]` e o jogador escolhe 1 em **8 segundos**. Esse tempo não faz parte dos 20s da
   Preparação.
   - **Round 1:** a carta escolhida completa o deck (2 iniciais + 1 sorteada). Sem escolha, uma
     carta é escolhida automaticamente `[RN-DRAFT-05]`.
   - **Do round 2 em diante:** o jogador escolhe a carta nova e depois qual habilidade do deck
     sai, que pode ser qualquer uma das 3, inclusive uma inicial. **Sem escolha, o deck fica como
     está.** O botão "Manter meu deck" só esconde as cartas: o servidor não recebe nada e mantém
     o deck quando o tempo acaba.
3. O deck de cada round tem exatamente 3 habilidades e continua de um round para o outro.

### Regras de uso

- Cada habilidade do deck pode ser usada **no máximo 1 vez por rodada** `[RN-ARN-02]`.
- Usar uma habilidade **consome a ação do turno**: não dá para marcar peça e usar habilidade no
  mesmo turno, nem usar 2 habilidades `[RN-ARN-02]`.
- **O deck do oponente é oculto:** você só descobre uma habilidade dele quando ela é usada
  (decisão de interface).
- **Mira só com alvo que tem efeito (decidido em 29/10, FE-27):** a peça com Reforço não é alvo de
  Bomba, Tornado nem Buraco Negro, e a peça sem casa vizinha livre não é alvo de Tornado nem de
  Troca Rápida. A carta que fica sem nenhum alvo aparece desabilitada, com "Sem alvo". O
  servidor continua aceitando esses alvos (`[RN-ARN-05]`: executa sem efeito).

### Duração dos efeitos `[RN-ARN-07]`

- Cada ação conta como 1 turno: jogada de peça, uso de habilidade ou turno perdido por tempo.
- Efeitos de 2 turnos (Escudo, Congelar, Campo de Força, Reforço) começam com contador 2 e perdem
  1 **ao final de cada turno de qualquer jogador**, depois da verificação de vitória. Na prática,
  o efeito dura até o fim do próximo turno do oponente.
- Exemplo: Jogador 1 usa a habilidade (turno 1), Jogador 2 joga uma peça (turno 2) → o efeito
  expira ao final do turno 2.
- A interface mostra o contador nas casas e peças afetadas.

## 6. Regras da partida

### Tabuleiro e vitória

- Grade **4×4**; vence o round quem alinhar **4 peças** próprias (horizontal, vertical ou
  diagonal). Tabuleiro cheio sem alinhamento = round empatado `[RF-ARN-04]`.
- A verificação acontece a cada jogada ou alteração por habilidade, no servidor.
- **Peças congeladas não contam** para formar a linha `[RN-ARN-08]`. Ao final de cada ação, o
  servidor verifica a vitória de quem agiu e depois a do oponente, antes de reduzir os contadores.
  Se uma linha já estava formada com uma peça congelada e o congelamento expira, o dono da linha
  vence na verificação seguinte, desde que o oponente não tenha vencido antes nem desfeito a linha.
- Estados visuais da casa `[RF-ARN-01]`: vazia, peça do P1, peça do P2, bloqueada por Escudo,
  peça congelada, peça com Reforço, alvo de habilidade, linha vencedora.

### Melhor de 3 (MD3) — regra da ERS `[RF-ARN-05]`, a mesma do back

> Em 18/10 o front propôs que o round 3 acontecesse sempre (inclusive em 1×0). O back manteve a
> regra da ERS, explicada pelo Victor com o desempate do truco paulista, e a equipe decidiu seguir
> o back em 06/11. O servidor decide o placar; o front só mostra.

- A partida tem **até 3 rounds**. **Depois do round 2, quem estiver na frente vence:** 2×0, ou
  1×0 quando um dos dois rounds empatou.
- **Round 3 = Morte Súbita**, só com o placar igual depois do round 2 (1×1 ou 0×0): timer de
  **5s por turno** e interface de alerta vermelho.
- Quem vencer a Morte Súbita leva a partida. Se ela empatar, é **empate absoluto** `[RN-ARN-06]`:
  os dois recebem +20 Coins. **Não existe mata-mata.**

  | Depois dos rounds 1 e 2 | Round 3               | Final                     |
  | ----------------------- | --------------------- | ------------------------- |
  | 2×0                     | não tem               | vitória 2×0               |
  | 1×0 (um round empatou)  | não tem               | vitória 1×0               |
  | 1×1                     | alguém vence / empata | vitória 2×1 / empate abs. |
  | 0×0 (dois empates)      | alguém vence / empata | vitória 1×0 / empate abs. |

- **Quem começa:** no round 1, sorteado pelo servidor; a partir do round 2, alterna a cada round.
- Placares finais possíveis: 2×0 ("VITÓRIA IMPECÁVEL"), 2×1, 1×0, empate absoluto ou W.O.

### Turnos, timer e W.O.

- **10 segundos por turno** (5s na Morte Súbita e sob efeito de Ampulheta) `[RF-ARN-02]`.
- O tempo corre do início do turno até a jogada ou o uso de habilidade, **sem pausas**
  `[RN-ARN-03]`. O menu de pausa é só um overlay: o timer continua.
- Tempo estourado → a vez passa para o oponente.
- **3 estouros consecutivos → derrota da partida por W.O.** `[RN-ARN-01]`. O contador **não zera
  na troca de round**; só zera quando o jogador faz uma jogada ou usa uma habilidade. A interface
  avisa a cada estouro quantos faltam ("1/3", "2/3").

### Coins da partida `[RF-POS-02]`

| Resultado         | Coins           |
| ----------------- | --------------- |
| Vitória           | +50             |
| Empate (absoluto) | +20 para cada   |
| Derrota           | +10             |
| Vitória por W.O.  | +30 ao vencedor |
| Derrota por W.O.  | 0               |

O crédito é feito pelo back; o front só anima a atualização na tela de Resultado.

### Desconexão (fechado com o back em 15/10)

A ERS não define a regra; o back decidiu usar a mesma do W.O. por tempo `[RN-ARN-01]`:

- **Sem contagem especial:** os turnos de quem caiu continuam correndo; cada turno perdido é um
  estouro e **3 seguidos dão W.O.** O contador não zera na troca de round.
- **Quem ficou** vê "Oponente desconectado" com os estouros dele (x/3), a partir de
  `PLAYER_DISCONNECTED` / `PLAYER_RECONNECTED` (pedido ao back em 15/10). O aviso fica só com a
  informação, numa linha; a piada da queda é do Vitão, no balão (02/11).
- **Quem caiu** vê "Reconectando…", não consegue jogar até voltar e volta para o mesmo ponto da
  partida pelo `ROOM_SNAPSHOT` completo (o estado está no servidor).
- **No Resultado,** cair conta como sair da sala e cancela a revanche (no back,
  `ROOM_CLOSED` com `REMATCH_DISCONNECTED`).

## 7. Salas, preparação e pós-jogo

### Salas `[RF-HUB-04]` `[RF-HUB-05]` `[RF-SAL-01]` `[RF-SAL-02]` `[RF-SAL-03]` `[RN-SAL-01]`

- Só salas privadas. **Código numérico de 4 dígitos**, gerado pelo back.
- **Criar Sala:** requisição à API → o Host vai para a Sala de Espera, com o nome/código em
  destaque ("Sala de [Apelido]" / "Código: 4821") e o status "Aguardando adversário...".
- **Entrar com Código:** modal com **4 campos numéricos individuais**, com suporte a colar. O botão
  "ENTRAR" só habilita com os 4 dígitos preenchidos `[RN-HUB-01]`. Se a sala não existir, estiver
  lotada ou a partida já tiver começado, mostra erro em vermelho (ex: "Sala 4821 não encontrada") e
  mantém os campos abertos.
- **Link direto** com o código embutido (ex: `/sala/4821`).
- Sala de Espera do Host: botões **Copiar Código** e **Copiar Link / Compartilhar** (usa a API
  nativa de compartilhamento do celular quando existir).
- Máximo de **2 jogadores** por sala; o servidor rejeita o terceiro.
- **Match feito:** quando o segundo jogador entra, os dois veem "MATCH FEITO! [Nome do Adversário]
  entrou!" e uma contagem automática de **3s** até a Preparação.

### Preparação `[RF-DRAFT-01]` `[RN-DRAFT-04]`

- Uma tela com **2 etapas**: (1) personagem, (2) 2 habilidades iniciais.
- **Timer geral de 20 segundos** para as duas etapas, com o status do oponente em tempo real
  ("escolhendo…" / "pronto").
- Se o tempo acabar sem escolha, o sistema escolhe aleatoriamente entre os personagens e
  habilidades elegíveis do jogador.
- Personagens não comprados aparecem com cadeado; o personagem escolhido pelo oponente aparece
  bloqueado com o nome dele.
- **Habilidades:** aparecem **só as desbloqueadas**. As que faltam não aparecem com cadeado (para
  não poluir a tela nem estragar a surpresa do sorteio); no lugar, um aviso: "Quer mais opções de
  habilidades? Desbloqueie novas habilidades na Loja."

### Pós-jogo `[RF-POS-01]` `[RF-POS-03]` `[RN-POS-01]` `[RN-POS-02]` `[RN-POS-03]`

- Tela de Resultado: comemoração do vencedor, placar final ("VITÓRIA IMPECÁVEL" no 2×0), indicação
  de W.O. quando for o caso e animação dos Coins creditados.
- Botões **Revanche** e **Voltar ao Lobby**.
- **Revanche:** quem pede espera até **15 segundos**. Se o outro não aceitar a tempo, fechar o app
  ou voltar ao Lobby, o pedido é cancelado, a sala é encerrada e quem pediu é avisado e levado ao
  Hub.
- Revanche aceita pelos dois: a sala é mantida e o fluxo **reinicia do zero na Preparação**
  (personagem, iniciais e sorteios novos).
- **Voltar ao Lobby** encerra a sala; o oponente é avisado em tempo real e o botão de revanche dele
  é desabilitado na hora.
- **Quem fica no Resultado (decidido em 15/10, FE-29):** só quem **pediu** a revanche é levado ao
  Hub quando ela é cancelada (recusa, 15s sem resposta ou saída do outro). Quem não pediu continua
  no Resultado para ver placar e Coins, com o aviso ("O oponente saiu da sala.", "O tempo para
  aceitar a revanche acabou.") e a revanche desabilitada; sai pelo "Voltar ao Lobby". Se os dois
  pedirem ao mesmo tempo, vale como aceite. No back, o pedido chega no `rematch` do snapshot e o
  cancelamento é a própria sala encerrada (`ROOM_CLOSED` com `REMATCH_DECLINED`,
  `REMATCH_EXPIRED`, `RETURN_TO_LOBBY` ou `REMATCH_DISCONNECTED`).
- **Sair antes da partida (decidido em 06/11):** sair no MATCH FEITO ou na Preparação encerra a
  sala, sem partida e sem Coins (`ROOM_CLOSED` com `PLAYER_LEFT`); quem ficou volta ao Hub com
  "O oponente saiu da sala.". Durante a partida, sair é desistência (W.O. para o outro).
- **Cor da derrota no Resultado (decidido na FE-15):** a derrota e a derrota por W.O. aparecem em
  vermelho (título, borda do painel e etiqueta W.O.). É uma exceção à regra de "vermelho só para
  quem está em perigo" usada na Arena (§9), decidido na FE-15. A vitória usa a cor do personagem e
  o empate absoluto fica neutro.

## 8. Hub, Loja e economia

### Hub `[RF-HUB-01]` a `[RF-HUB-06]`

- Menu lateral fixo com as abas **Loja**, **Jogar** e **Perfil**; ao abrir o jogo, o foco é
  **Jogar**.
- Topo: avatar do personagem ativo, apelido editável e saldo de Coins.
- Centro: personagem favorito animado.
- Botões principais: **Criar Sala** (destaque) e **Entrar com Código**.
- Botões secundários: **Como Jogar** (modal navegável de regras) e **Instalar App** (gatilho de
  instalação do PWA).

### Loja `[RF-LOJ-01]` `[RF-LOJ-02]` `[RN-LOJ-03]` `[RN-LOJ-04]`

- Abas: **Personagens**, **Habilidades**, **Cosméticos**. No MVP 1, Cosméticos aparece como
  "em breve" (skins, molduras, efeitos e estilos de tabuleiro ficam para depois).
- Clicar numa habilidade abre um modal com a **demonstração em loop** do efeito num mini-tabuleiro.
- Compra permitida quando o saldo é suficiente; o inventário e o saldo atualizam assim que o back
  confirma.
- **Compra de Coins (simbólica):** o jogador pode "comprar" pacotes de Coins, mas não existe
  transação real nem cadastro de cartão, e o crédito é imediato. Tudo continua possível de obter
  só jogando, e nenhum item garante vitória (política zero pay-to-win).
- **Saldo inicial: 0 Coins.** Preços (revisão de telas, 06/10):

  | Item                                | Preço  |
  | ----------------------------------- | ------ |
  | X e O                               | grátis |
  | Quadrado                            | 400    |
  | Triângulo                           | 500    |
  | Coração                             | 600    |
  | Estrela                             | 700    |
  | Cada habilidade (as 7 não iniciais) | 350    |

- Pacotes simbólicos de Coins (os do back, fechados na FE-49): **100** (R$ 4,99), **500**
  (R$ 19,99) e **1000** (R$ 34,99). O modal Comprar Coins (FE-32) mostra o preço em reais em cada
  pacote, junto do aviso fixo de que nada é cobrado (decidido em 08/11). Ele abre pela Loja e pelo
  saldo do topo do Hub.

## 9. Interface

### Telas (8)

1. **Acesso** — entrar / criar conta (e-mail e senha)
2. **Hub** — menu lateral (Loja · Jogar · Perfil), Criar Sala, Entrar com Código
3. **Loja** — Personagens, Habilidades, Cosméticos (em breve), Comprar Coins
4. **Perfil** — apelido, estatísticas, coleção
5. **Sala de Espera** — código, copiar código, copiar link/compartilhar, os dois jogadores
6. **Preparação** — 2 etapas (personagem → 2 iniciais), timer de 20s
7. **Arena** — a partida inteira numa tela só, que muda de estado
8. **Resultado** — vencedor, placar, Coins, revanche

Modais globais: Entrar com Código, Como Jogar, Comprar Coins, Configurações (música, efeitos,
vibração, Vitão, volume da voz e filtro de palavrões), Sair da partida, Conexão perdida, Gire o
celular.

### Fluxo

```
Abrir o jogo → [sem sessão] Acesso → Hub (Jogar; abas Loja / Perfil)
  → Criar Sala ou Entrar (código digitado / link) → Sala de Espera
  → MATCH FEITO (3s) → Preparação (personagem → 2 iniciais, 20s)
  → Arena: Confronto (VS)
     → para cada round: sorteio da 3ª habilidade (8s) → jogo
     → fim do round → próximo round, se a partida não acabou
       (round 3 = Morte Súbita, 5s por turno)
  → Resultado (vitória, derrota, empate absoluto ou W.O.)
     → Revanche aceita (até 15s) → volta para a Preparação, do zero
     → Voltar ao Lobby → Hub (sala encerrada)
```

### Paisagem

- Mesmo layout em celular deitado e monitor.
- O iPhone não permite travar a orientação, então existe o modal **"Gire o celular"**, que
  aparece sempre que a tela estiver em pé.
- Altura útil no celular deitado: ~330–390px. O tabuleiro ocupa a altura toda.
- O teclado cobre metade da tela: em login, cadastro e código, campo e botão ficam na metade de
  cima.
- Respeitar `env(safe-area-inset-left/right)`.

### Arena

- Coluna esquerda: pausa, placar do round, faixa do oponente, espaço reservado do Vitão, faixa do
  jogador. Centro: tabuleiro 4×4. Coluna direita (polegar direito): aviso do turno, timer e deck.
- Estados: Confronto (VS), sorteio da 3ª habilidade (8s), início do round (quem começa;
  "MATCH POINT" quando alguém já tem 1 vitória), sua vez, vez do oponente, turno perdido (aviso
  "1/3", "2/3"), mirando habilidade, habilidade do oponente (animação + aviso, inclusive "anulada
  pelo Campo de Força" e "sem efeito"), sob Ampulheta, silenciado, fim do round, entrada da Morte
  Súbita, Morte Súbita, oponente desconectado, pausa.
- **Ordem do início do round (decidido em 24/10):** sorteio da 3ª habilidade → apresentação do
  round (2,5s: quem começa e "MATCH POINT", ou a entrada da Morte Súbita no round 3) → primeiro
  turno. O servidor só manda o primeiro `TURN_START` depois da apresentação, para ela não comer o
  tempo do turno. O back também segura 3s no "MATCH FEITO", 3s no VS e 2,5s no fim do round
  (contrato V2).
- **Timer do turno (decidido em 16/10):** sempre mostra o turno atual, inclusive o do oponente,
  com o prazo do `TURN_START`. Na sua vez fica na sua cor e vermelho nos últimos 3s; na vez do
  oponente fica na cor dele, com o texto "Vez do oponente" e sem o vermelho (o tempo dele acabando
  não é perigo para você). Assim também dá para ver o efeito da Ampulheta (turno dele com 5s).
- **Turno perdido e W.O. (decidido em 16/10):** o banner aparece quando chega o `TURN_TIMEOUT` ou o
  `MATCH_END` do servidor, nunca quando o timer do front chega a 0. Vermelho só para quem está em
  perigo; para o outro jogador, a cor do personagem de quem é o aviso.

  | Situação                  | Quem vê      | Título                | Subtítulo (sem filtro / com filtro)                                     | Cor                   |
  | ------------------------- | ------------ | --------------------- | ----------------------------------------------------------------------- | --------------------- |
  | 1º estouro                | quem estoura | TEMPO ESGOTADO!       | Tá dormindo na rede?! · 1/3 / É, cê perdeu a vez · 1/3                  | vermelho              |
  | 2º estouro seguido        | quem estoura | TEMPO ESGOTADO!       | Acorda pra vida, mané! Mais um e é W.O. · 2/3 / Mais um e é W.O.! · 2/3 | vermelho              |
  | 1º/2º estouro do oponente | o outro      | OPONENTE PERDEU A VEZ | 1/3 ou 2/3                                                              | cor do oponente       |
  | 3º estouro (W.O.)         | quem estoura | DERROTA POR W.O.      | Assoprou a velhinha errada, hein… entendeu? / Que desperdício de tempo… | vermelho              |
  | 3º estouro do oponente    | o outro      | VITÓRIA POR W.O.      | O oponente… arregou! / O oponente abandonou a partida                   | cor do seu personagem |

  Os textos vêm da voz do jogo (FE-40, `src/constants/texts.ts`). O título do W.O. de quem estoura
  passou de "W.O.!" para "DERROTA POR W.O.", igual ao Resultado: a piada tomou o lugar do
  "Derrota" que ficava no subtítulo. Com a FE-43 (decidido em 02/11), a piada sai do banner e vai
  para o balão do Vitão; o banner fica com o título e o x/3 (ver "O Vitão é a voz do jogo", abaixo).

  **Onde fica (corrigido em 02/11):** o aviso dos estouros 1/3 e 2/3 fica na coluna direita, sem
  cobrir o tabuleiro (antes ficava no topo, por cima da primeira fileira e da faixa do oponente).
  Ele divide o lugar com o aviso de habilidade: aparece só o mais novo, porque os dois juntos
  empurram o deck para fora da tela no celular deitado. O x/3 continua na faixa do jogador.

  No W.O., a Arena segura o banner por **2 segundos** e só então vai para o Resultado. Isso não
  atrasa nada no servidor: a partida e os Coins já foram resolvidos no `MATCH_END`, e a janela da
  revanche só conta a partir do pedido. Quem reconecta nesse meio-tempo cai direto no Resultado.

- **Empate absoluto (decidido em 17/10):** se o round 3 termina com o placar igual, o fim do round
  já anuncia "EMPATE ABSOLUTO" (regra de exibição, como o "MATCH POINT" `[RN-ARN-06]`), com
  "É… ninguém levou." ou o placar final (1×1). É **um banner só**: quando chega o
  `MATCH_END`, a Arena segura **2 segundos**, como no W.O., e o subtítulo troca para "+20 Coins
  para cada" (Coins vindos do servidor); então vai para o Resultado.

- **Habilidade resolvida (decidido em 29/10, FE-27):** o efeito aparece na casa (ou no centro do
  tabuleiro, nas habilidades sem casa) por 1s, na **cor de quem usou**; anulada, com o ícone do
  Campo de Força na cor de quem tinha o campo; sem efeito, neutro. O aviso fica 2,5s na coluna
  direita, sem cobrir o tabuleiro: toda habilidade do oponente ("Oponente usou Bomba") e as minhas
  só quando anuladas ou sem efeito ("Anulada pelo Campo de Força!", "Sem efeito!").
  Cada habilidade tem a sua animação (FE-47); no Congelar, o anel fica na cor de quem usou e os
  cristais em azul-gelo, a cor da peça congelada (decidido em 30/10).

### Morte Súbita: pacote de pressão

- **Entrada:** tela treme e pisca em vermelho, sirene, "MORTE SÚBITA" bate na tela, fitas de
  perigo entram por cima e por baixo. As fitas ficam só na entrada (~2s), para não cobrir a Arena
  durante o round.
- **Em jogo:** bordas pulsando como batimento cardíaco, timer gigante que "bate" a cada segundo,
  tabuleiro com borda em brasa e tremendo.
- **Som:** trilha acelerada, batida de coração que acelera com o timer, tique-taque nos 3 últimos
  segundos. **Vibração** nos 3 últimos segundos (`navigator.vibrate`; o iPhone não suporta).
- Sempre respeitar `prefers-reduced-motion`.

### Vitão (NPC espectador) e personalidade do jogo

- A ERS prevê o Vitão reagindo à partida, inclusive numa versão "Diabo" na Morte Súbita.
- **Decisão (15/10, com o GP):** com um terceiro grupo ajudando no front, o Vitão **entra no MVP 1**,
  junto com a sonoplastia e a voz do jogo (cards FE-37 a FE-48, grupo WBS-11 — Personalidade).
  Antes disso (até 14/10), o front só reservava o espaço dele.
- **Como ele é:** a **cabeça do Vitão em caricatura** (desenho colorido com expressões), parada no
  espaço reservado da Arena: respira, reage a cada fala e fala besteiras num balão, **com a voz do
  Rafik**. Na Morte Súbita vira a versão "Diabo".
- **Só a cabeça (decidido em 02/11):** sem corpo e sem andar no MVP 1. O corpo de bonequinho feito
  na FE-41 fica na branch `feat/vitao-corpo`, para depois, se sobrar tempo.
- **O Vitão é a voz do jogo (decidido em 02/11):** o narrador e o Vitão comentavam os mesmos
  momentos com piadas diferentes. Agora são um só, e o humor fica no Vitão:
  - Os banners e avisos ficam só com a informação ("TEMPO ESGOTADO! · 1/3"); as piadas do Rafik
    (FE-40) vão para o balão do Vitão (FE-43).
  - **A única voz do jogo é a do Rafik.** Nos momentos com gravação (habilidade do oponente,
    estouros, fim do round, Morte Súbita, W.O., match point, desconexão), o Vitão mostra a frase
    no balão e fala com o áudio dela (FE-48). Jogadas de peça e a minha habilidade não têm
    gravação: ele comenta só por escrito. Os anúncios gravados ("Round 1", "Confronto", "Empate
    absoluto") tocam só a voz, porque o banner já mostra o título.
  - O Resultado não tem o Vitão: a piada continua como subtítulo e a voz do Rafik toca ali.
  - **Vitão desligado nas Configurações:** some o balão e a voz; os banners continuam só com a
    informação.
  - Até a FE-43, as piadas ainda aparecem nos banners e o Vitão usa falas provisórias.
- **Caricatura em vez de foto (decidido em 25/10, FE-41):** lê melhor em tamanho pequeno e combina
  com o tom do jogo. Expressões: normal, rindo, debochado, bravo, muito bravo, surpreso, dormindo e
  Diabo, todas no mesmo ângulo e enquadramento, em WebP de 256px (~15 KB cada), em
  `src/features/vitao/assets/`. Para casar com o neon, o contorno brilhante é feito no código
  (FE-42), sem mexer na arte. Em ~48px, normal, bravo e muito bravo ficam parecidos: na reação de
  raiva, usar o "muito bravo".
- **Regras:** falas em arquivo editável, no máximo uma a cada 6s (menos nos momentos grandes, logo
  abaixo), balão que nunca cobre o tabuleiro, linguagem sem filtro por padrão (com opção de filtrar
  nas Configurações).
- **Quando ele fala (decidido em 31/10, FE-44):** comenta só 1 em cada 3 jogadas de peça (sorteio);
  habilidades, estouros de tempo e os momentos grandes (fim do round, entrada da Morte Súbita e
  W.O.) ele sempre comenta. Os momentos grandes falam na hora, mesmo dentro da pausa de 6s: tomam o
  lugar da fala atual (com a voz, cortam o áudio dela) e a pausa recomeça a partir deles. Esperar a
  pausa acabar pareceria atraso. Na Morte Súbita ele fica Diabo o tempo todo, não só quando fala.
- **Flag:** a `VITAO_ENABLED` foi ligada em 31/10, com a FE-44, para o time ver o Vitão enquanto
  termina falas (FE-43), animação (FE-42) e voz (FE-48). A FE-45 (gravar a voz do Vitão) foi
  substituída pela FE-48 em 02/11.
- **Autorização:** o uso da imagem, das falas e da voz do Vitão num link público precisa do ok
  dele, registrado na FE-41. O Vitão autorizou tudo em 25/10: imagem, desenho, falas e voz. A voz
  que vai ao ar é a do Rafik (02/11).
- **Voz do jogo (FE-40, feita em 31/10):** além do Vitão, os textos da interface (anúncios
  gritados, banners, erros, avisos, Resultado) seguem um guia de tom com humor de narrador estilo
  Mortal Kombat/Cuphead (`docs/VOICE_GUIDE.md`) e ficam num arquivo só, `src/constants/texts.ts`.
  As piadas são as falas que o Rafik gravou: sem filtro é a versão [E] e, com o filtro das
  Configurações, a [C]; a piada sem versão limpa some. Hoje elas entram como subtítulo, sem tirar a
  informação (placar, 1/3, os segundos da Morte Súbita); com a FE-43, passam para o balão do Vitão
  (acima). Ficaram só para o áudio as explicações das 10
  habilidades e a narração do Como Jogar, que não segue as 5 páginas. "Vitória implacável",
  como o Rafik gravou, fica "Vitória impecável" no texto, como na ERS `[RF-POS-01]`. O áudio do
  narrador ainda não está no jogo.
- **Trilhas (decidido em 02/11, FE-38):** uma trilha por momento: Hub, Sala de Espera e
  Preparação, Arena, Morte Súbita (acelerada) e Resultado (vitória e derrota), além da batida de
  coração e do tique-taque da Morte Súbita. Hoje toca uma trilha só, do começo ao fim.

## 10. Stack técnica

- **React + TypeScript + Vite**
- **Tailwind CSS** + **Framer Motion** (animações, inclusive dos personagens SVG)
- **Zustand** (estado global)
- **@stomp/stompjs** (cliente STOMP sobre WebSocket) — substituiu o `socket.io-client` do setup
  inicial
- **fetch** para a API REST (cliente fino em `src/api/`)
- **Howler.js** (efeitos sonoros)
- **React Router** (rotas)
- **Vitest** (testes)
- **Deploy:** Vercel

## 11. Restrições e prazos

- **TAP:** RF01 (tempo real via WebSocket), RF02 (responsivo + PWA), RF03 (back gerencia salas,
  reconexão e vitória), RNF01 (baixa latência), RNF02 (Chrome, Firefox, Safari, Edge)
- **R02 (risco do TAP):** gargalo de integração front×back — o contrato REST/STOMP precisa ser
  validado com o back **antes** de implementar a integração (ver ARCHITECTURE.md §6)
- **Prazos:** Marco 4 (27/10) = lógica core + WebSocket funcionando · Marco 5 (03/11) = PWA +
  testes · Marco 6 (10/11) = publicação em produção

### Contrato com o back

Validado em 06/11 (FE-17), com o back rodando e partidas inteiras entre dois jogadores: o
contrato V2 do back (`docs/contrato-integracao-v2.md` no repositório dele, resumo no
ARCHITECTURE §6) cobre sala, Preparação, sorteio, partida, desconexão, revanche e o snapshot de
reconexão. Perfil, loja e Coins foram conferidos contra o back na FE-49. Ainda a confirmar no
front:

- Recuperação de senha: o back implementou `forgot-password` e `reset-password` (BE-006.1), com o
  código `INVALID_RESET_TOKEN`; o front ainda roda com dados simulados (FE-36).

## 12. Prioridade de implementação (MVP 1)

A **base do jogo** (itens 1, 2 e a estrutura da Arena) é feita pelo Rafael em sequência, até 23/10,
com um **servidor simulado** que imita o back. Os outros integrantes completam as telas em cima
dela. Ordem e responsáveis em `docs/INITIAL_BACKLOG.md`.

1. Base: tipos, constantes, troca de Socket.IO por STOMP, cliente REST, tokens visuais, rotas,
   personagens neon, layout em paisagem e servidor simulado
2. Tabuleiro 4×4 com todos os estados de casa + `winCheck` local para testes (o oficial é do back)
3. Acesso (login/cadastro) e Hub
4. Salas: criar, entrar por código/link, Sala de Espera, Match feito
5. Preparação (personagem com bloqueio em tempo real + 2 iniciais, 20s)
6. Arena: turnos, timer do servidor, W.O. 3/3, MD3 com regra de empate, Morte Súbita, empate
   absoluto
7. Habilidades: sorteio de 8s por round, deck, mira, as 10 habilidades e seus efeitos visuais
8. Resultado, Coins e revanche (15s)
9. Loja (personagens, habilidades, Coins simbólicos) e Perfil (estatísticas e coleção)
10. PWA (instalável, paisagem, "Gire o celular") e polimento (personagens neon, pacote da Morte
    Súbita, sons)
11. **Personalidade (terceiro grupo, em paralelo desde 15/10):** sonoplastia, Configurações, voz
    do jogo e o Vitão com a voz do Rafik (FE-37 a FE-48)
12. **Pós-MVP:** cosméticos, habilidades por personagem, login com Google

Qualquer item pós-MVP proposto antes do item 10 estar pronto deve ser questionado — é desvio de
escopo do que foi combinado com o time.
