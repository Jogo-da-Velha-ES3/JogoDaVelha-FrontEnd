/**
 * Sons da Morte Súbita.
 *
 * O hook useSuddenDeathSounds chama estas funções nos momentos certos.
 * O motor de som cuida do volume, do mudo e da reprodução dos arquivos.
 */
import {
  playLoopSound,
  playMusic,
  playSound,
  stopLoopSound,
  stopMusic,
} from '../sound/soundManager'

/** Inicia a trilha acelerada durante o round 3. */
export function startSuddenDeathMusic(): void {
  playMusic('trilha-morte-subita')
}

/** Para a trilha acelerada ao sair do round 3. */
export function stopSuddenDeathMusic(): void {
  stopMusic('trilha-morte-subita')
}

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
