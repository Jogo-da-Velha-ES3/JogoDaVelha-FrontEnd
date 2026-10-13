import type { AbilityId } from '../types/game'

/** Quem a habilidade mira quando o jogador escolhe o alvo. */
export type AbilityTarget =
  | 'OPPONENT_PIECE' // peça do oponente
  | 'EMPTY_CELL' // casa vazia
  | 'OWN_PIECE' // peça própria
  | 'NONE' // sem alvo: só confirmar

export type AbilityKind = 'OFENSIVA' | 'DEFENSIVA' | 'MOVIMENTO'

export interface AbilityInfo {
  name: string
  kind: AbilityKind
  target: AbilityTarget
  /** Tornado e Troca Rápida: depois da peça, o jogador escolhe a casa vizinha de destino */
  needsDestination: boolean
  /** Anulada pelo Campo de Força do alvo [RN-ARN-04] */
  blockedByForceField: boolean
  description: string
}

// Catálogo das 10 habilidades [RF-ARN-03]
export const ABILITY_INFO: Record<AbilityId, AbilityInfo> = {
  BOMBA: {
    name: 'Bomba',
    kind: 'OFENSIVA',
    target: 'OPPONENT_PIECE',
    needsDestination: false,
    blockedByForceField: true,
    description: 'Remove 1 peça do oponente, desocupando a casa.',
  },
  ESCUDO: {
    name: 'Escudo',
    kind: 'DEFENSIVA',
    target: 'EMPTY_CELL',
    needsDestination: false,
    blockedByForceField: false,
    description: 'Bloqueia 1 casa vazia por 2 turnos contra marcações do oponente.',
  },
  AMPULHETA: {
    name: 'Ampulheta',
    kind: 'OFENSIVA',
    target: 'NONE',
    needsDestination: false,
    blockedByForceField: true,
    description: 'Reduz o tempo do próximo turno do oponente para 5 segundos.',
  },
  TORNADO: {
    name: 'Tornado',
    kind: 'OFENSIVA',
    target: 'OPPONENT_PIECE',
    needsDestination: true,
    blockedByForceField: true,
    description: 'Move 1 peça do oponente para uma casa vizinha vazia.',
  },
  BURACO_NEGRO: {
    name: 'Buraco Negro',
    kind: 'OFENSIVA',
    target: 'OPPONENT_PIECE',
    needsDestination: false,
    blockedByForceField: true,
    description: 'Move 1 peça do oponente para uma casa vazia aleatória.',
  },
  CONGELAR: {
    name: 'Congelar',
    kind: 'OFENSIVA',
    target: 'OPPONENT_PIECE',
    needsDestination: false,
    blockedByForceField: true,
    description: 'Congela 1 peça do oponente por 2 turnos: ela não conta para a vitória.',
  },
  CAMPO_DE_FORCA: {
    name: 'Campo de Força',
    kind: 'DEFENSIVA',
    target: 'NONE',
    needsDestination: false,
    blockedByForceField: false,
    description: 'Por 2 turnos, anula a primeira habilidade ofensiva recebida.',
  },
  SILENCIO: {
    name: 'Silêncio',
    kind: 'OFENSIVA',
    target: 'NONE',
    needsDestination: false,
    blockedByForceField: true,
    description: 'Impede o oponente de usar habilidades no próximo turno dele.',
  },
  TROCA_RAPIDA: {
    name: 'Troca Rápida',
    kind: 'MOVIMENTO',
    target: 'OWN_PIECE',
    needsDestination: true,
    blockedByForceField: false,
    description: 'Move 1 peça sua para uma casa vizinha vazia.',
  },
  REFORCO: {
    name: 'Reforço',
    kind: 'DEFENSIVA',
    target: 'OWN_PIECE',
    needsDestination: false,
    blockedByForceField: false,
    description:
      'Protege 1 peça sua contra Bomba, Tornado e Buraco Negro por 2 turnos. Não protege contra Congelar.',
  },
}
