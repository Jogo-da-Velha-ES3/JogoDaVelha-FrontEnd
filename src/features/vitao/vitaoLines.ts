// Falas do Vitão (FE-43). As frases gravadas pelo Rafik vêm de constants/texts.ts via fromVoice e
// tocam a gravação junto com o balão (FE-48, arquivos em src/assets/sounds/vitao/). As dos momentos
// sem gravação (jogadas, minha habilidade) são escritas aqui, no tom do docs/VOICE_GUIDE.md. As do
// "Diabo" ainda são PROVISÓRIAS.
// Morte Súbita (decidido em 11/11): momento com gravação do Rafik fica sem lista `devil`, então o
// Vitão fala a frase gravada com a cara de Diabo e a voz toca. As falas do Diabo ficam só para os
// momentos sem gravação (jogadas e minha habilidade).
// Round empatado e estouro do oponente não têm fala do Vitão: a gravação deles é só a informação
// ("Round empatado.", "O oponente perdeu a vez.") e toca como anúncio (lib/vitaoAnnouncements.ts).
// `explicit: true` = fala sem filtro, que some quando o filtro das Configurações está ligado.
// Fala com xingamento usa fromVoice({ unfiltered, filtered }): a versão [C] só aparece com o filtro.
// Raiva é sempre MUITO_BRAVO: na cabeça pequena, o BRAVO fica igual ao NORMAL (FE-41).
import { ABILITY_TEXTS, ARENA_TEXTS, RESULT_TEXTS, type VoiceLine } from '../../constants/texts'
import type { VitaoExpression, VitaoLine, VitaoLines, VitaoVoiceKey } from '../../lib/vitao'
import type { AbilityId } from '../../types/game'

const say = (
  text: string,
  expression: VitaoExpression,
  explicit = false,
  audio?: VitaoVoiceKey,
): VitaoLine => ({
  text,
  expression,
  explicit,
  ...(audio ? { audio } : {}),
})

/**
 * Frase do Rafik (FE-40) como fala do Vitão: sem filtro, a versão [E]; com o filtro, a [C]. Se as
 * duas forem iguais, vale nos dois modos; sem versão limpa, com o filtro ele fica quieto.
 * `audio` é a gravação sem filtro (ex: "vitao-match-point"); a filtrada é a mesma com
 * "-filtrado". Frase igual nos dois modos toca `audio` nos dois.
 */
export function fromVoice(
  line: VoiceLine<string | null>,
  expression: VitaoExpression,
  audio?: VitaoVoiceKey,
): VitaoLine[] {
  if (line.unfiltered === line.filtered) return [say(line.unfiltered, expression, false, audio)]
  const clean = line.filtered
  const cleanAudio = audio && (`${audio}-filtrado` as const)
  const cleanLines: VitaoLine[] = clean
    ? [
        {
          text: clean,
          expression,
          filteredOnly: true,
          ...(cleanAudio ? { audio: cleanAudio } : {}),
        },
      ]
    : []
  return [say(line.unfiltered, expression, true, audio), ...cleanLines]
}

/** Gravação da habilidade usada pelo oponente, ex: "vitao-habilidade-buraco-negro" */
export const abilityVoice = (ability: AbilityId): VitaoVoiceKey =>
  `vitao-habilidade-${ability.toLowerCase().replaceAll('_', '-')}`

export const VITAO_LINES: VitaoLines = {
  OPPONENT_DISCONNECTED: {
    normal: fromVoice(
      ARENA_TEXTS.opponentDisconnected.line,
      'DEBOCHADO',
      'vitao-oponente-desconectado',
    ),
    devil: [],
  },
  // Minha jogada de peça (o Vitão comenta 1 em cada 3)
  MOVE_ME: {
    normal: [
      say('Boa, hein? Até eu fiquei surpreso.', 'SURPRESO'),
      say('Jogou assim de propósito?', 'DEBOCHADO'),
      say('Tá jogando bonito, hein!', 'RINDO'),
      say('Essa foi na confiança, né?', 'DEBOCHADO'),
      ...fromVoice(
        { unfiltered: 'Cê jogou isso aí sério, mané?', filtered: 'Cê jogou isso aí sério?' },
        'DEBOCHADO',
      ),
    ],
    devil: [
      say('Cada peça sua é uma alma a menos.', 'DIABO'),
      say('Joga, joga. O inferno espera.', 'DIABO'),
      ...fromVoice(
        {
          unfiltered: 'Joga logo, infeliz. A morte não espera.',
          filtered: 'Joga logo. A morte não espera.',
        },
        'DIABO',
      ),
    ],
  },
  // Jogada de peça do oponente
  MOVE_OPPONENT: {
    normal: [
      say('O rival mexeu. Será que ele sabe o que faz?', 'DEBOCHADO'),
      say('Olha o oponente se achando.', 'RINDO'),
      say('Ele jogou ali? Ali?!', 'SURPRESO'),
      say('Esse aí joga de olho fechado.', 'DEBOCHADO'),
      ...fromVoice(
        {
          unfiltered: 'Que jogada de mané, oponente!',
          filtered: 'Eita, que jogada estranha!',
        },
        'RINDO',
      ),
    ],
    devil: [
      say('Ele ainda acha que tem chance.', 'DIABO'),
      say('Mexe, mexe. O fim é o mesmo.', 'DIABO'),
      say('Que coragem, mortal.', 'DIABO'),
    ],
  },
  // Minha habilidade (sem anulada nem sem efeito: essas têm gravação)
  ABILITY_ME: {
    normal: [
      say('Habilidade na mesa! Isso aí!', 'RINDO'),
      say('Olha, sabe usar o deck.', 'SURPRESO'),
      say('Tirou o coelho da cartola!', 'RINDO'),
      say('Gastou a carta, hein. Será que valeu?', 'DEBOCHADO'),
      ...fromVoice(
        {
          unfiltered: 'Tomara que isso aí não seja furada, mané.',
          filtered: 'Tomara que isso aí dê certo.',
        },
        'DEBOCHADO',
      ),
    ],
    devil: [
      say('Use tudo. Não vai adiantar.', 'DIABO'),
      say('Poderes não salvam alma.', 'DIABO'),
      say('Gaste suas cartas. Eu tenho tempo.', 'DIABO'),
    ],
  },
  // As falas do Rafik (uma por habilidade) entram em buildVitaoLines
  ABILITY_OPPONENT: { normal: [], devil: [] },
  ABILITY_ABSORBED: {
    normal: fromVoice(ABILITY_TEXTS.absorbedLine, 'DEBOCHADO', 'vitao-anulada'),
    devil: [],
  },
  ABILITY_NO_EFFECT: {
    normal: fromVoice(ABILITY_TEXTS.noEffectLine, 'DEBOCHADO', 'vitao-sem-efeito'),
    devil: [],
  },
  // As falas do Rafik (1º e 2º estouro) entram em buildVitaoLines
  TIMEOUT_ME: { normal: [], devil: [] },
  ROUND_WIN_ME: {
    normal: fromVoice(ARENA_TEXTS.roundEnd.mineLine, 'RINDO', 'vitao-round-vitoria'),
    devil: [],
  },
  ROUND_WIN_OPPONENT: {
    normal: fromVoice(ARENA_TEXTS.roundEnd.opponentsLine, 'DEBOCHADO', 'vitao-round-derrota'),
    devil: [],
  },
  MATCH_POINT_ME: {
    normal: fromVoice(
      ARENA_TEXTS.roundIntro.matchPointLine(true),
      'DEBOCHADO',
      'vitao-match-point',
    ),
    devil: [],
  },
  // "Mais uma e já era!" serve aos dois lados: é a gravação [C] do match point
  MATCH_POINT_OPPONENT: {
    normal: fromVoice(
      ARENA_TEXTS.roundIntro.matchPointLine(false),
      'MUITO_BRAVO',
      'vitao-match-point-filtrado',
    ),
    devil: [],
  },
  SUDDEN_DEATH_START: {
    normal: fromVoice(ARENA_TEXTS.suddenDeath.line, 'MUITO_BRAVO', 'vitao-morte-subita'),
    devil: [],
  },
  WO_WIN_ME: {
    normal: fromVoice(RESULT_TEXTS.lines.WO_WIN, 'RINDO', 'vitao-wo-vitoria'),
    devil: [],
  },
  WO_WIN_OPPONENT: {
    normal: fromVoice(RESULT_TEXTS.lines.WO_LOSS, 'MUITO_BRAVO', 'vitao-wo-derrota'),
    devil: [],
  },
}

export interface VitaoLineContext {
  /** Habilidade que o oponente acabou de usar */
  abilityId?: AbilityId | null
  /** Estouros seguidos de quem é "eu" (1 ou 2; o 3º vira W.O.) */
  myTimeouts?: number | null
}

/** VITAO_LINES + as falas do Rafik que dependem do que acabou de acontecer */
export function buildVitaoLines(ctx: VitaoLineContext = {}): VitaoLines {
  const { abilityId } = ctx
  const abilityLine = abilityId ? ABILITY_TEXTS.lines[abilityId] : undefined
  const abilityLines =
    abilityId && abilityLine ? fromVoice(abilityLine, 'SURPRESO', abilityVoice(abilityId)) : []

  // O texts.ts só tem fala para o 1º e o 2º estouro
  const timeoutCount = ctx.myTimeouts ? Math.min(ctx.myTimeouts, 2) : null
  const timeoutLines = timeoutCount
    ? fromVoice(
        ARENA_TEXTS.timeout.mine(timeoutCount),
        'MUITO_BRAVO',
        `vitao-tempo-esgotado-${timeoutCount}`,
      )
    : []

  return {
    ...VITAO_LINES,
    ABILITY_OPPONENT: {
      devil: VITAO_LINES.ABILITY_OPPONENT?.devil ?? [],
      normal: abilityLines,
    },
    TIMEOUT_ME: {
      devil: VITAO_LINES.TIMEOUT_ME?.devil ?? [],
      normal: timeoutLines,
    },
  }
}
