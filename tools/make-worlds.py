# -*- coding: utf-8 -*-
# Plantas das 6 zonas. Legenda: . grama  , caminho  T arvore  ~ agua  # parede  _ piso
import io, json, collections

O = collections.OrderedDict

MECANICA = [
    "TTTTTT###TTTTTT",
    "TTTTTT#,#TTTTTT",
    "TTTTT..,..TTTTT",
    "TTTT...,...TTTT",
    "TT.....,.....TT",
    "T......,......T",
    "T......,......T",
    "T.,,,,,,,,,,,.T",
    "T......,......T",
    "T..TT..,..TT..T",
    "T..TT..,..TT..T",
    "T......,......T",
    "TT.....,.....TT",
    "TTT~~..,..~~TTT",
    "TTT~~..,..~~TTT",
    "TTTT...,...TTTT",
    "TTTTTTT,TTTTTTT",
]

LOGICA = [
    "###############",
    "#######,#######",
    "#_____,,,_____#",
    "#_##_____##___#",
    "#_##_____##___#",
    "#______,______#",
    "#_,,,,,,,,,,,_#",
    "#_,_________,_#",
    "#_,_##___##_,_#",
    "#_,_##___##_,_#",
    "#_,_________,_#",
    "#_,,,,,,,,,,,_#",
    "#______,______#",
    "#__##__,__##__#",
    "#__##__,__##__#",
    "#______,______#",
    "###############",
]

CODIGO = [
    "###############",
    "######,,,######",
    "#____,,,,,____#",
    "#_##_______##_#",
    "#_##__TTT__##_#",
    "#_____TTT_____#",
    "#,,,,,,,,,,,,,#",
    "#,___________,#",
    "#,__TT___TT__,#",
    "#,__TT___TT__,#",
    "#,___________,#",
    "#,,,,,,,,,,,,,#",
    "#______,______#",
    "#_####_,_####_#",
    "#_####_,_####_#",
    "#______,______#",
    "###############",
]

REDES = [
    "~~~~~~###~~~~~~",
    "~~~~~~#,#~~~~~~",
    "~~~~~..,..~~~~~",
    "~~~~...,...~~~~",
    "~~~~...,...~~~~",
    "~~~~~~~,~~~~~~~",
    "~~~~~~~,~~~~~~~",
    "..,,,,,,,,,,,..",
    "....,.....,....",
    "....,.....,....",
    "~~~~,~~~~~,~~~~",
    "~~~~,~~~~~,~~~~",
    "~~~~,,,,,,,~~~~",
    "~~~~~~~,~~~~~~~",
    "~~~~~..,..~~~~~",
    "~~~~~..,..~~~~~",
    "~~~~~~~,~~~~~~~",
]

SEGURANCA = [
    "###############",
    "######,,,######",
    "#.....,,,.....#",
    "#.###.....###.#",
    "#.#~~.....~~#.#",
    "#.#~~..,..~~#.#",
    "#.....,,,.....#",
    "#,,,,,,,,,,,,,#",
    "#.....,,,.....#",
    "#.#~~..,..~~#.#",
    "#.#~~.....~~#.#",
    "#.###.....###.#",
    "#.....,,,.....#",
    "#####.,,,.#####",
    "#####..,..#####",
    "#######,#######",
    "###############",
]

IA = [
    "TTTTTT###TTTTTT",
    "TTTTTT#,#TTTTTT",
    "T_____,,,_____T",
    "T_##_______##_T",
    "T_##_,,,,,_##_T",
    "T____,___,____T",
    "T,,,,,___,,,,,T",
    "T,__,,,,,,,__,T",
    "T,__,.....,__,T",
    "T,__,,,,,,,__,T",
    "T,,,,,___,,,,,T",
    "T____,___,____T",
    "T_##_,,,,,_##_T",
    "T_##_______##_T",
    "T_____,,,_____T",
    "TTTTTT,,,TTTTTT",
    "TTTTTTT,TTTTTTT",
]

# era -> (mapa, spawn, estacoes, personagens)
ZONES = [
    ('mecanica', MECANICA, (7, 15), [(3, 7), (11, 7)],
     [('pascal', 6, 4), ('jacquard', 8, 8), ('ada', 6, 11)]),
    ('logica', LOGICA, (7, 15), [(2, 7), (12, 7)],
     [('shannon', 5, 5), ('turing', 7, 10), ('jennings', 9, 12)]),
    ('codigo', CODIGO, (7, 15), [(1, 7), (13, 7)],
     [('bardeen', 4, 2), ('backus', 7, 10), ('hopper', 3, 12)]),
    ('redes', REDES, (7, 15), [(2, 8), (12, 8)],
     [('kleinrock', 5, 3), ('cerf', 8, 9), ('berners-lee', 6, 12)]),
    ('seguranca', SEGURANCA, (7, 15), [(1, 7), (13, 7)],
     [('diffie', 7, 4), ('goldwasser', 7, 10), ('marta', 3, 12)]),
    ('ia', IA, (7, 15), [(1, 7), (13, 7)],
     [('fei-fei', 7, 8), ('hinton', 3, 5), ('lecun', 11, 11)]),
]

WALKABLE = set('.,_')
DOOR = (7, 1)

out = []
for era, rows, spawn, stations, people in ZONES:
    assert len(rows) == 17, (era, 'linhas', len(rows))
    for i, r in enumerate(rows):
        assert len(r) == 15, (era, 'linha', i, len(r), r)

    def at(col, row):
        return rows[row][col]

    assert at(*spawn) in WALKABLE, (era, 'spawn bloqueado', at(*spawn))
    for c, r in stations:
        assert at(c, r) in WALKABLE, (era, 'terminal em tile bloqueado', c, r, at(c, r))
    for nid, c, r in people:
        assert at(c, r) in WALKABLE, (era, 'personagem em tile bloqueado', nid, at(c, r))
    assert at(*DOOR) in WALKABLE, (era, 'porta bloqueada')

    out.append(O([
        ('id', 'world-%s' % era),
        ('era', era),
        ('map', rows),
        ('spawn', O([('col', spawn[0]), ('row', spawn[1])])),
        ('stations', [
            O([('id', '%s-station-%s' % (era, letter)),
               ('missionId', '%s-%s' % (era, letter)),
               ('col', c), ('row', r)])
            for letter, (c, r) in zip('AB', stations)
        ]),
        ('npcs', [O([('id', nid), ('col', c), ('row', r)]) for nid, c, r in people]),
        ('door', O([('col', DOOR[0]), ('row', DOOR[1])])),
    ]))

io.open('src/data/worlds.json', 'w', encoding='utf-8').write(
    json.dumps(out, indent=2, ensure_ascii=False) + '\n')
print('zonas:', len(out), '- cada uma com', len(out[0]['npcs']), 'personagens')
