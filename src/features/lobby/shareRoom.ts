// Copiar código e copiar/compartilhar o link da sala (FE-26) [RF-SAL-02].
import { ROOM_TEXTS } from '../../constants/texts'
import { roomPath } from '../../routes/paths'

/** Link direto da sala, ex: https://…/sala/4821 [RF-SAL-03]. Abre a sala (ou o Acesso e depois ela). */
export const roomLink = (code: string, origin = window.location.origin) =>
  `${origin}${roomPath(code)}`

/** Copia para a área de transferência; false se o navegador não deixou (sem HTTPS, sem permissão) */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** O celular tem a folha de compartilhamento nativa (Web Share)? */
export const canShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Compartilha o link pela folha nativa do celular; sem ela (desktop) ou se ela falhar, copia o link.
 * Fechar a folha sem escolher nada é "cancelled": não é erro e não copia nada.
 */
export async function shareRoomLink(code: string): Promise<ShareResult> {
  const url = roomLink(code)
  if (canShare()) {
    try {
      await navigator.share({
        title: 'Jogo do Velho',
        text: ROOM_TEXTS.shareText(code),
        url,
      })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Outro erro (ex: permissão negada): tenta copiar
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed'
}
