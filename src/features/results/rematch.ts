import type { RematchCancelReason } from '../../stores/matchStore'

/**
 * Aviso de revanche cancelada [RN-POS-02]. Quem pediu vê o motivo e vai para o Hub; quem não
 * pediu continua no Resultado, com a revanche desabilitada.
 */
export function rematchCancelledMessage(
  reason: RematchCancelReason,
  requestedByMe: boolean,
): string {
  switch (reason) {
    case 'TIMEOUT':
      return requestedByMe
        ? 'O oponente não respondeu a tempo. A sala foi encerrada.'
        : 'O tempo para aceitar a revanche acabou.'
    case 'DECLINED':
      return requestedByMe ? 'O oponente recusou a revanche.' : 'Você recusou a revanche.'
    case 'LEFT':
      return 'O oponente saiu da sala.'
  }
}
