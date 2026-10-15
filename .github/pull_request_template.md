## Card

Closes #

<!--
Coloque o número da issue do card (ex: Closes #12): ela fecha sozinha no merge e o card vai para
Done no Project. Se o card ainda não termina com este PR (entrega parcial), use "Refs #12".
-->

## O que foi feito

<!-- Em tópicos curtos. Se criou um componente reutilizável, cite aqui. -->

## Como testar

<!--
Onde abrir e o que fazer, para quem for revisar. Use o link de preview que a Vercel comenta neste
PR. Ex: "/vitrine?aba=tabuleiro → toque nas casas" ou "/sala/1234 → jogue uma partida".
-->

## Checklist

- [ ] `npm run lint`, `npm run format:check`, `npm test` e `npm run build` sem erros
- [ ] Testado no celular deitado e no desktop
- [ ] Textos em português e sem `console.log` esquecido
- [ ] O estado só muda com a resposta do servidor (sem atualização otimista)
- [ ] Segue o contrato com o back (docs/ARCHITECTURE.md §6)
- [ ] README ou docs atualizados, se necessário
- [ ] Card em "In review" no Project
