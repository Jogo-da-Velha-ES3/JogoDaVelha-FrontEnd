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
- O sorteio da 3ª habilidade usa o **pool completo, menos as 2 iniciais que o jogador escolheu**, e
  pode trazer habilidades que ele ainda não comprou `[RF-DRAFT-03]`.
- **Nomenclatura na interface:** "Habilidades Iniciais" (a ERS também chama de "fixas" em
  `[RF-DRAFT-01]`; é a mesma coisa).

### Deck da rodada: 2 iniciais + 1 sorteada `[RN-DRAFT-02]`

1. **Iniciais (fixas):** na Preparação, o jogador escolhe 2 habilidades entre as que já
   desbloqueou.
2. **Sorteio da 3ª:** **no início de cada rodada**, o servidor mostra 3 cartas visíveis
   `[RN-DRAFT-03]` e o jogador escolhe 1. São **8 segundos**; se não escolher, uma carta é
   escolhida automaticamente `[RN-DRAFT-05]`. Esse tempo não faz parte dos 20s da Preparação.
3. O deck de cada rodada tem exatamente 3 habilidades.

### Regras de uso

- Cada habilidade do deck pode ser usada **no máximo 1 vez por rodada** `[RN-ARN-02]`.
- Usar uma habilidade **consome a ação do turno**: não dá para marcar peça e usar habilidade no
  mesmo turno, nem usar 2 habilidades `[RN-ARN-02]`.
- **O deck do oponente é oculto:** você só descobre uma habilidade dele quando ela é usada
  (decisão de interface).

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

### Melhor de 3 (MD3) — regra decidida em 18/10 **[A VALIDAR COM O BACK]**

> Substitui a regra da ERS `[RF-ARN-05]`, que encerrava a partida em 1×0 quando um dos 2
> primeiros rounds empatava (o outro jogador não tinha chance de reagir). Proposta enviada ao GP
> e ao back em 18/10: o servidor decide o placar, então o back precisa seguir a mesma regra.

- A partida tem **até 3 rounds** e só acaba antes do round 3 se alguém fizer **2×0**.
- **Round 3 = Morte Súbita, sempre** (inclusive em 1×0): timer de **5s por turno** e interface de
  alerta vermelho.
- **No fim do round 3, vence quem tiver mais rounds.** Placar igual (1×1 ou 0×0) é **empate
  absoluto** `[RN-ARN-06]`: os dois recebem +20 Coins. **Não existe mata-mata.**

  | Depois dos rounds 1 e 2 | Round 3                   | Final                     |
  | ----------------------- | ------------------------- | ------------------------- |
  | 2×0                     | não tem                   | vitória 2×0               |
  | 1×1                     | alguém vence / empata     | vitória 2×1 / empate abs. |
  | 1×0 (um round empatou)  | quem está na frente vence | vitória 2×0               |
  | 1×0                     | quem está atrás vence     | empate absoluto (1×1)     |
  | 1×0                     | empata                    | vitória 1×0               |
  | 0×0 (dois empates)      | alguém vence / empata     | vitória 1×0 / empate abs. |

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
  `PLAYER_DISCONNECTED` / `PLAYER_RECONNECTED` (pedido ao back em 15/10).
- **Quem caiu** vê "Reconectando…", não consegue jogar até voltar e volta para o mesmo ponto da
  partida pelo `ROOM_SNAPSHOT` completo (o estado está no servidor).
- **No Resultado,** cair conta como sair da sala e cancela a revanche **[A VALIDAR COM O BACK]**.

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
  pedirem ao mesmo tempo, vale como aceite. **[A VALIDAR COM O BACK]** os nomes dos eventos
  (`REMATCH_REQUESTED`, `REMATCH_CANCELLED`, `ROOM_CLOSED`).
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

- Pacotes simbólicos de Coins: **[A VALIDAR COM O BACK]** (proposta: 350, 700 e 1400).

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

Modais globais: Entrar com Código, Como Jogar, Comprar Coins, Configurações (som, vibração), Sair
da partida, Conexão perdida, Gire o celular.

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
  tempo do turno **[A VALIDAR COM O BACK]**.
- **Timer do turno (decidido em 16/10):** sempre mostra o turno atual, inclusive o do oponente,
  com o prazo do `TURN_START`. Na sua vez fica na sua cor e vermelho nos últimos 3s; na vez do
  oponente fica na cor dele, com o texto "Vez do oponente" e sem o vermelho (o tempo dele acabando
  não é perigo para você). Assim também dá para ver o efeito da Ampulheta (turno dele com 5s).
- **Turno perdido e W.O. (decidido em 16/10):** o banner aparece quando chega o `TURN_TIMEOUT` ou o
  `MATCH_END` do servidor, nunca quando o timer do front chega a 0. Vermelho só para quem está em
  perigo; para o outro jogador, a cor do personagem de quem é o aviso.

  | Situação                  | Quem vê      | Título                | Subtítulo                             | Cor                   |
  | ------------------------- | ------------ | --------------------- | ------------------------------------- | --------------------- |
  | 1º estouro                | quem estoura | TEMPO ESGOTADO!       | Você perdeu a vez · 1/3               | vermelho              |
  | 2º estouro seguido        | quem estoura | TEMPO ESGOTADO!       | 2/3 · Mais um e é W.O.!               | vermelho              |
  | 1º/2º estouro do oponente | o outro      | OPONENTE PERDEU A VEZ | 1/3 ou 2/3                            | cor do oponente       |
  | 3º estouro (W.O.)         | quem estoura | W.O.!                 | 3 tempos esgotados seguidos · Derrota | vermelho              |
  | 3º estouro do oponente    | o outro      | VITÓRIA POR W.O.      | O oponente esgotou o tempo 3 vezes    | cor do seu personagem |

  No W.O., a Arena segura o banner por **2 segundos** e só então vai para o Resultado. Isso não
  atrasa nada no servidor: a partida e os Coins já foram resolvidos no `MATCH_END`, e a janela da
  revanche só conta a partir do pedido. Quem reconecta nesse meio-tempo cai direto no Resultado.

- **Empate absoluto (decidido em 17/10):** se o round 3 termina com o placar igual, o fim do round
  já anuncia "EMPATE ABSOLUTO" (regra de exibição, como o "MATCH POINT" `[RN-ARN-06]`), com
  "Ninguém venceu a Morte Súbita" ou o placar final (1×1). É **um banner só**: quando chega o
  `MATCH_END`, a Arena segura **2 segundos**, como no W.O., e o subtítulo troca para "+20 Coins
  para cada" (Coins vindos do servidor); então vai para o Resultado.

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
  junto com a sonoplastia e a voz do jogo (cards FE-37 a FE-45, grupo WBS-11 — Personalidade).
  Antes disso (até 14/10), o front só reservava o espaço dele.
- **Como ele é:** um bonequinho com a **cabeça do Vitão em caricatura** (desenho colorido com
  expressões), que anda e reage no espaço reservado da Arena, fala besteiras num balão e **com a
  voz gravada dele**. Na Morte Súbita vira a versão "Diabo".
- **Caricatura em vez de foto (decidido em 25/10, FE-41):** lê melhor em tamanho pequeno e combina
  com o tom do jogo. Expressões: normal, rindo, debochado, bravo, muito bravo, surpreso, dormindo e
  Diabo, todas no mesmo ângulo e enquadramento, em WebP de 256px (~15 KB cada), em
  `src/features/vitao/assets/`. Para casar com o neon, o contorno brilhante é feito no código
  (FE-42), sem mexer na arte. Em ~48px, normal, bravo e muito bravo ficam parecidos: na reação de
  raiva, usar o "muito bravo".
- **Regras:** falas em arquivo editável, no máximo uma a cada 6s, balão que nunca cobre o
  tabuleiro, linguagem sem filtro por padrão (com opção de filtrar nas Configurações). Tudo é
  feito com `VITAO_ENABLED=false`; a flag é ligada quando o motor de reações (FE-44) for aprovado.
- **Autorização:** o uso da imagem, das falas e da voz do Vitão num link público precisa do ok
  dele, registrado na FE-41. O Vitão autorizou o uso da imagem (25/10).
- **Voz do jogo:** além do Vitão, os textos da interface (anúncios gritados, banners, erros,
  avisos, Resultado) seguem um guia de tom com humor de narrador estilo Mortal Kombat/Cuphead,
  centralizados num arquivo (FE-40).

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

### A validar com o back antes de implementar

- Contrato REST (auth, perfil, inventário, loja, compra de Coins) e destinos STOMP
- Fases da sala (`phase`) e o snapshot completo para reconexão (campos pedidos em 15/10)
- Pacotes simbólicos de Coins
- Endpoints de recuperação de senha (formato proposto em 15/10; o front segue com dados
  simulados)
  - (24/10) Ainda não existem no back (card BE-006.1, na reserva). Proposta, a validar: 200 (e
    não 204) no forgot, `newPassword` + `confirmPassword` no reset, e o código
    `INVALID_RESET_TOKEN`, que é só nossa proposta (o card diz 400/410). Ver ARCHITECTURE §6.
- `PLAYER_DISCONNECTED` / `PLAYER_RECONNECTED` e se cair no Resultado cancela a revanche
- Regra nova da MD3 (18/10): até 3 rounds, só acaba antes em 2×0, empate absoluto com placar
  igual no fim do round 3 (§6)
- Apresentação do round (24/10): 2,5s entre o fim do sorteio e o primeiro `TURN_START` (§9)

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
    do jogo e o Vitão com voz (FE-37 a FE-45)
12. **Pós-MVP:** cosméticos, habilidades por personagem, login com Google

Qualquer item pós-MVP proposto antes do item 10 estar pronto deve ser questionado — é desvio de
escopo do que foi combinado com o time.
