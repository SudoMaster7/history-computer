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

/** Mistura duas cores: t = 0 devolve `a`, t = 1 devolve `b`. */
const mix = (a, b, t) => a.slice(0, 3).map((c, i) => Math.round(c + (b[i] - c) * t));

const INK = [24, 26, 44];

/* --------------------------------------------------------------- eras ---- */

/**
 * Paleta por era. `ground`/`path` pintam o chao, `solid` as arvores ou paredes,
 * `liquid` a agua ou o fosso, `accent` os objetos daquela era (tela do
 * terminal, porta) e `bloom` os detalhes soltos do chao (flor, rebite).
 *
 * `indoor` troca campo por sala: sem capim, com piso em placas, e o tile
 * "arvore" vira parede. `pine` troca a copa redonda por pinheiro, para duas
 * zonas a ceu aberto nao terem a mesma arvore. `wall` e a pedra do predio da
 * porta nas zonas a ceu aberto; nas salas a parede usa `solid`.
 */
const ERAS = {
  // Campo aberto, tear e oficina: verde vivo e terra batida.
  mecanica: {
    ground: [98, 152, 76],
    path: [198, 166, 112],
    solid: [52, 114, 60],
    liquid: [66, 130, 196],
    accent: [222, 164, 70],
    bloom: [246, 226, 122],
    wall: [158, 122, 98],
    indoor: false,
    pine: false,
  },
  // Laboratorio de valvulas: piso frio, parede escura, luz ambar.
  logica: {
    ground: [72, 76, 104],
    path: [128, 118, 132],
    solid: [56, 52, 80],
    liquid: [34, 34, 54],
    accent: [244, 172, 70],
    bloom: [244, 172, 70],
    indoor: true,
    pine: false,
  },
  // Sala do mainframe: cinza-azulado com verde de fosforo.
  codigo: {
    ground: [62, 86, 94],
    path: [112, 138, 140],
    solid: [40, 58, 68],
    liquid: [36, 96, 72],
    accent: [98, 224, 190],
    bloom: [98, 224, 190],
    indoor: true,
    pine: false,
  },
  // Campus das primeiras redes: gramado claro e pinheiros.
  redes: {
    ground: [106, 150, 98],
    path: [176, 172, 144],
    solid: [42, 110, 98],
    liquid: [58, 122, 186],
    accent: [112, 184, 252],
    bloom: [250, 250, 255],
    wall: [150, 156, 172],
    indoor: false,
    pine: true,
  },
  // Entardecer: o verde esfria e a porta ganha o roxo da era.
  seguranca: {
    ground: [86, 108, 100],
    path: [152, 150, 144],
    solid: [58, 78, 100],
    liquid: [48, 90, 134],
    accent: [164, 124, 244],
    bloom: [226, 128, 128],
    wall: [104, 108, 128],
    indoor: false,
    pine: true,
  },
  // Datacenter: azul-noite com o rosa da era nas luzes.
  ia: {
    ground: [58, 60, 98],
    path: [106, 102, 152],
    solid: [42, 46, 80],
    liquid: [72, 58, 124],
    accent: [238, 114, 164],
    bloom: [238, 114, 164],
    indoor: true,
    pine: false,
  },
};

/* -------------------------------------------------------------- tiles ---- */

/** Textura de chao: base com manchas de dois pixels, mais claras e mais escuras. */
function ground(s, ox, oy, base, seed, strength = 12) {
  const r = rng(seed);
  s.rect(ox, oy, TILE, TILE, base);
  for (let i = 0; i < 14; i += 1) {
    const x = ox + Math.floor(r() * (TILE - 1));
    const y = oy + Math.floor(r() * TILE);
    const tone = shade(base, r() < 0.5 ? -strength : strength);
    s.put(x, y, tone);
    if (r() < 0.6) s.put(x + 1, y, tone);
  }
}

function tileGrass(s, ox, oy, p) {
  if (p.indoor) {
    // Sala: piso liso, com um rebite discreto no canto de cada placa.
    ground(s, ox, oy, p.ground, 101, 7);
    s.put(ox + 1, oy + 1, shade(p.ground, 22));
    s.put(ox + 14, oy + 14, shade(p.ground, -20));
    return;
  }
  ground(s, ox, oy, p.ground, 101);
  const r = rng(202);
  // Tufos de capim: tres pixels em V, com a ponta clara.
  for (let i = 0; i < 5; i += 1) {
    const x = ox + 2 + Math.floor(r() * (TILE - 4));
    const y = oy + 2 + Math.floor(r() * (TILE - 5));
    s.put(x, y, shade(p.ground, 38));
    s.put(x - 1, y + 1, shade(p.ground, 22));
    s.put(x + 1, y + 1, shade(p.ground, 22));
    s.put(x, y + 2, shade(p.ground, -22));
  }
  /*
   * Flor nao entra no tile: repetida em toda celula ela vira uma grade de
   * pontinhos. Quem espalha as flores e o mapa (`buildGround`, em worldArt.ts),
   * umas poucas por zona.
   */
}

function tilePath(s, ox, oy, p) {
  ground(s, ox, oy, p.path, 303, 9);
  const r = rng(404);
  if (p.indoor) {
    // Passarela: duas faixas claras correndo no sentido do passo.
    for (let i = 0; i < 4; i += 1) {
      const x = ox + 1 + Math.floor(r() * (TILE - 4));
      const y = oy + 1 + Math.floor(r() * (TILE - 2));
      s.rect(x, y, 3, 1, shade(p.path, 18));
    }
    return;
  }
  // Terra batida: seixos com luz em cima e sombra embaixo.
  for (let i = 0; i < 6; i += 1) {
    const x = ox + 1 + Math.floor(r() * (TILE - 4));
    const y = oy + 1 + Math.floor(r() * (TILE - 3));
    s.rect(x, y, 2, 1, shade(p.path, 22));
    s.rect(x, y + 1, 2, 1, shade(p.path, -30));
  }
}

function tileTree(s, ox, oy, p) {
  if (p.indoor) return tileWall(s, ox, oy, p);
  tileGrass(s, ox, oy, p);
  const dark = shade(p.solid, -46);
  const light = shade(p.solid, 34);
  // Sombra da copa no chao.
  s.rect(ox + 4, oy + 14, 9, 1, shade(p.ground, -30));
  s.rect(ox + 5, oy + 15, 7, 1, shade(p.ground, -22));
  // Tronco, com o lado direito na sombra.
  s.rect(ox + 7, oy + 10, 2, 5, [112, 78, 50]);
  s.rect(ox + 8, oy + 10, 1, 5, [82, 56, 38]);

  if (p.pine) {
    // Pinheiro: tres andares, cada um mais largo, com a borda escura.
    const tiers = [
      [0, 2, 2],
      [4, 4, 3],
      [8, 6, 3],
    ];
    for (const [top, half, height] of tiers) {
      for (let row = 0; row < height; row += 1) {
        const w = Math.round(1 + ((half - 1) * (row + 1)) / height);
        s.rect(ox + 8 - w - 1, oy + top + row, w * 2 + 2, 1, dark);
        s.rect(ox + 8 - w, oy + top + row, w * 2, 1, p.solid);
        s.rect(ox + 8 - w, oy + top + row, Math.max(1, w - 1), 1, light);
      }
    }
    s.put(ox + 8, oy + 0, light);
    return;
  }

  // Copa redonda: contorno escuro, massa, luz no alto a esquerda, sombra embaixo.
  s.disc(ox + 8, oy + 6, 6, dark);
  s.disc(ox + 8, oy + 6, 5, p.solid);
  s.disc(ox + 10, oy + 8, 3, shade(p.solid, -22));
  s.disc(ox + 6, oy + 4, 3, light);
  s.put(ox + 5, oy + 3, shade(p.solid, 60));
  s.put(ox + 9, oy + 5, light);
  s.put(ox + 11, oy + 9, dark);
  s.put(ox + 7, oy + 9, shade(p.solid, -22));
}

function tileWater(s, ox, oy, p) {
  ground(s, ox, oy, p.liquid, 505, 8);
  // Faixas mais fundas, e a crista clara das ondas por cima.
  s.rect(ox, oy + 6, TILE, 2, shade(p.liquid, -16));
  s.rect(ox, oy + 13, TILE, 2, shade(p.liquid, -16));
  const foam = shade(p.liquid, 52);
  s.hline(ox + 2, oy + 3, 4, foam);
  s.hline(ox + 10, oy + 5, 3, foam);
  s.hline(ox + 5, oy + 10, 5, foam);
  s.hline(ox + 12, oy + 12, 3, foam);
  s.put(ox + 3, oy + 2, [255, 255, 255, 200]);
  s.put(ox + 13, oy + 9, [255, 255, 255, 160]);
}

function tileWall(s, ox, oy, p) {
  const r = rng(606);
  const stone = p.wall ?? p.solid;
  const mortar = shade(stone, -34);
  s.rect(ox, oy, TILE, TILE, mortar);
  // Tijolos em fiadas de 4, cada fiada deslocada meia peca da de cima.
  for (let row = 0; row < 4; row += 1) {
    const y = oy + row * 4;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let x = -offset; x < TILE; x += 8) {
      const tone = shade(stone, Math.round((r() - 0.5) * 18));
      for (let dx = 0; dx < 7; dx += 1) {
        const px = x + dx;
        if (px < 0 || px >= TILE) continue;
        s.rect(ox + px, y, 1, 3, tone);
        s.put(ox + px, y, shade(tone, 24));
      }
    }
  }
}

function tileFloor(s, ox, oy, p) {
  const base = shade(p.ground, -12);
  ground(s, ox, oy, base, 707, 6);
  // Placas de 8 px com chanfro: luz em cima e a esquerda, sombra no lado oposto.
  for (const px of [0, 8]) {
    for (const py of [0, 8]) {
      s.hline(ox + px, oy + py, 8, shade(base, 16));
      s.vline(ox + px, oy + py, 8, shade(base, 16));
      s.hline(ox + px, oy + py + 7, 8, shade(base, -24));
      s.vline(ox + px + 7, oy + py, 8, shade(base, -24));
    }
  }
}

/** Terminal da missao: um console com tela acesa. Fundo transparente. */
function tileStation(s, ox, oy, p) {
  const body = mix(shade(p.solid, 46), [150, 158, 176], 0.35);
  // Sombra no chao e contorno.
  s.rect(ox + 2, oy + 15, 12, 1, [0, 0, 0, 70]);
  s.rect(ox + 1, oy + 2, 14, 13, INK);
  // Gabinete: luz em cima, sombra a direita.
  s.rect(ox + 2, oy + 3, 12, 11, body);
  s.rect(ox + 2, oy + 3, 12, 1, shade(body, 40));
  s.rect(ox + 13, oy + 4, 1, 10, shade(body, -34));
  // Tela: moldura escura, fundo aceso e linhas de texto.
  s.rect(ox + 3, oy + 4, 10, 6, INK);
  s.rect(ox + 4, oy + 5, 8, 4, shade(p.accent, -70));
  s.rect(ox + 5, oy + 6, 5, 1, p.accent);
  s.rect(ox + 5, oy + 8, 3, 1, shade(p.accent, 40));
  s.put(ox + 4, oy + 5, shade(p.accent, 60));
  // Painel: dois botoes e a fenda do cartao.
  s.rect(ox + 3, oy + 11, 2, 2, [226, 92, 86]);
  s.rect(ox + 6, oy + 11, 2, 2, [112, 216, 134]);
  s.rect(ox + 9, oy + 12, 4, 1, INK);
  // Luz de estado no topo.
  s.put(ox + 8, oy + 1, p.accent);
  s.put(ox + 7, oy + 1, INK);
  s.put(ox + 9, oy + 1, INK);
}

/** Porta da zona: batente escuro, duas folhas na cor da era e uma luz em cima. */
function tileDoor(s, ox, oy, p) {
  tileWall(s, ox, oy, p);
  // Batente em arco.
  s.rect(ox + 2, oy + 2, 12, 14, INK);
  s.rect(ox + 3, oy + 1, 10, 1, INK);
  // Folhas da porta: luz a esquerda, sombra a direita, almofadas.
  s.rect(ox + 3, oy + 3, 10, 13, p.accent);
  s.rect(ox + 3, oy + 3, 10, 1, shade(p.accent, 46));
  s.rect(ox + 3, oy + 3, 1, 13, shade(p.accent, 30));
  s.rect(ox + 12, oy + 3, 1, 13, shade(p.accent, -44));
  s.rect(ox + 5, oy + 5, 6, 3, shade(p.accent, -26));
  s.rect(ox + 5, oy + 10, 6, 4, shade(p.accent, -26));
  s.rect(ox + 5, oy + 5, 6, 1, shade(p.accent, -52));
  s.rect(ox + 5, oy + 10, 6, 1, shade(p.accent, -52));
  // Macaneta e a luz sobre a porta.
  s.put(ox + 11, oy + 9, [250, 236, 170]);
  s.put(ox + 11, oy + 10, INK);
  s.rect(ox + 7, oy + 1, 2, 1, [250, 236, 170]);
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

const SKIN = [240, 202, 166];
const SKIN_DARK = [204, 160, 126];
const EYE = [26, 28, 40];
const LENS = [168, 206, 232];

/**
 * Desenha uma pessoa numa celula. `facing` escolhe o rosto, `frame` alterna as
 * pernas (0 e 2 passam, 1 e a pose parada).
 *
 * `look` da a cada personagem um traco proprio, para tres pessoas na mesma zona
 * nao serem a mesma boneca com outra cor: cabelo comprido, barba, oculos, bone,
 * e a cor da calca. Nenhum deles pretende ser retrato de quem existiu.
 */
function character(s, ox, oy, facing, frame, body, hair, look = {}) {
  const legSwing = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const bob = frame === 1 ? 0 : -1;
  const y = oy + bob;
  const pants = look.pants ?? shade(body, -46);
  const side = facing === 'left' || facing === 'right';

  // Sombra no chao.
  for (let dx = 4; dx < 12; dx += 1) s.put(ox + dx, oy + 15, [0, 0, 0, 70]);

  // Pernas e sapatos.
  s.rect(ox + 5, y + 12, 2, 3, pants);
  s.rect(ox + 9, y + 12, 2, 3, pants);
  s.rect(ox + 5, y + 14 + Math.max(0, legSwing), 2, 1, INK);
  s.rect(ox + 9, y + 14 + Math.max(0, -legSwing), 2, 1, INK);

  // Cabelo comprido: cai atras dos ombros, entao vem antes do tronco.
  if (look.long) s.rect(ox + 3, y + 5, 10, 6, hair);

  // Tronco: contorno, cor da roupa, luz no ombro e sombra do lado direito.
  s.rect(ox + 4, y + 8, 8, 5, INK);
  s.rect(ox + 5, y + 8, 6, 4, body);
  s.rect(ox + 5, y + 8, 6, 1, shade(body, 34));
  s.rect(ox + 10, y + 9, 1, 3, shade(body, -30));
  if (look.tie) s.rect(ox + 7, y + 9, 2, 2, look.tie);

  // Bracos: manga na cor da roupa e mao na ponta, acompanhando o passo.
  s.rect(ox + 3, y + 9 + legSwing, 1, 2, shade(body, -18));
  s.put(ox + 3, y + 11 + legSwing, SKIN);
  s.rect(ox + 12, y + 9 - legSwing, 1, 2, shade(body, -18));
  s.put(ox + 12, y + 11 - legSwing, SKIN);

  // Cabeca.
  s.rect(ox + 4, y + 2, 8, 7, INK);
  s.rect(ox + 5, y + 3, 6, 5, SKIN);
  s.rect(ox + 5, y + 7, 6, 1, SKIN_DARK);
  s.rect(ox + 4, y + 1, 8, 2, hair);
  s.rect(ox + 5, y + 1, 5, 1, shade(hair, 30));

  if (facing === 'down') {
    s.put(ox + 6, y + 5, EYE);
    s.put(ox + 9, y + 5, EYE);
    if (look.glasses) {
      // Lentes claras dos dois lados de cada olho: le como oculos, nao como tarja.
      for (const dx of [5, 7, 8, 10]) s.put(ox + dx, y + 5, LENS);
    }
    if (look.beard) s.rect(ox + 5, y + 7, 6, 1, hair);
    else s.rect(ox + 7, y + 7, 2, 1, [176, 110, 100]);
    // Franja do lado, para o cabelo emoldurar o rosto.
    s.put(ox + 5, y + 3, hair);
    s.put(ox + 10, y + 3, hair);
  } else if (facing === 'up') {
    // De costas: so cabelo.
    s.rect(ox + 5, y + 3, 6, look.long ? 5 : 4, hair);
    s.rect(ox + 6, y + 3, 3, 1, shade(hair, 22));
  } else {
    const right = facing === 'right';
    s.put(right ? ox + 9 : ox + 6, y + 5, EYE);
    if (look.glasses) s.put(right ? ox + 10 : ox + 5, y + 5, LENS);
    // Cabelo cobre a nuca.
    s.rect(right ? ox + 5 : ox + 9, y + 3, 2, look.long ? 5 : 3, hair);
    // Nariz, e a barba no queixo.
    s.put(right ? ox + 11 : ox + 4, y + 6, SKIN_DARK);
    if (look.beard) s.rect(right ? ox + 8 : ox + 5, y + 7, 3, 1, hair);
  }

  // Bone: aba na frente, faixa clara em volta.
  if (look.cap) {
    s.rect(ox + 4, y + 1, 8, 2, look.cap);
    s.rect(ox + 4, y + 2, 8, 1, shade(look.cap, 40));
    if (facing === 'down') s.rect(ox + 5, y + 3, 6, 1, shade(look.cap, -30));
    else if (side) s.rect(facing === 'right' ? ox + 10 : ox + 3, y + 3, 3, 1, shade(look.cap, -30));
  }
}

const STEEL = [206, 218, 236];
const STEEL_DARK = [132, 148, 178];
const VISOR = [22, 30, 54];
const GLOW = [98, 232, 208];
const LAMP = [255, 208, 96];

/**
 * O Bit: uma maquina pequena, nao uma pessoa. Cabeca de caixa com visor, olhos
 * de luz, antena com lampada e corpo de metal na cor de sempre. Mesmas regras
 * de quadro e direcao de `character`, para a tela nao precisar saber a diferenca.
 */
function robot(s, ox, oy, facing, frame, body) {
  const legSwing = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const bob = frame === 1 ? 0 : -1;
  const y = oy + bob;

  // Sombra no chao.
  for (let dx = 3; dx < 13; dx += 1) s.put(ox + dx, oy + 15, [0, 0, 0, 80]);

  // Pernas curtas de metal, com o pe mais largo.
  s.rect(ox + 5, y + 12, 2, 2, STEEL_DARK);
  s.rect(ox + 9, y + 12, 2, 2, STEEL_DARK);
  s.rect(ox + 4, y + 14 + Math.max(0, legSwing), 3, 1, INK);
  s.rect(ox + 9, y + 14 + Math.max(0, -legSwing), 3, 1, INK);

  // Tronco: contorno, chapa, luz em cima, sombra a direita.
  s.rect(ox + 4, y + 8, 8, 5, INK);
  s.rect(ox + 5, y + 9, 6, 3, body);
  s.rect(ox + 5, y + 9, 6, 1, shade(body, 44));
  s.rect(ox + 10, y + 10, 1, 2, shade(body, -40));

  // Bracos: hastes de metal com a garra clara na ponta.
  s.rect(ox + 3, y + 9 + legSwing, 1, 2, STEEL_DARK);
  s.put(ox + 3, y + 11 + legSwing, STEEL);
  s.rect(ox + 12, y + 9 - legSwing, 1, 2, STEEL_DARK);
  s.put(ox + 12, y + 11 - legSwing, STEEL);

  // Antena com lampada.
  s.put(ox + 8, y + 1, STEEL_DARK);
  s.put(ox + 8, y + 0, LAMP);

  // Cabeca: caixa clara, mais larga que o corpo.
  s.rect(ox + 3, y + 2, 10, 7, INK);
  s.rect(ox + 4, y + 3, 8, 5, STEEL);
  s.rect(ox + 4, y + 3, 8, 1, [244, 248, 255]);
  s.rect(ox + 11, y + 4, 1, 4, STEEL_DARK);
  s.rect(ox + 4, y + 7, 8, 1, STEEL_DARK);

  if (facing === 'down') {
    // De frente: o visor escuro com dois olhos de luz, e a luz do peito.
    s.rect(ox + 5, y + 4, 6, 3, VISOR);
    s.rect(ox + 6, y + 5, 1, 1, GLOW);
    s.rect(ox + 9, y + 5, 1, 1, GLOW);
    s.put(ox + 6, y + 4, shade(GLOW, -60));
    s.put(ox + 9, y + 4, shade(GLOW, -60));
    s.rect(ox + 7, y + 10, 2, 1, LAMP);
  } else if (facing === 'up') {
    // De costas: grade de ventilacao e o parafuso.
    s.rect(ox + 6, y + 4, 4, 1, STEEL_DARK);
    s.rect(ox + 6, y + 6, 4, 1, STEEL_DARK);
    s.put(ox + 8, y + 10, STEEL_DARK);
  } else {
    // De lado: o visor vai para a frente, com um olho so.
    const right = facing === 'right';
    s.rect(right ? ox + 8 : ox + 4, y + 4, 4, 3, VISOR);
    s.put(right ? ox + 10 : ox + 5, y + 5, GLOW);
    s.put(right ? ox + 6 : ox + 9, y + 5, STEEL_DARK);
    s.put(right ? ox + 9 : ox + 6, y + 10, LAMP);
  }
}

const FACINGS = ['down', 'left', 'right', 'up'];

/** Spritesheet: 3 quadros na horizontal, 4 direcoes na vertical. */
function makeSheet(file, paint) {
  const frames = 3;
  const s = surface(TILE * frames, TILE * FACINGS.length);
  FACINGS.forEach((facing, row) => {
    for (let frame = 0; frame < frames; frame += 1) {
      paint(s, frame * TILE, row * TILE, facing, frame);
    }
  });
  writePng(join(OUT, file), s.width, s.height, s.data);
}

/* ---------------------------------------------------------------- main --- */

mkdirSync(OUT, { recursive: true });

for (const era of Object.keys(ERAS)) makeTileset(era);

// O Bit, o jogador: uma maquina, com o azul que ja era dele.
makeSheet('bit.png', (s, ox, oy, facing, frame) => robot(s, ox, oy, facing, frame, [86, 156, 240]));

/*
 * Um sprite por personagem historico, para que tres pessoas na mesma zona nao
 * fiquem identicas. Roupa, cabelo e um traco proprio (`look`): nenhum retrato
 * pretende ser semelhanca da pessoa real.
 */
const GRAY = [196, 196, 204];
const PEOPLE = {
  // Era 1
  pascal: { body: [150, 132, 196], hair: [70, 58, 52], look: { long: true } },
  jacquard: { body: [186, 132, 82], hair: [96, 72, 52], look: { cap: [120, 86, 60] } },
  ada: { body: [206, 106, 152], hair: [72, 46, 38], look: { long: true, pants: [150, 72, 108] } },
  // Era 2
  shannon: { body: [112, 150, 186], hair: [60, 56, 64], look: { tie: [200, 70, 70] } },
  turing: { body: [104, 136, 104], hair: [92, 70, 52], look: { tie: [60, 60, 80] } },
  jennings: { body: [226, 164, 92], hair: [128, 84, 48], look: { long: true, glasses: true } },
  // Era 3
  bardeen: {
    body: [146, 150, 164],
    hair: [84, 82, 88],
    look: { glasses: true, tie: [70, 80, 120] },
  },
  backus: { body: [98, 154, 166], hair: [84, 68, 56], look: { beard: true } },
  hopper: { body: [70, 100, 176], hair: GRAY, look: { cap: [46, 62, 120], glasses: true } },
  // Era 4
  kleinrock: { body: [128, 164, 206], hair: [78, 70, 62], look: { glasses: true } },
  cerf: { body: [60, 70, 104], hair: GRAY, look: { beard: true, tie: [190, 60, 60] } },
  'berners-lee': { body: [164, 176, 200], hair: [128, 104, 80], look: { pants: [70, 84, 120] } },
  // Era 5
  diffie: { body: [172, 174, 186], hair: [214, 214, 220], look: { long: true, beard: true } },
  goldwasser: { body: [196, 118, 142], hair: [64, 50, 58], look: { long: true } },
  marta: { body: [100, 184, 160], hair: [58, 48, 44], look: { long: true, glasses: true } },
  // Era 6
  'fei-fei': { body: [210, 122, 118], hair: [46, 40, 48], look: { long: true } },
  hinton: { body: [126, 146, 196], hair: [206, 206, 212], look: { glasses: true } },
  lecun: { body: [118, 166, 140], hair: [80, 70, 66], look: { glasses: true, beard: true } },
};

for (const [id, person] of Object.entries(PEOPLE)) {
  makeSheet(`npc-${id}.png`, (s, ox, oy, facing, frame) =>
    character(s, ox, oy, facing, frame, person.body, person.hair, person.look),
  );
}

/* ------------------------------------------------------------ BUG Day 0 --- */

const BUG = {
  body: [52, 34, 74],
  bodyDark: [34, 22, 52],
  bodyLight: [86, 58, 118],
  eye: [232, 72, 86],
  eyeHot: [255, 216, 96],
  leg: [26, 20, 38],
  glitch: [88, 224, 200],
};

/**
 * O BUG Day 0, em 32x32. Tres quadros, na ordem em que o combate os usa:
 *
 *   0  parado   — encarando o jogador
 *   1  atingido — olhos abertos, corpo rachado e fatias deslocadas
 *   2  desfeito — o corpo se espalhando em bits
 *
 * E a mesma tecnica dos outros sprites: pixel por pixel, sem asset externo, e
 * com `rng(seed)` para a textura sair identica a cada geracao.
 */
function bugFrame(s, ox, oy, variant, seed) {
  const p = rng(seed);
  const hit = variant === 1;
  const broken = variant === 2;

  // Sombra no chao.
  for (let dx = 6; dx < 26; dx += 1) s.put(ox + dx, oy + 30, [0, 0, 0, 70]);
  for (let dx = 9; dx < 23; dx += 1) s.put(ox + dx, oy + 29, [0, 0, 0, 50]);

  // Pernas: tres de cada lado, em diagonal.
  for (let i = 0; i < 3; i += 1) {
    const y = oy + 16 + i * 4;
    const reach = 5 + i;
    for (let k = 0; k < reach; k += 1) {
      s.put(ox + 9 - k, y + Math.round(k * 0.6), BUG.leg);
      s.put(ox + 22 + k, y + Math.round(k * 0.6), BUG.leg);
    }
  }

  // Corpo: contorno, casco com placas, mais escuro embaixo.
  s.disc(ox + 16, oy + 19, 10, BUG.leg);
  s.disc(ox + 16, oy + 10, 7, BUG.leg);
  s.disc(ox + 16, oy + 19, 9, BUG.bodyDark);
  s.disc(ox + 16, oy + 18, 8, BUG.body);
  s.disc(ox + 14, oy + 15, 4, BUG.bodyLight);
  for (let i = 0; i < 3; i += 1) {
    s.hline(ox + 9, oy + 16 + i * 3, 14, BUG.bodyDark);
  }

  // Cabeca.
  s.disc(ox + 16, oy + 10, 6, BUG.bodyDark);
  s.disc(ox + 16, oy + 10, 5, BUG.body);
  // Brilho do casco: um risco claro no alto, a esquerda.
  s.rect(ox + 11, oy + 13, 3, 1, [150, 116, 190]);
  s.put(ox + 10, oy + 14, [150, 116, 190]);
  s.put(ox + 13, oy + 6, BUG.bodyLight);
  s.put(ox + 14, oy + 6, BUG.bodyLight);

  // Antenas.
  for (let k = 0; k < 5; k += 1) {
    s.put(ox + 12 - k, oy + 5 - k, BUG.leg);
    s.put(ox + 20 + k, oy + 5 - k, BUG.leg);
  }
  s.put(ox + 7, oy + 0, BUG.glitch);
  s.put(ox + 25, oy + 0, BUG.glitch);

  // Olhos: vermelhos parado, quentes e maiores quando leva o golpe.
  const eye = hit ? BUG.eyeHot : BUG.eye;
  const r = hit ? 3 : 2;
  s.disc(ox + 12, oy + 10, r, eye);
  s.disc(ox + 20, oy + 10, r, eye);
  s.put(ox + 12, oy + 9, [255, 255, 255]);
  s.put(ox + 20, oy + 9, [255, 255, 255]);

  // Mandibulas.
  s.rect(ox + 13, oy + 14, 2, 2, BUG.leg);
  s.rect(ox + 18, oy + 14, 2, 2, BUG.leg);

  // Rachaduras do golpe.
  if (hit || broken) {
    for (let k = 0; k < 6; k += 1) {
      s.put(ox + 16 + k, oy + 16 + Math.round(Math.sin(k) * 2), BUG.glitch);
      s.put(ox + 15 - k, oy + 21 - Math.round(Math.sin(k) * 2), BUG.glitch);
    }
  }

  // Fatias deslocadas: o "erro" de que o BUG e feito.
  const slices = broken ? 7 : hit ? 3 : 1;
  for (let i = 0; i < slices; i += 1) {
    const y = oy + 8 + Math.floor(p() * 18);
    const w = 6 + Math.floor(p() * 12);
    const x = ox + 6 + Math.floor(p() * 10);
    s.hline(x, y, w, p() > 0.5 ? BUG.glitch : BUG.eye);
  }

  // Desfeito: pedacos soltos em volta, e buracos no corpo.
  if (broken) {
    for (let i = 0; i < 40; i += 1) {
      const x = ox + Math.floor(p() * 32);
      const y = oy + Math.floor(p() * 28);
      s.put(x, y, p() > 0.6 ? BUG.glitch : [0, 0, 0, 0]);
    }
  }
}

/** Spritesheet do chefao: 3 quadros de 32x32, na horizontal. */
function makeBug() {
  const size = TILE * 2;
  const s = surface(size * 3, size);
  for (let variant = 0; variant < 3; variant += 1) {
    bugFrame(s, variant * size, 0, variant, 0x42 + variant * 977);
  }
  writePng(join(OUT, 'bug.png'), s.width, s.height, s.data);
}

makeBug();

console.log(`pixel art gerada em ${OUT}`);
