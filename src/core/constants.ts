/**
 * Unico arquivo de balanceamento do jogo (secao 3.3 do briefing).
 * Nenhum numero de regra de jogo deve aparecer fora daqui.
 */

export const RPG = {
  /** Vida maxima = HP_BASE + HP_PER_LEVEL * nivel. */
  HP_BASE: 100,
  HP_PER_LEVEL: 10,
  MAX_LEVEL: 10,
  /** XP necessario para sair do nivel N = XP_PER_LEVEL * N. */
  XP_PER_LEVEL: 100,
  /** XP da missao = MISSION_XP_BASE + MISSION_XP_PER_STAR * estrelas. */
  MISSION_XP_BASE: 50,
  MISSION_XP_PER_STAR: 30,
  /** Ao chegar a 0 de vida a maquina reinicia com esta fracao da vida maxima. */
  REBOOT_HP_RATIO: 0.5,
  /** Cura ao concluir uma missao, em fracao da vida maxima. */
  MISSION_HEAL_RATIO: 0.25,
  /** Acoes por turno no combate. */
  CLOCK_BASE: 2,
  /** Niveis em que o clock aumenta em 1. */
  CLOCK_LEVEL_UPS: [4, 8] as readonly number[],
  /** Ano inicial do mundo (relogio do HUD). */
  START_YEAR: 1642,
} as const;

export const SCORING = {
  /** Limiares de eficiencia para 2 e 3 estrelas. */
  STARS_2_EFFICIENCY: 0.85,
  STARS_3_EFFICIENCY: 1.0,
  /** Pontuacao da missao = round(MISSION_SCORE_FACTOR * eficiencia), limitada ao MAX. */
  MISSION_SCORE_FACTOR: 1000,
  MISSION_SCORE_MAX: 1500,
  /** Eficiencia maxima aceita por evaluate(). */
  EFFICIENCY_MAX: 1.5,
  /** Pontuacao do chefao = BOSS_BASE + BOSS_PER_HP * vidaRestante - BOSS_PER_TURN * turnos. */
  BOSS_BASE: 2000,
  BOSS_PER_HP: 10,
  BOSS_PER_TURN: 60,
  BOSS_SCORE_MIN: 200,
} as const;

export const POWERS = {
  /** Multiplicador de dano por nivel do poder (indice 0 = poder nao adquirido). */
  DAMAGE_MULTIPLIER: [0, 1.0, 1.25, 1.5] as readonly number[],
  /** Nivel 2 exige ao menos estas estrelas nas duas missoes da era. */
  LEVEL_2_MIN_STARS: 2,
  /** Nivel 3 exige ao menos estas estrelas nas duas missoes da era. */
  LEVEL_3_MIN_STARS: 3,
} as const;

export const BOSS = {
  HP: 600,
  /** Dano ao chefao = BASE_DAMAGE * multiplicador do poder * eficiencia. */
  BASE_DAMAGE: 40,
  /** Dano do ataque do chefao quando nao e neutralizado. */
  ATTACK_DAMAGE: 20,
  /** Eficiencia minima para neutralizar o ataque anunciado. */
  BLOCK_MIN_EFFICIENCY: 0.5,
  /** Cargas de Patch necessarias para lancar o Patch Day 0. */
  PATCH_REQUIRED: 3,
  /** Dano do Patch Day 0 quando os 3 micro-desafios sao concluidos. */
  PATCH_DAMAGE: 200,
  /** Quantidade de micro-desafios do Patch Day 0. */
  PATCH_CHALLENGES: 3,
} as const;

/** Ano de abertura de cada era, usado como relogio do mundo no HUD. */
export const ERA_YEARS = {
  mecanica: 1642,
  logica: 1936,
  codigo: 1950,
  redes: 1969,
  seguranca: 1991,
  ia: 2012,
} as const;

export const QUIZ = {
  /** Perguntas sorteadas por prova. */
  QUESTIONS: 4,
  /** Fracao de acertos para passar (arredondada para cima). */
  PASS_RATIO: 0.75,
  /** XP por acerto na prova da era. */
  XP_PER_CORRECT: 25,
} as const;

export const ITEMS = {
  /** Quantos exemplares do mesmo item cabem na mochila. */
  MAX_PER_ITEM: 3,
  /** Vida restaurada pela valvula reserva. */
  HEAL_VALUE: 40,
  /** Dano extra do modelo treinado, em fracao. */
  POWER_VALUE: 0.5,
} as const;

export const TIME = {
  /** Fuso usado para o desafio diario. */
  DAILY_TIMEZONE: 'America/Sao_Paulo',
} as const;

export const STORAGE = {
  KEY: 'davalvulaaia:save:v1',
  VERSION: 1,
} as const;

export const WORLD = {
  /** Lado do tile em pixels do mapa (pixel art 16x16). */
  TILE: 16,
  /** Zoom base ao desenhar: cada tile ocupa TILE * SCALE pixels na tela. */
  SCALE: 3,
  /** Tempo para andar uma celula, em milissegundos. */
  WALK_MS_PER_TILE: 160,
  /** Quadros do ciclo de caminhada por direcao no spritesheet. */
  WALK_FRAMES: 3,
  /** Troca de quadro da caminhada, em milissegundos. */
  FRAME_MS: 130,
} as const;

export const CIRCUIT = {
  /** Portas disponiveis na paleta dos Circuitos Logicos. */
  TYPES: ['NOT', 'AND', 'OR'] as readonly string[],
  /** Chaves de entrada do cofre, por dificuldade. */
  INPUTS: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Faixa de portas que a tabela sorteada pode exigir, por dificuldade. */
  MIN_GATES: { micro: 2, 1: 2, 2: 3, 3: 4 } as Record<string, number>,
  TOP_GATES: { micro: 2, 1: 3, 2: 5, 3: 6 } as Record<string, number>,
  /** Folga de portas acima da referencia que a solucao ainda aceita. */
  SLACK: { micro: 1, 1: 2, 2: 1, 3: 0 } as Record<string, number>,
  /** Sorteios de tabela antes de cair na varredura deterministica. */
  GEN_ATTEMPTS: 40,
} as const;

export const BITS = {
  /** Simbolos que a mensagem pode usar, na ordem em que entram na mesa. */
  SYMBOLS: ['A', 'B', 'C', 'D', 'E'] as readonly string[],
  /** Quantos simbolos diferentes a mensagem tem, por dificuldade. */
  COUNT: { micro: 3, 1: 3, 2: 4, 3: 5 } as Record<string, number>,
  /** Faixa de repeticoes de um simbolo na mensagem. */
  MIN_WEIGHT: 1,
  MAX_WEIGHT: 9,
  /** Comprimento maximo de um codigo, para a mesa caber na tela do celular. */
  MAX_CODE_LEN: 6,
  /** Bits acima do codigo otimo que a missao ainda aceita. */
  SLACK: { micro: 4, 1: 4, 2: 2, 3: 0 } as Record<string, number>,
  /** Sorteios de pesos antes de cair na mensagem deterministica de reserva. */
  GEN_ATTEMPTS: 40,
} as const;

export const ROUTE = {
  /** Nos da rede, por dificuldade (contando origem e destino). */
  NODES: { micro: 6, 1: 6, 2: 8, 3: 10 } as Record<string, number>,
  /** Ligacoes extras sorteadas acima da arvore que garante a rede conexa. */
  EXTRA_LINKS: { micro: 2, 1: 3, 2: 5, 3: 7 } as Record<string, number>,
  /** Faixa de atraso de uma ligacao, em milissegundos de mentira. */
  MIN_COST: 1,
  MAX_COST: 9,
  /** Folga de atraso acima da rota mais curta que a missao ainda aceita. */
  SLACK: { micro: 6, 1: 6, 2: 3, 3: 0 } as Record<string, number>,
  /** Sorteios de rede antes de cair na rede deterministica de reserva. */
  GEN_ATTEMPTS: 40,
} as const;

export const VAULT = {
  /** Camadas de maquinas entre a entrada da rede e o cofre, por dificuldade. */
  LAYERS: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Maquinas por camada. */
  WIDTH: { micro: 2, 1: 2, 2: 2, 3: 3 } as Record<string, number>,
  /** Ligacoes extras sorteadas entre camadas vizinhas. */
  EXTRA_LINKS: { micro: 1, 1: 2, 2: 3, 3: 4 } as Record<string, number>,
  /** Firewalls acima do corte minimo que a missao ainda aceita. */
  SLACK: { micro: 2, 1: 2, 2: 1, 3: 0 } as Record<string, number>,
  /** Sorteios de rede antes de cair na rede deterministica de reserva. */
  GEN_ATTEMPTS: 40,
} as const;

export const MODEL = {
  /** Sinais que o detector pode observar, por dificuldade. */
  SIGNALS: { micro: 4, 1: 4, 2: 5, 3: 6 } as Record<string, number>,
  /** Sinais que de fato causam o ataque (os outros sao coincidencia). */
  REAL: { micro: 2, 1: 2, 2: 2, 3: 3 } as Record<string, number>,
  /** Exemplos rotulados mostrados ao jogador (o treino). */
  TRAIN: { micro: 6, 1: 6, 2: 8, 3: 10 } as Record<string, number>,
  /** Exemplos guardados para a prova do detector (o teste). */
  TEST: { micro: 3, 1: 3, 2: 4, 3: 5 } as Record<string, number>,
  /** Sinais acima do minimo que a missao ainda aceita. */
  SLACK: { micro: 2, 1: 2, 2: 1, 3: 0 } as Record<string, number>,
  /** Sorteios de conjunto antes de cair no conjunto deterministico de reserva. */
  GEN_ATTEMPTS: 60,
} as const;

export const LOOM = {
  /** Cores disponiveis na paleta do Tear de Engrenagens. */
  COLORS: ['a', 'b', 'c'] as readonly string[],
  /** Repeticao maxima que um cartao "repetir xN" aceita. */
  MAX_REPEAT: 6,
  /** Tamanho do padrao por dificuldade. */
  LENGTH: { micro: 6, 1: 8, 2: 14, 3: 20 } as Record<string, number>,
} as const;
