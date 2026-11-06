/**
 * Gera a pixel art do jogo: tilesets por era, o Bit (4 direcoes x 3 quadros)
 * e os personagens do mapa.
 *
 * Arte autoral e deterministica: desenhada por codigo com uma seed fixa, sem
 * dependencia externa e sem licenca pendente (ver ASSETS.md). Rodar com:
 *
 *   node tools/make-sprites.mjs
 *
 * Saida: public/sprites/*.png (16x16 por celula).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites');
const TILE = 16;

/* ---------------------------------------------------------------- PNG ---- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Escreve um PNG RGBA sem perdas a partir de um buffer de pixels. */
function writePng(path, width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/* -------------------------------------------------------------- canvas --- */

function surface(width, height) {
  const data = Buffer.alloc(width * height * 4);
  const put = (x, y, color) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    if (!color) return;
    const i = (py * width + px) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = color.length > 3 ? color[3] : 255;
  };
  return {
    data,
    width,
    height,
    put,
    rect(x, y, w, h, color) {
      for (let dy = 0; dy < h; dy += 1)
        for (let dx = 0; dx < w; dx += 1) put(x + dx, y + dy, color);
    },
    disc(cx, cy, r, color) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (dx * dx + dy * dy <= r * r + r * 0.4) put(cx + dx, cy + dy, color);
        }
      }
    },
    hline(x, y, w, color) {
      for (let dx = 0; dx < w; dx += 1) put(x + dx, y, color);
    },
    vline(x, y, h, color) {
      for (let dy = 0; dy < h; dy += 1) put(x, y + dy, color);
    },
  };
}

/** mulberry32: o mesmo gerador do jogo, para a textura sair sempre igual. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shade = (color, amount) =>
  color.slice(0, 3).map((c) => Math.max(0, Math.min(255, Math.round(c + amount))));

/* --------------------------------------------------------------- eras ---- */

/**
 * Paleta por era. `ground`/`path` pintam o chao, `solid` as arvores ou paredes,
 * `liquid` a agua ou o fosso, `accent` os objetos daquela era.
 */
const ERAS = {
  mecanica: {
    ground: [86, 125, 70],
    path: [164, 138, 96],
    solid: [58, 92, 52],
    liquid: [64, 108, 150],
    accent: [196, 148, 68],
    indoor: false,
  },
  logica: {
    ground: [78, 82, 104],
    path: [112, 116, 140],
    solid: [52, 56, 76],
    liquid: [48, 52, 70],
    accent: [228, 164, 72],
    indoor: true,
  },
  codigo: {
    ground: [70, 86, 96],
    path: [104, 122, 130],
    solid: [46, 60, 68],
    liquid: [60, 100, 64],
    accent: [96, 204, 180],
    indoor: true,
  },
  redes: {
    ground: [96, 120, 92],
    path: [150, 150, 118],
    solid: [48, 88, 132],
    liquid: [56, 104, 156],
    accent: [120, 180, 236],
    indoor: false,
  },
  seguranca: {
    ground: [92, 100, 88],
    path: [138, 140, 124],
    solid: [74, 74, 84],
    liquid: [52, 86, 120],
    accent: [220, 108, 96],
    indoor: false,
  },
  ia: {
    ground: [74, 80, 110],
    path: [112, 112, 148],
    solid: [52, 70, 62],
    liquid: [84, 90, 126],
    accent: [168, 132, 236],
    indoor: true,
  },
};

/* -------------------------------------------------------------- tiles ---- */

/** Textura de chao: base, manchas escuras e um brilho esparso. */
function ground(s, ox, oy, base, seed) {
  const r = rng(seed);
  s.rect(ox, oy, TILE, TILE, base);
  for (let i = 0; i < 26; i += 1) {
    const x = ox + Math.floor(r() * TILE);
    const y = oy + Math.floor(r() * TILE);
    s.put(x, y, shade(base, r() < 0.5 ? -14 : 12));
  }
}

function tileGrass(s, ox, oy, p) {
  ground(s, ox, oy, p.ground, 101);
  const r = rng(202);
  // Tufos de capim: tres pixels em V.
  for (let i = 0; i < 5; i += 1) {
    const x = ox + 1 + Math.floor(r() * (TILE - 2));
    const y = oy + 2 + Math.floor(r() * (TILE - 4));
    const tuft = shade(p.ground, 26);
    s.put(x, y, tuft);
    s.put(x - 1, y + 1, tuft);
    s.put(x + 1, y + 1, tuft);
  }
}

function tilePath(s, ox, oy, p) {
  ground(s, ox, oy, p.path, 303);
  const r = rng(404);
  for (let i = 0; i < 7; i += 1) {
    const x = ox + 1 + Math.floor(r() * (TILE - 3));
    const y = oy + 1 + Math.floor(r() * (TILE - 3));
    s.rect(x, y, 2, 1, shade(p.path, -24));
  }
}

function tileTree(s, ox, oy, p) {
  if (p.indoor) return tileWall(s, ox, oy, p);
  tileGrass(s, ox, oy, p);
  const trunk = [92, 66, 44];
  s.rect(ox + 7, oy + 9, 2, 6, trunk);
  s.disc(ox + 8, oy + 7, 5, p.solid);
  s.disc(ox + 6, oy + 5, 3, shade(p.solid, 22));
  s.disc(ox + 10, oy + 8, 2, shade(p.solid, -18));
}

function tileWater(s, ox, oy, p) {
  ground(s, ox, oy, p.liquid, 505);
  const foam = shade(p.liquid, 40);
  s.hline(ox + 2, oy + 4, 5, foam);
  s.hline(ox + 9, oy + 9, 4, foam);
  s.hline(ox + 3, oy + 12, 6, foam);
}

function tileWall(s, ox, oy, p) {
  ground(s, ox, oy, p.solid, 606);
  const line = shade(p.solid, -30);
  const top = shade(p.solid, 24);
  s.hline(ox, oy, TILE, top);
  for (let y = 4; y < TILE; y += 5) s.hline(ox, oy + y, TILE, line);
  s.vline(ox + 5, oy + 1, 3, line);
  s.vline(ox + 11, oy + 6, 3, line);
  s.vline(ox + 3, oy + 11, 3, line);
}

function tileFloor(s, ox, oy, p) {
  ground(s, ox, oy, shade(p.ground, -10), 707);
  const line = shade(p.ground, -34);
  s.hline(ox, oy + 7, TILE, line);
  s.vline(ox + 7, oy, TILE, line);
}

/** Terminal da missao: um console com tela acesa. */
function tileStation(s, ox, oy, p) {
  const body = shade(p.solid, 30);
  s.rect(ox + 2, oy + 3, 12, 11, body);
  s.rect(ox + 2, oy + 3, 12, 1, shade(body, 28));
  s.rect(ox + 4, oy + 5, 8, 5, [26, 28, 40]);
  s.rect(ox + 5, oy + 6, 6, 3, p.accent);
  s.rect(ox + 5, oy + 7, 3, 1, shade(p.accent, 50));
  // Botoes e base.
  s.rect(ox + 4, oy + 11, 2, 2, [200, 90, 80]);
  s.rect(ox + 7, oy + 11, 2, 2, [110, 200, 130]);
  s.rect(ox + 1, oy + 14, 14, 2, shade(p.solid, -20));
}

/** Porta da zona: portal para o portao da Linha do Tempo. */
function tileDoor(s, ox, oy, p) {
  s.rect(ox, oy, TILE, TILE, shade(p.solid, -14));
  s.rect(ox + 3, oy + 2, 10, 14, [38, 34, 48]);
  s.rect(ox + 4, oy + 3, 8, 12, p.accent);
  s.rect(ox + 4, oy + 3, 8, 3, shade(p.accent, 36));
  s.rect(ox + 10, oy + 9, 1, 2, [40, 40, 50]);
}

const TILE_PAINTERS = [
  tileGrass,
  tilePath,
  tileTree,
  tileWater,
  tileWall,
  tileFloor,
  tileStation,
  tileDoor,
];

function makeTileset(era) {
  const p = ERAS[era];
  const s = surface(TILE * TILE_PAINTERS.length, TILE);
  TILE_PAINTERS.forEach((paint, index) => paint(s, index * TILE, 0, p));
  writePng(join(OUT, `tiles-${era}.png`), s.width, s.height, s.data);
}

/* ---------------------------------------------------------- personagem --- */

const OUTLINE = [28, 26, 38];
const SKIN = [238, 198, 162];
const SKIN_DARK = [198, 158, 124];
const EYE = [26, 28, 40];

/**
 * Desenha o personagem numa celula. `facing` escolhe o rosto, `frame` alterna
 * as pernas (0 e 2 passam, 1 e a pose parada).
 */
function character(s, ox, oy, facing, frame, body, hair) {
  const legSwing = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const bob = frame === 1 ? 0 : -1;
  const y = oy + bob;

  // Sombra no chao.
  for (let dx = 4; dx < 12; dx += 1) s.put(ox + dx, oy + 15, [0, 0, 0, 60]);

  // Pernas.
  const shoe = shade(body, -40);
  s.rect(ox + 5, y + 12, 2, 3, shade(body, -24));
  s.rect(ox + 9, y + 12, 2, 3, shade(body, -24));
  s.rect(ox + 5, y + 14 + Math.max(0, legSwing), 2, 1, shoe);
  s.rect(ox + 9, y + 14 + Math.max(0, -legSwing), 2, 1, shoe);

  // Tronco.
  s.rect(ox + 4, y + 8, 8, 5, OUTLINE);
  s.rect(ox + 5, y + 8, 6, 4, body);
  s.rect(ox + 5, y + 8, 6, 1, shade(body, 30));

  // Bracos, acompanhando o passo.
  s.rect(ox + 3, y + 9 + legSwing, 1, 3, SKIN_DARK);
  s.rect(ox + 12, y + 9 - legSwing, 1, 3, SKIN_DARK);

  // Cabeca.
  s.rect(ox + 4, y + 2, 8, 7, OUTLINE);
  s.rect(ox + 5, y + 3, 6, 5, SKIN);
  s.rect(ox + 4, y + 1, 8, 2, hair);
  s.rect(ox + 5, y + 2, 6, 1, shade(hair, 22));

  if (facing === 'down') {
    s.put(ox + 6, y + 5, EYE);
    s.put(ox + 9, y + 5, EYE);
    s.rect(ox + 7, y + 7, 2, 1, SKIN_DARK);
  } else if (facing === 'up') {
    // De costas: so cabelo.
    s.rect(ox + 5, y + 3, 6, 4, hair);
  } else {
    const dir = facing === 'right' ? 1 : -1;
    const eyeX = facing === 'right' ? ox + 9 : ox + 6;
    s.put(eyeX, y + 5, EYE);
    // Franja do lado oposto ao rosto.
    s.rect(facing === 'right' ? ox + 5 : ox + 9, y + 3, 2, 3, hair);
    // Nariz.
    s.put(facing === 'right' ? ox + 11 : ox + 4, y + 6, SKIN_DARK);
    void dir;
  }
}

const FACINGS = ['down', 'left', 'right', 'up'];

/** Spritesheet: 3 quadros na horizontal, 4 direcoes na vertical. */
function makeCharacter(file, body, hair) {
  const frames = 3;
  const s = surface(TILE * frames, TILE * FACINGS.length);
  FACINGS.forEach((facing, row) => {
    for (let frame = 0; frame < frames; frame += 1) {
      character(s, frame * TILE, row * TILE, facing, frame, body, hair);
    }
  });
  writePng(join(OUT, file), s.width, s.height, s.data);
}

/* ---------------------------------------------------------------- main --- */

mkdirSync(OUT, { recursive: true });

for (const era of Object.keys(ERAS)) makeTileset(era);

// O Bit, o jogador.
makeCharacter('bit.png', [96, 164, 236], [62, 48, 72]);

/*
 * Um sprite por personagem historico, para que tres pessoas na mesma zona nao
 * fiquem identicas. As cores sao so roupa e cabelo: nenhum retrato pretende
 * ser semelhanca da pessoa real.
 */
const PEOPLE = {
  // Era 1
  pascal: [
    [150, 140, 180],
    [70, 62, 58],
  ],
  jacquard: [
    [176, 128, 84],
    [96, 72, 52],
  ],
  ada: [
    [196, 112, 152],
    [88, 58, 44],
  ],
  // Era 2
  shannon: [
    [120, 150, 176],
    [60, 56, 64],
  ],
  turing: [
    [108, 132, 108],
    [92, 74, 56],
  ],
  jennings: [
    [216, 160, 96],
    [128, 84, 48],
  ],
  // Era 3
  bardeen: [
    [140, 144, 156],
    [72, 70, 74],
  ],
  backus: [
    [104, 148, 156],
    [84, 68, 56],
  ],
  hopper: [
    [88, 116, 176],
    [172, 172, 180],
  ],
  // Era 4
  kleinrock: [
    [132, 160, 196],
    [78, 70, 62],
  ],
  cerf: [
    [96, 128, 184],
    [168, 168, 176],
  ],
  'berners-lee': [
    [160, 168, 188],
    [104, 86, 68],
  ],
  // Era 5
  diffie: [
    [176, 176, 184],
    [196, 196, 200],
  ],
  goldwasser: [
    [188, 124, 140],
    [64, 54, 60],
  ],
  marta: [
    [108, 176, 156],
    [60, 52, 48],
  ],
  // Era 6
  'fei-fei': [
    [200, 128, 120],
    [52, 46, 52],
  ],
  hinton: [
    [132, 148, 188],
    [188, 188, 192],
  ],
  lecun: [
    [124, 160, 140],
    [80, 72, 68],
  ],
};

for (const [id, [body, hair]] of Object.entries(PEOPLE)) {
  makeCharacter(`npc-${id}.png`, body, hair);
}

console.log(`pixel art gerada em ${OUT}`);
