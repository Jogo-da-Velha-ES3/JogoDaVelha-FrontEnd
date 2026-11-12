# VOICE_GUIDE.md — Guia de tom da voz do jogo

> Card FE-40. Vale para todo texto que o jogador lê: anúncios, banners, avisos, erros, o
> Resultado e as falas do Vitão.

## Quem fala

Desde 02/11, uma voz só: **o Vitão** (PROJECT_CONTEXT §9).

- Ele é o locutor de luta, no estilo Mortal Kombat/Cuphead: provoca quem errou e comemora com
  exagero. As piadas são as falas que o Rafik escreveu e gravou (pasta `Jogo da Velha_Audios`), e
  a voz do Vitão é a do Rafik (FE-48).
- Na Arena, a piada fica no **balão do Vitão** e o banner fica só com a informação (FE-43). Na
  Morte Súbita, o Vitão vira o Diabo, mas os momentos com gravação continuam com a frase do Rafik.
- Jogadas de peça e a minha habilidade não têm gravação: o Vitão comenta só por escrito, no mesmo
  tom.
- No Resultado, que não tem o Vitão, a piada continua como subtítulo.
- Fala nova ou regravada do Rafik: pôr o WAV na pasta, ligar o arquivo ao nome no jogo na lista de
  `tools/vitao-voices.sh` e rodar o script (ARCHITECTURE §2, voz do Vitão). O teste de
  `vitaoVoices.test.ts` avisa se faltar arquivo ou sobrar algum sem uso.

## Regras

1. **A piada nunca come a informação.** Placar, estouros (1/3, 2/3), tempo, quem começa e o motivo
   do erro continuam na tela. A piada vem antes: "Tá dormindo na rede?! · 1/3".
2. **Curto.** Cabe numa linha no celular deitado (~330px de altura). Se não couber, corte a piada,
   nunca a informação.
3. **Português do Brasil falado:** "cê", "tá", "pra", "tô". Exclamação nos anúncios.
4. **"Você" é quem está jogando.** Quando a fala só faz sentido para um lado (ex: "a cabeça
   **dele** tá por um fio"), ela só aparece para esse lado.
5. **Zoa o jogador e o oponente, nunca outra pessoa.** Nada sobre pessoas reais, nem sobre gênero,
   raça, religião, orientação, deficiência, corpo ou origem.
6. **O tom não muda a cor.** O vermelho continua só para perigo (PROJECT_CONTEXT §4 e §9).

## Sem filtro e com filtro

- **Sem filtro é o padrão** (PROJECT_CONTEXT §9). O filtro é ligado nas Configurações (FE-39).
- **Só sem filtro:** palavrão, xingamento ao jogador ("mané", "babaca", "cala a boca") e duplo
  sentido. Nas gravações do Rafik, é a versão **[E]**.
- **Com filtro:** a mesma informação, sem palavrão. Use a versão **[C]** gravada pelo Rafik. Quando
  não existe versão limpa, a fala some e fica só a informação.
- O teste `src/constants/texts.test.ts` falha se uma versão com filtro tiver um termo da lista
  `UNFILTERED_ONLY`. Ao criar uma piada nova com xingamento, acrescente o termo lá.

| Momento               | Sem filtro                                  | Com filtro                |
| --------------------- | ------------------------------------------- | ------------------------- |
| 1º estouro            | Tá dormindo na rede?! · 1/3                 | É, cê perdeu a vez · 1/3  |
| Anulada pelo campo    | Você usou Bomba · Babaca!                   | Você usou Bomba           |
| Derrota por W.O.      | Assoprou a velhinha errada, hein… entendeu? | Que desperdício de tempo… |
| Oponente saiu da sala | O oponente sentiu a pressão, neném!         | O oponente saiu da sala.  |

## Como adicionar ou mudar um texto

1. Os textos ficam em `src/constants/texts.ts`, separados por tela (`ARENA_TEXTS`,
   `RESULT_TEXTS`...). Nada de frase solta no componente. Rótulos curtos de botão, aba e campo, e
   os `aria-label`, podem ficar no componente.
2. Fala com piada é uma `VoiceLine`: `{ unfiltered, filtered }`, com `filtered: null` quando ela
   some com o filtro. No componente, use `const voice = useVoice()` e `voice(linha)`.
3. Número de regra (10s, 3 estouros, 20 Coins...) vem de `src/constants/game.ts`, nunca escrito no
   texto.
4. Como Jogar fica em `src/features/hub/howToPlayTexts.ts` e as falas do Vitão em
   `src/features/vitao/vitaoLines.ts`. Os dois seguem este guia.
