/**
 * Sons da Morte Súbita.
 *
 * O hook useSuddenDeathSounds chama estas funções nos momentos certos.
 * O motor de som cuida do volume, do mudo e da reprodução dos arquivos.
 * A trilha acelerada não fica aqui: ela é escolhida pela fase da sala, como as outras trilhas
 * (lib/roomMusic.ts), para uma trilha só tocar por vez.
 */
import { playLoopSound, playSound, stopLoopSound } from '../sound/soundManager'

/** Toca a sirene de alerta da Morte Súbita uma vez. */
export function playSuddenDeathSiren(): void {
  playSound('morte-subita')
}

/** Inicia a batida de coração em loop durante o round 3. */
export function startHeartbeat(): void {
  playLoopSound('coracao')
}

/** Para a batida de coração. */
export function stopHeartbeat(): void {
  stopLoopSound('coracao')
}

/** Inicia o tique-taque em loop nos 3 últimos segundos do turno. */
export function startTickTock(): void {
  playLoopSound('tique-taque')
}

/** Para o tique-taque. */
export function stopTickTock(): void {
  stopLoopSound('tique-taque')
}
