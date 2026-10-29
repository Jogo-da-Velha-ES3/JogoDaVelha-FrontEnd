// Falas PROVISÓRIAS do Vitão, só para o motor funcionar e ser testado.
// A FE-43 troca por as falas de verdade (e a FE-40 define o guia de tom).
// `explicit: true` = fala sem filtro, que some quando o filtro das Configurações está ligado.
import type { VitaoExpression, VitaoLine, VitaoLines } from './vitao'

const say = (text: string, expression: VitaoExpression, explicit = false): VitaoLine => ({
  text,
  expression,
  explicit,
})

export const VITAO_LINES: VitaoLines = {
  MOVE_ME: {
    normal: [
      say('Boa, hein? Até eu fiquei surpreso.', 'SURPRESO'),
      say('Jogou assim de propósito?', 'DEBOCHADO'),
    ],
    devil: [say('Cada peça sua é uma alma a menos.', 'DIABO')],
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
  ABILITY_OPPONENT: {
    normal: [
      say('Ih, o rival tirou habilidade da manga!', 'SURPRESO'),
      say('Isso vai doer.', 'BRAVO'),
    ],
    devil: [say('Poderes? Aqui embaixo também temos.', 'DIABO')],
  },
  ABILITY_ABSORBED: {
    normal: [
      say('Anulada! Campo de Força na cara.', 'RINDO'),
      say('Nada feito, parceiro.', 'DEBOCHADO'),
    ],
    devil: [say('Nem o escudo te salva aqui.', 'DIABO')],
  },
  ABILITY_NO_EFFECT: {
    normal: [
      say('Gastou a habilidade à toa. Genial.', 'DEBOCHADO'),
      say('Que desperdício, hein? Lixo de jogada.', 'DEBOCHADO', true),
    ],
    devil: [say('Poder jogado fora. Delicioso.', 'DIABO')],
  },
  TIMEOUT_ME: {
    normal: [say('Acorda! O tempo acabou.', 'BRAVO'), say('Dormiu no ponto, campeão.', 'DORMINDO')],
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
    normal: [
      say('Round seu! Continua assim.', 'RINDO'),
      say('Isso! Quero ver o próximo.', 'SURPRESO'),
    ],
    devil: [say('Venceu um round. A sorte acaba.', 'DIABO')],
  },
  ROUND_WIN_OPPONENT: {
    normal: [
      say('Perdeu o round. Respira e volta.', 'MUITO_BRAVO'),
      say('Que vexame, hein? Patético.', 'DEBOCHADO', true),
    ],
    devil: [say('Entregue-se.', 'DIABO')],
  },
  ROUND_DRAW: {
    normal: [
      say('Empatou. Que sem graça!', 'DEBOCHADO'),
      say('Ninguém ganhou. Que tédio.', 'DORMINDO'),
    ],
    devil: [say('Nem a morte decide. Que pena.', 'DIABO')],
  },
  SUDDEN_DEATH_START: {
    normal: [say('MORTE SÚBITA! Segura essa!', 'MUITO_BRAVO')],
    devil: [say('Bem-vindo ao inferno.', 'DIABO'), say('Aqui não tem volta.', 'DIABO')],
  },
  WO_WIN_ME: {
    normal: [say('O rival sumiu! Vitória por W.O.!', 'RINDO')],
    devil: [say('Fugiu da luta. Covarde.', 'DIABO')],
  },
  WO_WIN_OPPONENT: {
    normal: [say('Três vezes sem jogar? W.O. na conta.', 'MUITO_BRAVO')],
    devil: [say('Você abandonou o próprio inferno.', 'DIABO')],
  },
}
