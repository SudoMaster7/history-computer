/**
 * Unico arquivo de balanceamento do jogo (secao 3.3 do briefing).
 * Nenhum numero de regra de jogo deve aparecer fora daqui.
 */

export const SCORING = {
  /** Limiares de eficiencia para 2 e 3 estrelas. */
  STARS_2_EFFICIENCY: 0.85,
  STARS_3_EFFICIENCY: 1.0,
  /** Pontuacao da missao = round(MISSION_SCORE_FACTOR * eficiencia), limitada ao MAX. */
  MISSION_SCORE_FACTOR: 1000,
  MISSION_SCORE_MAX: 1500,
  /** Eficiencia maxima aceita por evaluate(). */
  EFFICIENCY_MAX: 1.5,
  /** Pontuacao do chefao = BOSS_BASE + BOSS_PER_HEART * coracoes - BOSS_PER_TURN * rodadas. */
  BOSS_BASE: 2000,
  BOSS_PER_HEART: 300,
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
  /** Integridade do BUG Day 0. */
  HP: 300,
  /** Dano ao chefao = BASE_DAMAGE * multiplicador do poder * eficiencia. */
  BASE_DAMAGE: 40,
  /** Eficiencia minima do micro-desafio para neutralizar o ataque anunciado. */
  BLOCK_MIN_EFFICIENCY: 0.5,
} as const;

export const TIME = {
  /** Fuso usado para o desafio diario. */
  DAILY_TIMEZONE: 'America/Sao_Paulo',
} as const;

export const STORAGE = {
  KEY: 'davalvulaaia:save:v1',
  /** 2: o jogo virou mapa de fases (D78); a migracao guarda as estrelas. */
  VERSION: 2,
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

/*
 * Fase de plataforma (D73-D76). Unidade: pixel da fase (o tile tem 16 px) e
 * passo fixo de simulacao (60 passos por segundo). A tela so desenha; quem
 * anda, pula, bate e abre portao e `core/stage.ts`.
 */
export const STAGE = {
  /** Lado do tile, em pixels da fase. */
  TILE: 16,
  /** Passos de simulacao por segundo. */
  STEPS_PER_SECOND: 60,
  /** Velocidade do Bit andando (botao de direcao segurado), em px por passo. */
  RUN_SPEED: 1.5,
  /** Gravidade, em px por passo ao quadrado. */
  GRAVITY: 0.25,
  /** Velocidade inicial do pulo (para cima), em px por passo. */
  JUMP_SPEED: 5,
  /** Soltou Pular cedo: a subida e cortada para esta velocidade (pulo baixo, como no Mario). */
  JUMP_CUT_SPEED: 2,
  /** Velocidade maxima de queda. */
  MAX_FALL: 6,
  /** Corpo do Bit, em px. */
  BODY_W: 10,
  BODY_H: 14,
  /** Passos depois de sair da beirada em que o pulo ainda vale. */
  COYOTE_STEPS: 5,
  /** Municao: teto, e o minimo devolvido no checkpoint (para nunca travar sem tiro). */
  AMMO_MAX: 30,
  AMMO_RESPAWN_MIN: 4,
  /** Chao que cai: passos ate cair depois de pisado, e passos ate voltar. */
  CRUMBLE_STEPS: 36,
  CRUMBLE_FALLEN_STEPS: 180,
  /** Mola: velocidade do lancamento para cima. */
  SPRING_SPEED: 6.5,
  /** Pisao (como no Mario): quique depois de cair em cima de um inimigo. */
  STOMP_BOUNCE: 3.5,
  /** Passos de invulnerabilidade depois de levar dano. */
  INVULN_STEPS: 60,
  /** Tiro do Bit: velocidade, alcance e intervalo minimo entre tiros. */
  SHOT_SPEED: 4,
  SHOT_RANGE: 176,
  SHOT_COOLDOWN: 12,
  /** Inimigo que anda: velocidade. */
  WALKER_SPEED: 0.5,
  /** Inimigo que voa: amplitude e periodo do vaivem vertical. */
  FLYER_AMP: 10,
  FLYER_PERIOD: 120,
  /** Torre: intervalo entre disparos, velocidade do disparo e resistencia. */
  TURRET_PERIOD: 100,
  TURRET_SHOT_SPEED: 2,
  TURRET_HP: 2,
  /** Saltador: anda devagar dando pulinhos; periodo e altura do pulo. */
  HOPPER_SPEED: 0.3,
  HOPPER_PERIOD: 90,
  HOPPER_HEIGHT: 14,
  /** Blindado: anda devagar e aguenta mais tiros. */
  ARMOR_SPEED: 0.3,
  ARMOR_HP: 2,
  /** Pingo: pendurado no alto, cai quando o Bit chega a esta distancia. */
  DROP_TRIGGER_PX: 72,
  /** Programa (Era 6): velocidade com que vem na direcao do Bit. */
  PROGRAM_SPEED: 0.6,
  /** Lado da caixa de inimigos e programas, em px. */
  ENEMY_SIZE: 12,
  /** So se mexem os inimigos a esta distancia do Bit, em px. */
  ACTIVE_PX: 240,
  /** Distancia em que o Bit encosta no portao e para. */
  GATE_REACH_PX: 4,
  /** Distancia a frente em que a placa e lida. */
  SIGN_REACH_PX: 24,
  /** Limite de passos de uma corrida de referencia (protecao contra laco). */
  MAX_STEPS: 30000,
  /** Robo de referencia: quanto a frente ele olha para pular. */
  BOT_LOOK_PX: 6,
  /** Robo de referencia: a que distancia ele atira num inimigo. */
  BOT_SHOOT_PX: 120,
  /** Robo de referencia: passos entre duas escolhas num dispositivo. */
  BOT_PANEL_STEPS: 8,
} as const;

/** Habilidades ganhas ao fechar cada era (D76). */
export const ABILITY = {
  /** Rajada (Repetir): tiros por toque e distancia entre eles. */
  BURST: 3,
  BURST_GAP_PX: 8,
  /** Salto de no (Conectar): multiplicador da velocidade no ar. */
  LONG_JUMP_FACTOR: 1.5,
  /** Mira (Aprender): quanto o tiro corrige a altura por passo. */
  HOMING_PX: 0.6,
} as const;

/**
 * Niveis de dificuldade (D82). Mudam o que pesa na fase -- coracoes, municao do
 * comeco e de cada recarga, tempo do chao que cai -- e os coracoes no chefao.
 * O caminho das fases e os minijogos sao os mesmos nos tres.
 */
export const DIFFICULTY = {
  facil: { HEARTS: 5, AMMO: 24, AMMO_PICKUP: 8, CRUMBLE_FACTOR: 1.5, BOSS_HEARTS: 5 },
  normal: { HEARTS: 3, AMMO: 14, AMMO_PICKUP: 6, CRUMBLE_FACTOR: 1, BOSS_HEARTS: 3 },
  dificil: { HEARTS: 2, AMMO: 8, AMMO_PICKUP: 4, CRUMBLE_FACTOR: 0.75, BOSS_HEARTS: 2 },
} as const;
