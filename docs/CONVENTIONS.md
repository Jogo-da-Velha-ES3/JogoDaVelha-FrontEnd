# CONVENTIONS.md — Regras gerais do Front-end

> Regras já validadas com o time. Claude Code deve seguir isso ao gerar código, commits ou
> instruções de PR.

## Branch e Git

- Nunca commitar direto na `master`/`dev` — criar branch própria a partir da `dev`:
  `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Atualizar sua branch com a `dev` regularmente (evitar divergência)
- Merge pra `dev` só via Pull Request, com outra pessoa revisando
- `master` só recebe PR vindo da `dev` (release), nos marcos de entrega

### Papel de cada branch

| Branch                | Papel                                  | Deploy na Vercel                    |
| --------------------- | -------------------------------------- | ----------------------------------- |
| `master`              | Produção — o que está entregue         | Production (automático a cada push) |
| `dev` (branch padrão) | Integração — tudo que já foi revisado  | Preview com domínio fixo de staging |
| `feat/*`, `fix/*`...  | Trabalho em andamento, uma tarefa cada | Preview com URL própria por PR      |

## Commits e PR

- Commits pequenos e com mensagem clara (ex: `fix: corrige validação de login`)
- PR focada em uma tarefa só (um card), com descrição rápida do que mudou
- Na descrição do PR, `Closes #<issue>` fecha o card no merge; para entrega parcial, `Refs #<issue>`
- Se o componente criado for reutilizável (ex: tabuleiro, componente de poder), citar isso
  na descrição do PR

## Qualidade

- Não subir código quebrando o que já funciona (testar antes localmente)
- Rodar `npm run build` sem erros antes de subir
- Rodar o lint (oxlint + Prettier) sem warnings antes do commit — o pre-commit (Husky +
  lint-staged) já roda os dois nos arquivos alterados
- Rodar `npm test` sem falhas (Vitest)
- Sem `console.log`/`console.error` esquecido no código
- Não commitar senha, token ou arquivo `.env` (seguir `.env.example`)
- Seguir o contrato de API/WebSocket combinado com o back antes de implementar a integração

## Documentação

- Atualizar o README quando criar/mudar algo importante (payload, setup, etc.)

## Branch protection (GitHub Ruleset — alvo: `master` e `dev`)

- Require a pull request before merging
- Require approvals → mínimo 1
- Dismiss stale approvals when new commits are pushed
- Require status checks to pass → `Lint, testes e build` (CI)
- Block force pushes
- Restrict deletions
- Bypass list → **Repository admin**, modo "For pull requests only": o líder técnico pode
  mergear PR sem aprovação (ex: infraestrutura), mas também não faz push direto na branch

## Cards (GitHub Issues + Projects)

Cada tarefa é uma issue no GitHub, dentro do Project **Jogo da Velha Project**
(https://github.com/orgs/Jogo-da-Velha-ES3/projects/2).

- **Título:** `[WBS-x] FE-XX — Verbo + o quê` (ex: `[WBS-1] FE-03 — Implementar grid 4x4 local`)
- **Etiquetas:** `Front-End` em toda tarefa + o tipo (`Feature`, `Fix`, `Refactor`, `Docs`,
  `Test`)
- **Responsável:** em Assignees. **Prioridade, Start date e Target date:** nos campos da issue
- **Dependências:** no texto e também como "Blocked by" na issue, para o GitHub mostrar o
  bloqueio

Corpo da issue:

```markdown
**Categoria:** qual parte do front a tarefa afeta (ex: Componentes/UI, Integração WebSocket,
Estado Global, Estilização, PWA, Roteamento, Testes)
**Esforço estimado:** ex: 1,5d

**Objetivo / Descrição:**
O que deve ser feito e o contexto técnico, em 2 ou 3 linhas.

**Dependências:** FE-XX, FE-YY (ou —)

**Anexos / Links de Apoio:** docs, ERS, esboço de telas, prints

**Validação:**

- Como provar que funciona (ex: testado no celular deitado e no desktop)

**Critérios de Aceite (Definição de Pronto):**

- O que precisa estar pronto para o card ir para Done
```

### Colunas do Project

| Status              | Quando                                                   |
| ------------------- | -------------------------------------------------------- |
| `Backlog Front-End` | ainda tem dependência aberta: não pegar                  |
| `Ready`             | dependências concluídas: pode pegar                      |
| `In progress`       | alguém pegou (mover ao começar)                          |
| `In review`         | PR aberto, esperando revisão                             |
| `Done`              | PR mergeado (a issue fecha sozinha com `Closes #` no PR) |

Quem conclui um card move para `Ready` os cards que ele destravou.

## Pull Request

O template fica em `.github/pull_request_template.md` e aparece sozinho ao abrir o PR: card
(`Closes #` ou `Refs #`), o que foi feito, como testar (com o link de preview que a Vercel comenta
no PR), prints e checklist. O PR vai para a `dev` e precisa de 1 aprovação.

## CODEOWNERS (`.github/CODEOWNERS`)

```
* @yMenezes
```
