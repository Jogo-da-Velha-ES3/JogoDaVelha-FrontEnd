# LOCAL_INTEGRATION.md — Front e back rodando juntos na sua máquina

> Para testar a integração (REST e STOMP) e depurar quando algo der errado: o front em
> `localhost:5173` conversando com o back em `localhost:8080`. Em 05/11/2026, o modo de
> depuração pelo terminal (seção 4) foi testado com o back da branch
> `feat/ajustes-integracao-front`: uma partida inteira de 2×0 entre dois jogadores. O modo
> simples (seção 3) segue o README do back e ainda não foi rodado nesta máquina.

## Quando usar cada ambiente

| Ambiente                            | Para quê                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Servidor simulado                   | telas, animações e regras do front, sem depender do back                              |
| **Front + back locais (este guia)** | integração: contrato, ordem dos eventos, erros; dá para pôr breakpoint nos dois       |
| Preview da Vercel + back no Render  | conferir o que só existe no deploy: HTTPS/`wss`, CORS, cold start, celular de verdade |

## 1. Preparar a máquina (uma vez)

- **Docker Desktop** aberto (`open -a Docker`). Ele roda o PostgreSQL e o Redis do back.
- **Java 25 e Maven**, só para o modo de depuração (seção 4):
  `brew install openjdk@25 maven`.
- **IntelliJ IDEA** para o back (`brew install --cask intellij-idea`). Para o front, o VS Code
  continua. Não deixe a extensão Java do VS Code ligada na pasta do back: ela compila na mesma
  pasta `target/` do Maven e quebra os testes.
- **Clone do back ao lado do front:** `../JogoDaVelha-BackEnd`.
- **Redis do Homebrew:** se você tem um Redis instalado no Mac rodando na porta 6379, ele
  briga com o do Docker. Pare enquanto estiver jogando: `brew services stop redis` (para voltar,
  `brew services start redis`). Para conferir: `lsof -nP -iTCP:6379 -sTCP:LISTEN`.

## 2. Configurar o back (uma vez)

Na pasta do back:

```bash
cp .env.example .env
openssl rand -base64 32   # o resultado vai no JWT_SECRET
```

Valores para rodar local (o resto do `.env` pode ficar como veio):

```
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=jogodavelha
DB_PORT=5432
REDIS_PORT=6379
JWT_SECRET=<resultado do openssl>
JWT_EXPIRATION=2592000000
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/redefinir-senha
GAME_STATE_TTL=1800000
GAME_STATE_UPDATE_MAX_RETRIES=5
```

- `GAME_STATE_TTL` e `GAME_STATE_UPDATE_MAX_RETRIES` são obrigatórias no Docker Compose: sem
  elas a API não sobe.
- `REDIS_PORT` precisa ser 6379: o `docker-compose.yml` usa o mesmo valor dentro e fora do
  container.
- Sem `MAIL_*`, só o e-mail do "Esqueci minha senha" deixa de sair.
- **Nunca** commite o `.env`.

## 3. Modo simples: só usar o back

Tudo no Docker (PostgreSQL, Redis e a API), como recomenda o README do back:

```bash
cd ../JogoDaVelha-BackEnd
git switch dev && git pull        # ou a branch que você quer testar
docker compose up --build         # a primeira vez demora alguns minutos
```

- Pronto quando `http://localhost:8080/api/health` responde `{"status":"UP",...}`.
- Mudou o código do back? Rode `docker compose up --build` de novo (não recarrega sozinho).
- Logs da API: `docker compose logs -f api`.
- Parar: `Ctrl+C` e `docker compose down` (os dados ficam). Zerar contas e partidas:
  `docker compose down -v`.

## 4. Modo depuração: back na IntelliJ, com breakpoints

Os bancos no Docker e a API rodando na IntelliJ, que reinicia rápido e para nos breakpoints.

1. Suba só os bancos: `docker compose up -d postgres redis`.
2. Na IntelliJ: **File > Open** na pasta do back (ela reconhece o Maven). Em **File > Project
   Structure > SDK**, escolha o Java 25 (ou **Add SDK > JDK** apontando para
   `/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home`).
3. Abra `src/main/java/com/jogodavelha/JogoDaVelhaApplication.java` e clique na seta verde ao
   lado da classe > **Debug**. A primeira vez falha por falta de variáveis: tudo bem.
4. **Run > Edit Configurations** > `JogoDaVelhaApplication` > **Environment variables**:
   `JWT_SECRET=<o mesmo do .env>;JWT_EXPIRATION=2592000000`. O resto já tem valor padrão que
   bate com o `.env` acima (`localhost:5432`, `localhost:6379`, usuário e senha `postgres`).
5. **Debug** de novo. Pronto quando aparece `Started JogoDaVelhaApplication` e o
   `/api/health` responde.

Sem IntelliJ, o mesmo pelo terminal:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
set -a; source .env; set +a
mvn spring-boot:run
```

Não rode o modo simples e o de depuração juntos: os dois querem a porta 8080.

## 5. Ligar o front no back local

No `.env.local` do front (não vai para o git):

```
VITE_API_URL=http://localhost:8080/api
VITE_WEBSOCKET_URL=http://localhost:8080
```

`npm run dev` e abra `http://localhost:5173`. Desde a FE-50, o back real é o padrão do front; para
jogar contra o servidor simulado, acrescente `VITE_USE_MOCK_SERVER=true` e reinicie o
`npm run dev`.

**Dois jogadores:** a sessão fica no `localStorage`, então use uma janela normal e uma anônima
(ou dois navegadores), cada uma com a sua conta. Conta nova já vem com X, O, Bomba, Escudo e
Ampulheta; para testar compras, use a compra simbólica de Coins da Loja.

## 6. Como depurar um problema de integração

1. **Reproduza** com os dois rodando e anote o passo.
2. **Veja as mensagens:** DevTools do navegador > **Network** > filtro **WS** > clique na
   conexão `ws` > **Messages**. `SEND` é o que o front mandou; `MESSAGE` é o que o back
   respondeu, com o tipo do evento no corpo. Erros das minhas ações chegam em
   `/user/queue/errors` (`code`, `message`, `path`). No REST, o mesmo na aba **Fetch/XHR**.
3. **Decida de quem é o erro** comparando com o contrato (`docs/contrato-integracao-v2.md` no
   back e o ARCHITECTURE §6 aqui): o back mandou diferente do contrato, ou o front leu errado?
4. **Ponha o breakpoint no lado certo:** no back, na IntelliJ (modo depuração); no front, no
   DevTools (**Sources**) ou no VS Code. Os pontos de entrada são `src/sockets/envelope.ts` (o que
   chega) e `src/stores/serverEvents.ts` (como vira estado).
5. **Escreva um teste que reproduz** antes de corrigir (Vitest no front, JUnit no back) e só
   então corrija. O erro não volta escondido.

Outras ferramentas:

- **Swagger do back** (testar o REST sem o front): `http://localhost:8080/swagger-ui/index.html`.
- **Banco:** `docker exec -it jogodavelha-postgres psql -U postgres -d jogodavelha`.
- **Redis (estado das partidas):** `docker exec -it jogodavelha-redis redis-cli` e `KEYS *`.

### Teste automático contra o back local

Com o back no ar, um teste joga partidas inteiras com o front de um lado (o `gameClient`, o
cliente STOMP, a tradução e as stores) e um segundo jogador automático do outro:

```bash
VITE_LIVE_BACK_URL=http://localhost:8080 npx vitest run src/sockets/liveBack.test.ts
```

Ele confere a partida 2×0 com habilidade e Resultado (e o saldo já com os Coins no `MATCH_END`),
a sala lotada, a jogada fora de hora, a saída na Preparação, a queda e a recarga da página no meio
da partida e o link da sala com o token vencido. Leva menos de um minuto.

O REST de perfil, loja e Coins tem o seu (FE-49): conta nova, catálogo, compra sem saldo, Coins
simbólicos, compra e equipar, apelido em uso e fora do tamanho, token inválido e back fora do ar.

```bash
VITE_LIVE_BACK_URL=http://localhost:8080 npx vitest run src/api/liveBack.test.ts
```

Rode os dois depois de mexer na tradução do contrato (`src/sockets/`, `src/api/`) ou quando o back
mudar. Sem a variável, eles ficam pulados (`npm test` e CI).

## 7. Problemas comuns

| Sintoma                                                              | Causa e solução                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docker compose up` falha com "port is already allocated" na 6379    | Redis do Homebrew ligado: `brew services stop redis`                                               |
| API não sobe: `required a single bean, but 3 were found` (scheduler) | Back sem a correção de 05/11 (`lombok.config` com o `@Qualifier`)                                  |
| Jogada que fecha a linha volta `INTERNAL_ERROR`, round não termina   | Back sem a correção de 05/11 no `finishRound` (`LazyInitializationException` no log da API)        |
| Login funciona, mas a sala não conecta                               | `VITE_WEBSOCKET_URL` errado (é a raiz do back, sem `/api`) ou API fora do ar                       |
| Erro de CORS no console                                              | `CORS_ALLOWED_ORIGINS` sem `http://localhost:5173`                                                 |
| PostgreSQL recusa a senha depois de mudar o `.env`                   | O volume guardou a senha antiga: `docker compose down -v` (apaga os dados)                         |
| O front continua jogando contra o robô                               | `VITE_USE_MOCK_SERVER=true` no `.env.local`, ou o `npm run dev` não foi reiniciado                 |
| Testes do back com `NoClassDefFound` ou "Mockito cannot mock"        | Outra ferramenta compilando na mesma `target/` (extensão Java do VS Code): desligue e rode de novo |
