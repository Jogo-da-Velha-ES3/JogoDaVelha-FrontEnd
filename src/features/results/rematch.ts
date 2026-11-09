import { RESULT_TEXTS, voiceText } from '../../constants/texts'
import type { RematchCancelReason } from '../../stores/matchStore'

/**
 * Aviso de revanche cancelada [RN-POS-02]. Quem pediu vê o motivo e vai para o Hub; quem não
 * pediu continua no Resultado, com a revanche desabilitada. `filterOn`: filtro de linguagem das
 * Configurações (a saída do oponente tem fala do narrador).
 */
export function rematchCancelledMessage(
  reason: RematchCancelReason,
  requestedByMe: boolean,
  filterOn: boolean,
): string {
  const T = RESULT_TEXTS.rematch
  switch (reason) {
    case 'TIMEOUT':
      return requestedByMe ? T.timeoutRequester : T.timeoutOther
    case 'DECLINED':
      return requestedByMe ? T.declinedRequester : T.declinedOther
    case 'LEFT':
      return voiceText(T.opponentLeft, filterOn)
  }
}
