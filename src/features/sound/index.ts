import { useBoardStore } from '../../stores/boardStore'
import { useMatchStore } from '../../stores/matchStore'
import { useRoomStore } from '../../stores/roomStore'
import type { ServerEvent } from '../../types/events'
import type { Cell } from '../../types/game'
import { loadSounds, playSound, setupAudioUnlock, stopSound } from './soundManager'
import { abilitySoundKey, COINS_DELAY_MS } from './soundMap'

export { playSound, stopSound, soundSettings } from './soundManager'
export type { SoundKey } from './soundMap'

let started = false

/**
 * Clique de botão: só em botões de menu. Durante a partida (PLAYING) os botões são jogadas e
 * habilidades, que só podem soar depois da confirmação do servidor. Para silenciar um botão
 * específico em qualquer tela, coloque data-sound="off" nele.
 */
function setupButtonSounds() {
  document.addEventListener(
    'click',
    (e) => {
      if (useRoomStore.getState().phase === 'PLAYING') return
      const target =
        e.target instanceof Element ? e.target.closest('button, a, [role="button"]') : null
      if (!target) return
      if (target.matches(':disabled, [aria-disabled="true"], [data-sound="off"]')) return
      playSound('botao')
    },
    true,
  )
}

/** Chamar uma vez ao abrir o app */
export function initSound() {
  if (started) return
  started = true
  loadSounds()
  setupAudioUnlock()
  setupButtonSounds()
}

/**
 * Único lugar que decide qual som toca para cada evento CONFIRMADO pelo servidor.
 * Só é chamada por applyServerEvent (antes de ele atualizar as stores), nunca pelo clique do jogador.
 */
export function playSoundForServerEvent(event: ServerEvent) {
  switch (event.type) {
    case 'BOARD_UPDATE':
      // O servidor também manda o tabuleiro no fim de cada turno, no estouro de tempo, no começo
      // do round e depois das habilidades: só é jogada quando aparece uma peça nova
      if (occupied(event.payload.board) > occupied(useBoardStore.getState().cells)) {
        playSound('jogada')
      }
      return

    case 'ABILITY_RESOLVED':
      playSound(abilitySoundKey(event.payload.ability))
      return

    case 'TURN_TIMEOUT':
      playSound('estouro-tempo')
      return

    case 'ROUND_END':
      playSound('fim-round')
      return

    case 'MATCH_END': {
      // Repetido (ex: reenviado numa reconexão): não toca de novo
      if (useMatchStore.getState().outcome !== null) return

      const { outcome, coins } = event.payload
      const me = useRoomStore.getState().mySlot

      // No último round, o fim de round e o resultado chegam juntos: o resultado manda
      stopSound('fim-round')

      if (outcome.kind === 'ABSOLUTE_DRAW') playSound('empate')
      else playSound(outcome.winner === me ? 'vitoria' : 'derrota')

      if (me && coins[me] > 0) setTimeout(() => playSound('coins'), COINS_DELAY_MS)
      return
    }

    default:
      // ROOM_SNAPSHOT (reconexão) e os demais não tocam som. A sirene da Morte Súbita toca na
      // entrada dela, depois do sorteio (features/match/suddenDeathSounds.ts)
      return
  }
}

const occupied = (board: Cell[]) => board.filter((cell) => cell.owner !== null).length
