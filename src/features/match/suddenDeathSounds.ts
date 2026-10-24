/**
 * Ganchos de som da Morte Súbita (FE-13 Parte 5).
 *
 * Este módulo define os pontos de integração para os sons da Morte Súbita e chama o motor de
 * som (FE-37, features/sound). Só a sirene tem arquivo por enquanto; as outras funções ficam
 * vazias até a FE-38 (banco de sons) trazer a trilha acelerada, o coração e o tique-taque.
 *
 * Responsabilidade do respeito a "som desligado" (FE-39): será do motor de som (FE-37).
 * Este módulo apenas define OS MOMENTOS em que cada som deve disparar.
 *
 * Sons da Morte Súbita (conforme PROJECT_CONTEXT.md §9):
 * - Trilha acelerada: música de fundo durante todo o round 3
 * - Sirene: alerta sonoro na entrada da Morte Súbita
 * - Batida de coração: batimento que acelera com o timer, durante todo o round 3
 * - Tique-taque: som de relógio nos 3 últimos segundos do turno
 *
 * MOMENTOS DE DISPARO (implementados em useSuddenDeathSounds):
 * - Round 3 (suddenDeath vira true):
 *   → startSuddenDeathMusic() - loop
 *   → startHeartbeat() - loop
 *
 * - Entrada da Morte Súbita (depois do sorteio, antes do primeiro turno):
 *   → playSuddenDeathSiren() - som único
 *
 * - Durante PLAYING com 1-3 segundos restantes:
 *   → startTickTock() - loop
 *   → stopTickTock() quando sai da faixa ou turno termina
 *
 * - Saída (suddenDeath vira false ou componente desmonta):
 *   → stopSuddenDeathMusic()
 *   → stopHeartbeat()
 *   → stopTickTock()
 */
import { playSound } from '../sound/soundManager'

/**
 * Inicia a trilha acelerada da Morte Súbita.
 * Dispara na entrada do round 3 (quando suddenDeath vira true).
 *
 * TODO FE-37/FE-38: implementar com Howler.play('sudden-death-music', { loop: true })
 */
export function startSuddenDeathMusic(): void {
  // Vazio até FE-37/38
}

/**
 * Para a trilha acelerada da Morte Súbita.
 * Dispara ao sair do round 3 ou ao desmontar o componente.
 *
 * TODO FE-37/FE-38: implementar com Howler.stop('sudden-death-music')
 */
export function stopSuddenDeathMusic(): void {
  // Vazio até FE-37/38
}

/**
 * Toca a sirene de alerta da Morte Súbita (som único, não loop).
 * Dispara na entrada da Morte Súbita, junto com o flash e o banner.
 */
export function playSuddenDeathSiren(): void {
  playSound('morte-subita')
}

/**
 * Inicia a batida de coração da Morte Súbita.
 * Dispara no início do round 3 e continua durante todo o round.
 * A batida deve acelerar conforme o timer diminui.
 *
 * TODO FE-37/FE-38: implementar com Howler.play('heartbeat', { loop: true })
 * e ajustar a taxa de reprodução conforme o timer (rate scaling)
 */
export function startHeartbeat(): void {
  // Vazio até FE-37/38
}

/**
 * Para a batida de coração da Morte Súbita.
 * Dispara ao sair do round 3 ou ao desmontar o componente.
 *
 * TODO FE-37/FE-38: implementar com Howler.stop('heartbeat')
 */
export function stopHeartbeat(): void {
  // Vazio até FE-37/38
}

/**
 * Inicia o tique-taque do relógio (3 últimos segundos do turno).
 * Dispara quando faltam 3 segundos no turno do jogador ou do oponente.
 *
 * TODO FE-37/FE-38: implementar com Howler.play('tick-tock', { loop: true })
 */
export function startTickTock(): void {
  // Vazio até FE-37/38
}

/**
 * Para o tique-taque do relógio.
 * Dispara quando o turno termina (jogada feita ou tempo esgotado) ou quando
 * o timer sai da faixa de 3 segundos.
 *
 * TODO FE-37/FE-38: implementar com Howler.stop('tick-tock')
 */
export function stopTickTock(): void {
  // Vazio até FE-37/38
}
