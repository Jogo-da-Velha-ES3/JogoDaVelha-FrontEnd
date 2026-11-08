// Falas do Vitão (FE-43). As frases gravadas pelo Rafik vêm de constants/texts.ts via fromVoice e
// guardam o nome do áudio (FE-48). Ainda são PROVISÓRIAS as dos momentos sem gravação (jogadas,
// minha habilidade, empate, estouro do oponente) e todas as do "Diabo".
// `explicit: true` = fala sem filtro, que some quando o filtro das Configurações está ligado.
// Raiva é sempre MUITO_BRAVO: na cabeça pequena, o BRAVO fica igual ao NORMAL (FE-41).
import { ABILITY_TEXTS, ARENA_TEXTS, RESULT_TEXTS, type VoiceLine } from '../../constants/texts'
import type { VitaoExpression, VitaoLine, VitaoLines } from '../../lib/vitao'
import type { AbilityId } from '../../types/game'

const say = (
  text: string,
  expression: VitaoExpression,
  explicit = false,
  audio?: string,
): VitaoLine => ({
  text,
  expression,
  explicit,
  ...(audio ? { audio } : {}),
})

/**
 * Frase do Rafik (FE-40) como fala do Vitão: sem filtro, a versão [E]; com o filtro, a [C]. Se as
 * duas forem iguais, vale nos dois modos; sem versão limpa, com o filtro ele fica quieto.
 * `audio` é o nome-base do arquivo do Rafik: com duas versões, ganha o sufixo -e e -c.
 */
export function fromVoice(
  line: VoiceLine<string | null>,
  expression: VitaoExpression,
  audio?: string,
): VitaoLine[] {
  if (line.unfiltered === line.filtered) return [say(line.unfiltered, expression, false, audio)]
  const clean = line.filtered
  const cleanLines: VitaoLine[] = clean
    ? [{ text: clean, expression, filteredOnly: true, ...(audio ? { audio: `${audio}-c` } : {}) }]
    : []
  return [say(line.unfiltered, expression, true, audio ? `${audio}-e` : undefined), ...cleanLines]
}

export const VITAO_LINES: VitaoLines = {
  OPPONENT_DISCONNECTED: {
    normal: fromVoice(ARENA_TEXTS.opponentDisconnected.line, 'DEBOCHADO', 'oponente-desconectado'),
    devil: [],
  },
  MOVE_ME: {
    normal: [
      say('Boa, hein? Até eu fiquei surpreso.', 'SURPRESO'),
      say('Jogou assim de propósito?', 'DEBOCHADO'),
    ],
    devil: [say('Entregará até a alma.', 'DIABO')],
  },
  MOVE_OPPONENT: {
    normal: [
      say('O rival mexeu. Será que ele sabe o que faz?', 'DEBOCHADO'),
      say('Olha o oponente se achando.', 'RINDO'),
    ],
    devil: [say('Ele ainda acha que tem chance.', 'DIABO')],
  },
  ABILITY_ME: {
    normal: [
      say('Habilidade na mesa! Isso aí!', 'RINDO'),
      say('Olha, sabe usar o deck.', 'SURPRESO'),
    ],
    devil: [say('Use tudo. Não vai adiantar.', 'DIABO')],
  },
  // As falas do Rafik (uma por habilidade) entram em buildVitaoLines
  ABILITY_OPPONENT: {
    normal: [],
    devil: [say('Poderes? Aqui embaixo também temos.', 'DIABO')],
  },
  ABILITY_ABSORBED: {
    normal: fromVoice(ABILITY_TEXTS.absorbedLine, 'DEBOCHADO', 'anulada'),
    devil: [say('Nem o escudo te salva aqui.', 'DIABO')],
  },
  ABILITY_NO_EFFECT: {
    normal: fromVoice(ABILITY_TEXTS.noEffectLine, 'DEBOCHADO', 'sem-efeito'),
    devil: [say('Poder jogado fora. Delicioso.', 'DIABO')],
  },
  // As falas do Rafik (1º e 2º estouro) entram em buildVitaoLines
  TIMEOUT_ME: {
    normal: [],
    devil: [say('O tempo é meu aliado, não seu.', 'DIABO')],
  },
  TIMEOUT_OPPONENT: {
    normal: [
      say('O rival dormiu! Zzz...', 'DORMINDO'),
      say('Perdeu a vez. Que reflexo de lixo!', 'RINDO', true),
    ],
    devil: [say('O tempo acabou para ele.', 'DIABO')],
  },
  ROUND_WIN_ME: {
    normal: fromVoice(ARENA_TEXTS.roundEnd.mineLine, 'RINDO', 'round-vitoria'),
    devil: [say('Venceu um round. A sorte acaba.', 'DIABO')],
  },
  ROUND_WIN_OPPONENT: {
    normal: fromVoice(ARENA_TEXTS.roundEnd.opponentsLine, 'DEBOCHADO', 'round-derrota'),
    devil: [say('Entregue-se.', 'DIABO')],
  },
  ROUND_DRAW: {
    normal: [
      say('Empatou. Que sem graça!', 'DEBOCHADO'),
      say('Ninguém ganhou. Que tédio.', 'DORMINDO'),
    ],
    devil: [say('Nem a morte decide. Que pena.', 'DIABO')],
  },
  MATCH_POINT_ME: {
    normal: fromVoice(ARENA_TEXTS.roundIntro.matchPointLine(true), 'DEBOCHADO', 'match-point-eu'),
    devil: [],
  },
  MATCH_POINT_OPPONENT: {
    normal: fromVoice(
      ARENA_TEXTS.roundIntro.matchPointLine(false),
      'MUITO_BRAVO',
      'match-point-oponente',
    ),
    devil: [],
  },
  SUDDEN_DEATH_START: {
    normal: fromVoice(ARENA_TEXTS.suddenDeath.line, 'MUITO_BRAVO', 'morte-subita'),
    devil: [say('Bem-vindo ao inferno.', 'DIABO'), say('Aqui não tem volta.', 'DIABO')],
  },
  WO_WIN_ME: {
    normal: fromVoice(RESULT_TEXTS.lines.WO_WIN, 'RINDO', 'wo-vitoria'),
    devil: [say('Fugiu da luta. Covarde.', 'DIABO')],
  },
  WO_WIN_OPPONENT: {
    normal: fromVoice(RESULT_TEXTS.lines.WO_LOSS, 'MUITO_BRAVO', 'wo-derrota'),
    devil: [say('Você abandonou o próprio inferno.', 'DIABO')],
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
  const abilityVoice = abilityId ? ABILITY_TEXTS.lines[abilityId] : undefined
  const abilityLines =
    abilityId && abilityVoice
      ? fromVoice(abilityVoice, 'SURPRESO', `habilidade-${abilityId.toLowerCase()}`)
      : []

  // O texts.ts só tem fala para o 1º e o 2º estouro
  const timeoutCount = ctx.myTimeouts ? Math.min(ctx.myTimeouts, 2) : null
  const timeoutLines = timeoutCount
    ? fromVoice(
        ARENA_TEXTS.timeout.mine(timeoutCount),
        'MUITO_BRAVO',
        `tempo-esgotado-${timeoutCount}`,
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
