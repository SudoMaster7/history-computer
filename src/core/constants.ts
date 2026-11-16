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
  /** XP por fragmento de memoria recolhido no mapa. */
  FRAGMENT_XP: 15,
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
  /** Nos minijogos, cada erro tira esta fracao da eficiencia... */
  MISTAKE_PENALTY: 0.07,
  /** ...ate este piso: quem conclui nunca fica abaixo dele. */
  MISTAKE_FLOOR: 0.5,
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
  /** Fragmentos de memoria espalhados em cada zona. */
  FRAGMENTS_PER_ZONE: 3,
  /** Distancia minima (em celulas) entre dois fragmentos e do ponto de entrada. */
  FRAGMENT_MIN_GAP: 4,
  /** Linhas do topo sem fragmento: os botoes de canto flutuam sobre elas. */
  FRAGMENT_TOP_MARGIN: 2,
} as const;

/*
 * Os seis minijogos seguem o mesmo molde (D69): rodadas curtas, sempre
 * concluiveis, em que o erro custa estrela e nao a missao. O que muda por
 * dificuldade e quantas rodadas ha e o tamanho de cada uma.
 */

export const LOOM = {
  /** Cores de fio do Tear de Engrenagens. */
  COLORS: ['a', 'b', 'c'] as readonly string[],
  /** Tecidos (rodadas) por dificuldade. */
  ROUNDS: { micro: 2, 1: 3, 2: 4, 3: 5 } as Record<string, number>,
  /** Faixa de tamanho do trecho que se repete. */
  UNIT_MIN: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  UNIT_MAX: { micro: 2, 1: 3, 2: 4, 3: 4 } as Record<string, number>,
  /** Fios que faltam no fim do tecido, para o jogador completar. */
  HIDDEN: { micro: 2, 1: 3, 2: 4, 3: 4 } as Record<string, number>,
  /** Sorteios de trecho antes de cair no trecho de reserva. */
  GEN_ATTEMPTS: 40,
} as const;

export const CIRCUIT = {
  /** Portas que um circuito pode ter (o NAO entra como inversor de chave). */
  TYPES: ['AND', 'OR'] as readonly string[],
  /** Circuitos (rodadas) por dificuldade. */
  ROUNDS: { micro: 2, 1: 3, 2: 4, 3: 5 } as Record<string, number>,
  /** Rodada (a partir de 0) em que os circuitos passam a ter tres chaves. */
  THREE_FROM: { micro: 9, 1: 2, 2: 1, 3: 0 } as Record<string, number>,
  /** Rodada a partir da qual uma chave pode vir travada. */
  LOCK_FROM: { micro: 9, 1: 9, 2: 2, 3: 1 } as Record<string, number>,
  /** Sorteios de circuito antes de cair no circuito de reserva. */
  GEN_ATTEMPTS: 60,
} as const;

export const BITS = {
  /** Numeros a gravar (rodadas) por dificuldade. */
  ROUNDS: { micro: 2, 1: 3, 2: 4, 3: 5 } as Record<string, number>,
  /** Quantos bits a mesa tem. Com 4 bits cabem os numeros de 0 a 15. */
  WIDTH: { micro: 3, 1: 4, 2: 5, 3: 6 } as Record<string, number>,
  /** Sorteios de numero antes de cair na contagem de reserva. */
  GEN_ATTEMPTS: 40,
} as const;

export const ROUTE = {
  /** Mapas (rodadas) por dificuldade. */
  ROUNDS: { micro: 1, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Fileiras de maquinas entre a origem e o destino. */
  LAYERS: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Maquinas por fileira. */
  WIDTH: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Faixa de atraso de uma ligacao. */
  MIN_COST: 1,
  MAX_COST: 9,
  /** Sorteios de mapa antes de aceitar o que vier. */
  GEN_ATTEMPTS: 40,
} as const;

export const VAULT = {
  /** Senhas (rodadas) por dificuldade. */
  ROUNDS: { micro: 1, 1: 2, 2: 2, 3: 3 } as Record<string, number>,
  /** Faixa da chave: quantas casas cada letra andou no alfabeto. */
  SHIFT_MIN: { micro: 1, 1: 1, 2: 2, 3: 3 } as Record<string, number>,
  SHIFT_MAX: { micro: 1, 1: 1, 2: 3, 3: 5 } as Record<string, number>,
  /** Tamanho maximo da senha, em letras. */
  MAX_LEN: { micro: 4, 1: 5, 2: 6, 3: 6 } as Record<string, number>,
  /** Letras oferecidas a cada casa da senha (uma e a certa). */
  CHOICES: 3,
} as const;

export const MODEL = {
  /** Regras escondidas (rodadas) por dificuldade. */
  ROUNDS: { micro: 1, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Caracteristicas que variam entre os programas (cor, forma, antena). */
  ATTRS: { micro: 2, 1: 2, 2: 3, 3: 3 } as Record<string, number>,
  /** Valores possiveis de cada caracteristica, na ordem. */
  VALUES: [3, 3, 2] as readonly number[],
  /** Exemplos ja rotulados mostrados ao jogador. */
  TRAIN: { micro: 4, 1: 4, 2: 5, 3: 6 } as Record<string, number>,
  /** Programas novos que o jogador classifica. */
  TEST: { micro: 3, 1: 3, 2: 4, 3: 4 } as Record<string, number>,
  /** Fracao de acertos para o detector ser aprovado. */
  PASS_RATIO: 0.6,
  /** Sorteios de exemplos antes de cair no conjunto de reserva. */
  GEN_ATTEMPTS: 80,
} as const;
