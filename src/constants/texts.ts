// Voz do jogo (FE-40): as frases da interface num lugar só, separadas por tela. O tom e as regras
// (sem filtro / com filtro, o que nunca falar) estão em docs/VOICE_GUIDE.md.
//
// Ficam aqui as frases que o jogador lê: anúncios, banners, avisos, toasts, status ("Aguardando…"),
// instruções e erros. Rótulos curtos de botão, aba, campo e cartão, e os aria-label, ficam nos
// componentes. Como Jogar continua em features/hub/howToPlayTexts.ts e as falas do Vitão em
// features/vitao/vitaoLines.ts (FE-43).
//
// As falas com piada são do narrador, gravadas pelo Rafik: a versão sem filtro (padrão) é a [E] e a
// com filtro é a [C]. Os números de regra vêm de constants/game.ts.
import type { ResultKind } from '../lib/result'
import type { AbilityId } from '../types/game'
import { MAX_CONSECUTIVE_TIMEOUTS, SUDDEN_DEATH_TURN_DURATION_SECONDS } from './game'

/**
 * Fala com piada: a versão sem filtro aparece por padrão; a filtrada, quando o filtro das
 * Configurações está ligado. `filtered: null` é a fala que some com o filtro.
 */
export interface VoiceLine<Filtered extends string | null = string> {
  unfiltered: string
  filtered: Filtered
}

/** A versão da fala para o filtro atual (nos componentes, use o `useVoice`) */
export const voiceText = <F extends string | null>(
  line: VoiceLine<F>,
  filterOn: boolean,
): string | F => (filterOn ? line.filtered : line.unfiltered)

/** Junta as partes de uma linha com " · ", sem as vazias (ex: a fala que sumiu com o filtro) */
export const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ')

const timeoutCount = (count: number) => `${count}/${MAX_CONSECUTIVE_TIMEOUTS}`

// ── App: avisos que valem para qualquer tela ──
export const APP_TEXTS = {
  rotateTitle: 'Gire o celular',
  rotateBody: 'O Jogo do Velho é jogado com o celular deitado.',
  notFoundTitle: 'Página não encontrada',
  notFoundBody: 'Esse endereço não existe ou o link da sala está errado.',
  errors: {
    network: 'Não foi possível falar com o servidor. Verifique sua conexão.',
    httpStatus: (status: number) => `Erro ${status} ao falar com o servidor.`,
    connectTimeout: 'Não foi possível conectar ao servidor. Tentando de novo…',
    connectionRefused: 'O servidor recusou a conexão.',
    notConnected: 'Sem conexão com o servidor. Tentando reconectar…',
    actionFailed: 'Não foi possível fazer essa ação.',
  },
} as const

// ── Acesso: entrar, criar conta e recuperar a senha ──
export const ACCESS_TEXTS = {
  accountCreated: 'Conta criada! Agora é só entrar com sua senha.',
  /** Sempre este texto, exista o e-mail ou não: o pedido nunca revela se a conta existe */
  forgotPasswordSent:
    'Se esse e-mail estiver cadastrado, você vai receber um link para criar uma senha nova.',
  passwordChanged: 'Senha alterada! Entre com a senha nova.',
  /** Link sem token, inválido, expirado ou já usado: a tela "Nova senha" mostra este texto */
  invalidResetLink: 'Esse link expirou ou não é válido. Peça um novo.',
  errors: {
    generic: 'Não foi possível concluir agora. Tente de novo em instantes.',
    invalidData: 'Confira os dados e tente de novo.',
    /** Mensagem única e neutra: não revela se o usuário existe */
    invalidCredentials: 'E-mail, usuário ou senha incorretos.',
    usernameTaken: 'Esse nome de usuário já está em uso.',
    emailTaken: 'Esse e-mail já tem uma conta. Tente entrar.',
    resetFailed: 'Não foi possível redefinir a senha agora. Tente novamente mais tarde.',
    forgotFailed: 'Não foi possível enviar o pedido agora. Tente novamente mais tarde.',
  },
  validation: {
    usernameRequired: 'Informe um nome de usuário.',
    usernameLength: (min: number, max: number) =>
      `O nome de usuário deve ter de ${min} a ${max} caracteres.`,
    emailRequired: 'Informe seu e-mail.',
    emailInvalid: 'E-mail inválido.',
    passwordRequired: 'Informe uma senha.',
    passwordLength: (min: number, max: number) => `A senha deve ter de ${min} a ${max} caracteres.`,
    identifierRequired: 'Informe seu e-mail ou nome de usuário.',
    identifierTooLong: 'E-mail ou usuário longo demais.',
    loginPasswordRequired: 'Informe sua senha.',
    passwordsDiffer: 'As senhas não coincidem.',
  },
} as const

// ── Hub ──
export const HUB_TEXTS = {
  logoutTitle: 'Quer mesmo sair?',
  logoutBody: 'Você vai precisar entrar de novo com seu e-mail ou usuário e senha.',
} as const

// ── Sala: criar, entrar, Sala de Espera e "Match feito" ──
export const ROOM_TEXTS = {
  roomOf: (host: string) => `Sala de ${host}`,
  waitingOpponent: 'Aguardando adversário…',
  codeCopied: 'Código copiado!',
  codeCopyFailed: (code: string) => `Não deu para copiar. O código é ${code}.`,
  linkCopied: 'Link copiado!',
  linkCopyFailed: 'Não deu para copiar o link. Passe o código da sala.',
  shareText: (code: string) => `Bora jogar? Entra na minha sala do Jogo do Velho (código ${code}):`,
  matchFound: 'Match feito!',
  opponentJoined: (name: string) => `${name} entrou!`,
  preparationIn: 'Preparação em',
  preparing: 'Preparando…',
  reconnecting: 'Reconectando…',
  errors: {
    notFound: (code: string) => `Sala ${code} não encontrada.`,
    full: (code: string) => `A sala ${code} já está cheia.`,
    alreadyStarted: (code: string) => `A partida da sala ${code} já começou.`,
    fullOrStarted: (code: string) => `A sala ${code} está cheia ou a partida já começou.`,
    createFailed: 'Não foi possível criar a sala agora.',
    joinFailed: 'Não foi possível entrar na sala agora.',
  },
} as const

// ── Preparação ──
export const DRAFT_TEXTS = {
  missingCharacter: 'Falta: personagem',
  missingAbilities: (picked: number, total: number) => `Falta: habilidades (${picked}/${total})`,
  chooseCharacter: 'Escolha seu personagem',
  characterHint: 'O personagem altera apenas a aparência do seu lado.',
  reservedBy: (name: string) => `Reservado por ${name}`,
  abilitiesHint: (picked: number, total: number) =>
    `Selecione exatamente ${total}. ${picked}/${total} escolhidas.`,
  shopHint: 'Quer mais opções de habilidades? Desbloqueie novas habilidades na Loja.',
  waitingOpponent: 'Aguardando oponente…',
  opponentReady: 'Oponente pronto.',
  opponentChoosing: 'Oponente escolhendo.',
  /** Reta final dos 20s: o que falta escolher */
  timeWarning: (seconds: number, missing: string) =>
    `Faltam ${seconds}s! Escolha ${missing}, senão o jogo escolhe por você.`,
  missingCharacterWarning: 'seu personagem',
  missingAbilitiesWarning: (total: number) => `suas ${total} habilidades`,
} as const

// ── Arena ──
export const ARENA_TEXTS = {
  you: 'Você',
  opponent: 'Oponente',
  /** Rótulo do round, no canto superior esquerdo */
  roundLabel: {
    versus: 'Confronto',
    roundEnd: (round: number) => `Fim do round ${round}`,
    suddenDeath: (round: number) => `Round ${round} · Morte Súbita`,
    normal: (round: number) => `Round ${round} · MD3`,
  },
  /** Tela de Confronto, abaixo do VS */
  versusLine: 'É hora do duelo!',
  /** Apresentação do round (depois do sorteio) */
  roundIntro: {
    bestOf: 'Melhor de 3',
    title: (round: number) => `Round ${round}! Valendo!`,
    matchPoint: (leader: string) => `Match Point · ${leader}`,
    /** "A cabeça dele": só cabe quando quem está na frente é o jogador */
    matchPointLine: (iAmAhead: boolean): VoiceLine =>
      iAmAhead
        ? { unfiltered: 'A cabeça dele tá por um fio!', filtered: 'Mais uma e já era!' }
        : { unfiltered: 'Mais uma e já era!', filtered: 'Mais uma e já era!' },
    flipping: 'sorteando quem começa…',
    alternates: 'alterna a cada round',
    youStart: 'Você começa',
    starts: (name: string) => `${name} começa`,
  },
  turn: {
    yours: 'Sua vez',
    hint: 'Toque numa casa ou use uma habilidade',
    opponents: (name: string) => `Vez de ${name}…`,
  },
  roundEnd: {
    mine: 'Round seu!',
    opponents: 'Round do oponente',
    draw: 'Round empatado',
    score: (mine: number, theirs: number) => `Placar ${mine} × ${theirs}`,
    mineLine: {
      unfiltered: 'Mostra pra esses velhos como é que faz',
      filtered: null,
    } satisfies VoiceLine<null>,
    opponentsLine: {
      unfiltered: 'Tô achando que o velho aqui é você!',
      filtered: null,
    } satisfies VoiceLine<null>,
  },
  /** Toast de turno perdido (TURN_TIMEOUT), só para o 1º e o 2º estouro; o W.O. é banner */
  timeout: {
    title: 'Tempo esgotado!',
    mine: (count: number): VoiceLine =>
      count === 1
        ? { unfiltered: 'Tá dormindo na rede?!', filtered: 'É, cê perdeu a vez' }
        : { unfiltered: 'Acorda pra vida, mané! Mais um e é W.O.', filtered: 'Mais um e é W.O.!' },
    opponentTitle: 'Oponente perdeu a vez',
    count: timeoutCount,
  },
  /** Fim do round 3 com o placar igual [RN-ARN-06] */
  absoluteDraw: {
    title: 'Empate absoluto',
    nobody: 'É… ninguém levou.',
    finalScore: (mine: number, theirs: number) => `Placar final ${mine} × ${theirs}`,
    coinsEach: (coins: number) => `+${coins} Coins para cada`,
  },
  suddenDeath: {
    title: 'Morte Súbita',
    line: { unfiltered: 'A cobra vai fumar…', filtered: 'Nem pensa em errar!' } satisfies VoiceLine,
    // Por extenso: o Banner põe tudo em maiúsculas, e "5S" não se lê
    perMove: `${SUDDEN_DEATH_TURN_DURATION_SECONDS} segundos por jogada`,
  },
  opponentDisconnected: {
    title: 'Oponente desconectado',
    line: {
      unfiltered: 'Será que roubaram o fio do poste dele?',
      filtered: 'Os turnos dele continuam correndo',
    } satisfies VoiceLine,
  },
  quit: {
    title: 'Desistir?',
    body: 'A partida conta como derrota e o oponente vence por W.O.',
  },
} as const

// ── Habilidades: aviso da habilidade resolvida, deck, mira e sorteio ──
export const ABILITY_TEXTS = {
  used: (byMe: boolean, name: string) => `${byMe ? 'Você' : 'Oponente'} usou ${name}`,
  absorbed: 'Anulada pelo Campo de Força!',
  noEffect: 'Sem efeito!',
  absorbedLine: { unfiltered: 'Babaca!', filtered: null } satisfies VoiceLine<null>,
  noEffectLine: {
    unfiltered: 'Cê tá cego ou tá se fazendo, hein?!',
    filtered: 'Nada aconteceu.',
  } satisfies VoiceLine,
  /**
   * Fala do narrador no aviso da habilidade do oponente (o nome dela já está no aviso). Só o
   * oponente é anunciado: o "Agora cê tá protegido" do Campo de Força [C] fala com quem ativou,
   * então com o filtro ele fica sem fala.
   */
  lines: {
    BOMBA: {
      unfiltered: 'Bota o capacete que lá vem pedra!',
      filtered: 'O espaço tá livre de novo.',
    },
    ESCUDO: {
      unfiltered: 'Quero ver invadir a casa do velho agora!',
      filtered: 'Posição bloqueada.',
    },
    AMPULHETA: {
      unfiltered: 'Botaram o pé no teu acelerador…',
      filtered: 'Olha o tempo passando rápido…',
    },
    TORNADO: { unfiltered: 'Agora é barata voa…', filtered: 'O velho trocou de fila.' },
    BURACO_NEGRO: {
      unfiltered: 'Acho que sugou demais, hein?',
      filtered: 'Alguém viu onde ele foi parar?',
    },
    CONGELAR: { unfiltered: 'Tá que nem picolé!', filtered: 'Fica frio aí!' },
    CAMPO_DE_FORCA: { unfiltered: 'Agora não passa nem wi-fi.', filtered: null },
    SILENCIO: { unfiltered: 'Cala a boca e joga!', filtered: 'Sem habilidade pra você.' },
    TROCA_RAPIDA: { unfiltered: 'Cê vai pra onde?', filtered: 'Cê vai pra onde?' },
    REFORCO: { unfiltered: 'Quero ver me pegar agora.', filtered: 'Quero ver me pegar agora.' },
  } satisfies Record<AbilityId, VoiceLine<string | null>>,
  deck: {
    waitingDeck: 'Aguardando o deck do servidor…',
    waitingConfirmation: 'Aguardando confirmação do servidor…',
    silenced: {
      unfiltered: 'Silenciado! Cala a boca e joga!',
      filtered: 'Silenciado! Sem habilidade pra você neste turno.',
    } satisfies VoiceLine,
    confirmTitle: (name: string) => `Usar ${name}?`,
  },
  /** Instrução da mira, ex: "Tornado: agora escolha a casa de destino" */
  aim: {
    OPPONENT_PIECE: 'escolha uma peça do oponente',
    OWN_PIECE: 'escolha uma peça sua',
    EMPTY_CELL: 'escolha uma casa vazia',
    destination: 'agora escolha a casa de destino',
    step: (ability: string, step: string) => `${ability}: ${step}`,
  },
  draw: {
    title: 'Sorteio da 3ª habilidade',
    choose: 'Escolha uma carta para completar seu deck.',
    chosen: 'Esta é a sua 3ª habilidade nesta rodada.',
    waitingOpponent: 'Aguardando o oponente…',
    waitingCards: 'Aguardando as cartas do servidor…',
    sending: 'Enviando escolha ao servidor…',
    expired: 'Tempo esgotado. Aguardando a escolha automática do servidor…',
  },
} as const

// ── Resultado e revanche ──
const victoryLine: VoiceLine = {
  unfiltered: 'Botou na mesa e mandou medir…',
  filtered: 'Você venceu a partida.',
}

export const RESULT_TEXTS = {
  /** Em caixa normal: o CSS põe em maiúsculas, como nos outros anúncios */
  titles: {
    WIN_FLAWLESS: 'Vitória impecável', // só o 2×0 [RF-POS-01]
    WIN: 'Vitória',
    LOSS: 'Derrota',
    DRAW: 'Empate absoluto',
    WO_WIN: 'Vitória por W.O.',
    WO_LOSS: 'Derrota por W.O.',
  } satisfies Record<ResultKind, string>,
  /**
   * Linha abaixo do título. No W.O. é a mesma do banner da Arena. O empate absoluto fica só com o
   * título, porque o placar já aparece na coluna da direita.
   */
  lines: {
    WIN_FLAWLESS: victoryLine,
    WIN: victoryLine,
    LOSS: { unfiltered: 'É a vergonha da profissão.', filtered: 'Você perdeu a partida.' },
    DRAW: null,
    WO_WIN: {
      unfiltered: 'O oponente… arregou!',
      filtered: `O oponente esgotou o tempo ${MAX_CONSECUTIVE_TIMEOUTS} vezes`,
    },
    WO_LOSS: {
      unfiltered: 'Assoprou a velhinha errada, hein… entendeu?',
      filtered: 'Que desperdício de tempo…',
    },
  } satisfies Record<ResultKind, VoiceLine | null>,
  pending: 'Apurando o resultado…',
  rematch: {
    opponent: 'O oponente',
    opponentWants: (name: string) => `${name} quer revanche!`,
    waiting: (name: string) => `Revanche pedida! Esperando ${name} aceitar…`,
    /** Revanche cancelada [RN-POS-02]: para quem pediu (e vai ao Hub) e para quem fica */
    timeoutRequester: 'O oponente não respondeu a tempo. A sala foi encerrada.',
    timeoutOther: 'O tempo para aceitar a revanche acabou.',
    declinedRequester: 'O oponente recusou a revanche.',
    declinedOther: 'Você recusou a revanche.',
    opponentLeft: {
      unfiltered: 'O oponente sentiu a pressão, neném!',
      filtered: 'O oponente saiu da sala.',
    } satisfies VoiceLine,
  },
} as const
