# CONVENTIONS.md — Regras gerais do Front-end

> Regras já validadas com o time. Claude Code deve seguir isso ao gerar código, commits ou
> instruções de PR.

## Branch e Git

- Nunca commitar direto na `main`/`dev` — criar branch própria:
  `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Atualizar sua branch com a `dev` regularmente (evitar divergência)
- Merge pra `dev` só via Pull Request, com outra pessoa revisando

## Commits e PR

- Commits pequenos e com mensagem clara (ex: `fix: corrige validação de login`)
- PR focada em uma tarefa só, com descrição rápida do que mudou
- Se o componente criado for reutilizável (ex: tabuleiro, componente de poder), citar isso
  na descrição do PR

## Qualidade

- Não subir código quebrando o que já funciona (testar antes localmente)
- Rodar `npm run build` sem erros antes de subir
- Rodar o lint (ESLint/Prettier) sem warnings antes do commit
- Sem `console.log`/`console.error` esquecido no código
- Não commitar senha, token ou arquivo `.env` (seguir `.env.example`)
- Seguir o contrato de API/WebSocket combinado com o back antes de implementar a integração

## Documentação

- Atualizar o README quando criar/mudar algo importante (payload, setup, etc.)

## Branch protection (GitHub — configurar em `main` e `dev` separadamente)

- Require a pull request before merging
- Require approvals → mínimo 1
- Dismiss stale approvals when new commits are pushed
- Do not allow bypassing the above settings (vale pro líder técnico também)
- Allow force pushes → desmarcado
- Allow deletions → desmarcado

## Template de card de tarefa (Trello)

```
Nome da Tarefa (colocar no título): Ex: Criar componente de tabuleiro 4x4 responsivo

Etiquetas:
- Front-end em toda tarefa
- (Feature/Fix/Refactor...) → tipo de mudança da tarefa

Categoria: qual parte do sistema front-end essa tarefa afeta?
(ex: Componentes/UI, Integração WebSocket, Estado Global, Estilização, PWA, Performance,
Roteamento, Testes)

Membro Atribuído: @Membro do Trello

Objetivo / Descrição: Explique em 2 ou 3 linhas o que deve ser feito e o contexto técnico.

Dependências: campo tipo "Bloqueado por / Depende de"

Anexos / Links de Apoio:
Links, referência visual (Figma/print), arquivos etc. para apoio na tarefa;

Validação:
- Pull Request criada no GitHub
- Link da Pull Request adicionado ao card
- Código revisado/validado
- Critérios de aceite atendidos
- Seguir Regras Gerais do Front-End
- Testado em Desktop e Mobile (responsivo)
- Testado nos principais navegadores (Chrome, Firefox, Safari, Edge)
- README atualizado (se necessário)
```

## Template de Pull Request (`.github/pull_request_template.md`)

```markdown
## Card do Trello

Link:

## O que foi feito

## Checklist

- [ ] `npm run build` passou sem erros
- [ ] Lint sem warnings
- [ ] Testado em desktop e mobile
- [ ] Sem console.log esquecido
- [ ] Segue o contrato de API/WebSocket combinado com o back
- [ ] README atualizado (se necessário)
```

## CODEOWNERS (`.github/CODEOWNERS`)

```
* @usuario-github-do-rafael
```
