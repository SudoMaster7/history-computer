# -*- coding: utf-8 -*-
"""
Fases de plataforma das 6 eras (D73-D75): duas por era, montadas por trechos.

Gera:
  src/data/stages.json        planta de cada fase + dados dos portoes de conceito
  src/data/stages.pt-BR.json  titulo, abertura, placas e resumo de cada fase

Legenda da planta (a fase e vista de lado; o terminal fica a direita):
  .  ar            #  chao          =  bloco        ^  espinho
  S  partida       G  terminal      C  checkpoint   F  fragmento
  i  placa         D  portao        w  engrenagem que anda
  f  inimigo que voa                t  torre        p  programa (Era 6)
  h  saltador      a  blindado (dois tiros)          v  pingo que cai do alto
  m  recarga de municao             x  chao que cai  j  mola

A corrida em si (o robo de referencia chega ao fim sem perder a fase) e
conferida em TypeScript, por tests/contract/progression.test.ts.

Rodar:  npm run stages
"""
import io, json, collections

O = collections.OrderedDict

H = 10           # linhas da fase
BASE = 8         # linha do topo do chao no nivel de partida (o chao vai ate a linha 9)
TOP = 5          # o chao nunca sobe acima desta linha


class Stage:
    def __init__(self, sid, era):
        self.id = sid
        self.era = era
        self.cols = []
        self.gadgets = []
        self.programs = []
        self.signs = []
        # Altura do chao (linha do topo). Sobe e desce em degraus (D82).
        self.level = BASE

    @property
    def floor(self):
        """Linha em que o Bit fica de pe, no nivel atual."""
        return self.level - 1

    # --- pecas basicas -------------------------------------------------------
    def column(self, put=None, ground=True):
        c = ['.'] * H
        if ground:
            for r in range(self.level, H):
                c[r] = '#'
        for row, ch in (put or {}).items():
            c[row] = ch
        self.cols.append(c)
        return self

    def run(self, n):
        for _ in range(n):
            self.column()
        return self

    def mark(self, ch, row=None):
        return self.column({self.floor if row is None else row: ch})

    def start(self):
        return self.run(1).mark('S').run(2).mark('C')

    def pit(self, n):
        assert 1 <= n <= 3, (self.id, 'buraco largo demais', n)
        for _ in range(n):
            self.column(ground=False)
        return self

    def spikes(self, n=1):
        assert 1 <= n <= 2, (self.id, 'espinho comprido demais', n)
        for _ in range(n):
            self.mark('^')
        return self

    def wall(self, h=2):
        assert 1 <= h <= 2, (self.id, 'parede alta demais', h)
        return self.column({self.floor - k: '=' for k in range(h)})

    def frag(self, row=None):
        return self.mark('F', row)

    def high_frag(self):
        """Fragmento no alto: so pega quem pula na hora."""
        return self.column({self.floor - 3: 'F'})

    def ammo(self):
        """Recarga de municao no caminho."""
        return self.mark('m')

    def sign(self, text):
        self.signs.append(text)
        return self.mark('i')

    def walker(self):
        return self.mark('w')

    def flyer(self):
        return self.mark('f', self.floor - 1)

    def turret(self):
        return self.mark('t')

    def hopper(self):
        return self.mark('h')

    def armored(self):
        return self.mark('a')

    def dropper(self):
        return self.mark('v', self.floor - 3)

    def program(self, attrs):
        self.programs.append(attrs)
        return self.mark('p')

    # --- terreno (D82) -------------------------------------------------------
    def up(self, n=1):
        """Degrau para cima: o chao sobe `n` linhas (o pulo vence ate 2)."""
        assert 1 <= n <= 2 and self.level - n >= TOP, (self.id, 'degrau alto demais')
        self.level -= n
        return self

    def down(self, n=1):
        assert self.level + n <= BASE, (self.id, 'degrau abaixo do chao de partida')
        self.level += n
        return self

    def stairs(self):
        """Escada: sobe dois degraus, anda la em cima e desce."""
        return self.run(2).up(1).run(3).up(1).run(4).down(1).run(3).down(1).run(3)

    def stones(self):
        """Buraco largo com uma pedra no meio, um degrau acima do chao."""
        self.run(2).pit(2)
        # Tres tiles: o pulo normal e o Salto de no (que vai mais longe) caem nela.
        for _ in range(3):
            self.column({self.level - 1: '='}, ground=False)
        return self.pit(2).run(4)

    def crumble(self, n=4):
        """Ponte de chao que cai sobre um buraco: passe sem parar."""
        assert 1 <= n <= 5, (self.id, 'ponte comprida demais')
        self.run(2)
        for _ in range(n):
            self.column({self.level: 'x'}, ground=False)
        return self.run(4)

    def upper(self):
        """Mola no chao e uma plataforma la no alto, com uma recarga em cima."""
        self.run(2)
        c = self.column().cols[-1]
        c[self.level] = 'j'
        self.run(1)
        top = self.level - 4
        for k in range(4):
            self.column({top: '=', top - 1: 'm'} if k == 2 else {top: '='})
        return self.run(3)

    def gate_col(self):
        """So a coluna do portao (quem chama ja pos checkpoint e placa)."""
        # Uma porta so, na altura do Bit (D88). A coluna inteira bloqueia do mesmo
        # jeito: quem decide e o core, nao o desenho.
        return self.column({self.floor: 'D'})

    def gate(self, data, text):
        """Checkpoint, placa, e o portao: ocupa a coluna inteira, nao da para pular."""
        self.mark('C').run(2).sign(text).run(4)
        self.gadgets.append(data)
        self.gate_col()
        return self.run(3)

    def goal(self):
        return self.run(3).mark('G').run(3)

    # --- saida -----------------------------------------------------------------
    def rows(self):
        return [''.join(c[r] for c in self.cols) for r in range(H)]

    def check(self):
        rows = self.rows()
        width = len(rows[0])
        for r, line in enumerate(rows):
            assert len(line) == width, (self.id, 'linha', r)
        flat = ''.join(rows)
        assert flat.count('S') == 1 and flat.count('G') == 1, (self.id, 'S/G')
        assert flat.count('F') == 3, (self.id, 'fragmentos', flat.count('F'))
        gates = sum(1 for c in self.cols if 'D' in c)
        assert gates == len(self.gadgets), (self.id, 'portoes x dispositivos')
        assert flat.count('p') == len(self.programs), (self.id, 'programas')
        assert self.level == BASE, (self.id, 'a fase termina fora do nivel de partida')
        # Nada de inimigo, buraco, espinho, mola ou chao que cai colado no portao.
        for i, c in enumerate(self.cols):
            if 'D' in c:
                for near in self.cols[max(0, i - 4):i]:
                    assert '#' in c and '#' in near, (self.id, 'buraco perto do portao')
                    assert not set('wfthav^xj') & set(near), (self.id, 'perigo colado no portao')
        return rows


# --- dispositivos ----------------------------------------------------------------

def pattern(unit, shown, hidden):
    return O([('kind', 'pattern'), ('unit', list(unit)), ('shown', shown),
              ('hidden', hidden), ('colors', ['a', 'b', 'c'])])


def circuit(neg, gates):
    return O([('kind', 'circuit'), ('neg', neg), ('gates', gates)])


def bits(width, value):
    assert 0 <= value < 2 ** width
    return O([('kind', 'bits'), ('width', width), ('value', value)])


def route(first, links, last):
    return O([('kind', 'route'), ('first', first), ('links', links), ('last', last)])


ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def cipher(word, shift):
    # Tres letras por casa: a certa, a de chave errada para frente e para tras.
    choices = []
    for i, ch in enumerate(word):
        k = ALPHA.index(ch)
        options = [ch, ALPHA[(k + shift) % 26], ALPHA[(k - 1) % 26]]
        # Gira a ordem para a certa nao ficar sempre no mesmo lugar.
        rot = i % 3
        choices.append(options[rot:] + options[:rot])
    return O([('kind', 'cipher'), ('word', word), ('shift', shift), ('choices', choices)])


def classify(attr, value, examples):
    return O([('kind', 'classify'), ('attr', attr), ('value', value), ('examples', examples)])


STYLE = {'A': 1, 'B': 5}


# --- as 12 fases -------------------------------------------------------------------
# Programa da Era 6: [cor, forma, antena]; cor 0..2, forma 0..2, antena 0..1.

stages = []
texts = O()


def add(stage, title, intro, summary):
    rows = stage.check()
    stages.append(O([
        ('id', stage.id), ('era', stage.era), ('missionId', stage.id),
        ('map', rows), ('gadgets', stage.gadgets), ('programs', stage.programs),
        ('style', STYLE[stage.id[-1]]),
    ]))
    texts[stage.id] = O([('title', title), ('intro', intro),
                         ('signs', stage.signs), ('summary', summary)])


# Era 1 -- Mecanica: Repetir ------------------------------------------------------
s = Stage('mecanica-A', 'mecanica')
(s.start()
 .sign('Segure ▶ para andar. PULAR segurado vai mais alto.').run(5)
 .pit(2).run(5).frag().run(4)
 .sign('Tiro gasta carga ⚡. Pegue baterias, ou pise nos inimigos.').run(3).ammo().run(4)
 .sign('Engrenagem! ATIRAR, ou pule em cima dela.').run(5)
 .walker().run(6).wall(1).run(5)
 .gate(pattern('ab', 4, 2), 'Portão-tear: vermelho, azul, vermelho, azul… O tecido repete um trecho. Toque na cor que vem depois.')
 .run(4).high_frag().run(4).pit(2).run(5).walker().run(6).spikes(1).run(5)
 .gate(pattern('abc', 4, 3), 'Agora o trecho tem três fios. Ache onde as cores voltam a se repetir e continue o tecido.')
 .stairs().sign('Pule na mola para subir lá no alto.').run(5).upper().ammo().run(2).run(3).sign('Blindado: dois tiros, e não dá para pisar.').run(6).armored().run(7).run(3).frag().goal())
add(s, 'O tear que se repete',
    'Era 1 · Mecânica. Em 1804, o tear de Jacquard repetia desenhos lendo cartões perfurados. Vamos ver como uma máquina repete.',
    'Você completou tecidos achando o trecho que se repete. No Tear de Engrenagens é igual: descubra o trecho e continue o tecido, fio por fio.')

s = Stage('mecanica-B', 'mecanica')
(s.start().ammo()
 .sign('Engrenagens voadoras: atire de longe.').run(5)
 .flyer().run(6).pit(3).run(5).frag().run(4).walker().run(4).walker().run(6)
 .gate(pattern('aab', 3, 3), 'Cuidado: uma cor pode aparecer duas vezes seguidas no trecho. Conte com calma antes de tocar.')
 .run(4).wall(2).run(5).spikes(2).run(5).high_frag().run(3).turret().run(8).pit(2).run(5)
 .gate(pattern('abca', 5, 4), 'O último tecido tem um trecho de quatro fios. Quem acha o trecho não precisa decorar o resto.')
 .stones().sign('Chão rachado cai: não pare em cima!').run(5).crumble().upper().ammo().run(2).run(3).armored().run(7).sign('Saltador: atire quando ele descer.').run(6).hopper().run(7).run(3).frag().goal())
add(s, 'Cartões perfurados',
    'Era 1 · Mecânica. Ada Lovelace viu no tear uma máquina que segue um programa guardado fora dela.',
    'Um programa curto faz um tecido comprido porque repete um trecho. É esse o poder REPETIR, o avô do laço de repetição.')

# Era 2 -- Logica: Decidir ----------------------------------------------------------
s = Stage('logica-A', 'logica')
(s.start().ammo()
 .sign('Válvulas só ligam e desligam. Juntas, decidem.').run(5)
 .walker().run(6).pit(2).run(5).frag().run(5)
 .gate(circuit([False, False], ['AND']), 'Porta E: a luz só acende com as DUAS chaves ligadas. Ligue as chaves e toque em Testar.')
 .run(4).flyer().run(6).spikes(1).run(5).high_frag().run(4).walker().run(6)
 .gate(circuit([False, True], ['OR']), 'Porta OU: basta UMA chave chegar ligada. A chave com NÃO funciona ao contrário: desligada, ela manda sinal.')
 .crumble().upper().ammo().run(2).run(3).hopper().run(7).run(3).frag().goal())
add(s, 'Portas que decidem',
    'Era 2 · Válvulas e Lógica. Em 1937, Claude Shannon mostrou que circuitos de liga-desliga fazem contas de verdadeiro e falso.',
    'Você abriu portões pensando nas portas E, OU e NÃO. Nos Circuitos Lógicos é assim: olhe a lâmpada e volte pelo fio antes de testar.')

s = Stage('logica-B', 'logica')
(s.start().ammo()
 .sign('Seu tiro apaga a faísca da torre.').run(5)
 .turret().run(7).pit(3).run(5).frag().run(4).walker().run(6)
 .gate(circuit([True, False, False], ['AND', 'OR']), 'Três chaves: a primeira porta é E, a segunda é OU. Comece pela lâmpada: de que ela precisa?')
 .run(4).wall(2).run(5).flyer().run(6).high_frag().run(3).spikes(2).run(5)
 .gate(circuit([False, True, True], ['OR', 'AND']), 'Duas chaves com NÃO. Pense antes de testar: cada teste errado conta.')
 .stairs().stones().upper().ammo().run(2).run(3).hopper().run(7).sign('Pingo: cai quando você chega perto.').run(6).dropper().run(7).run(3).frag().goal())
add(s, 'O ENIAC decide',
    'Era 2 · Válvulas e Lógica. O ENIAC tinha cerca de 18 mil válvulas, todas ligando e desligando para decidir.',
    'A resposta veio da combinação das chaves, não de uma ordem gravada. É o poder DECIDIR, a origem do “se… então”.')

# Era 3 -- Codigo: Codificar --------------------------------------------------------
s = Stage('codigo-A', 'codigo')
(s.start().ammo()
 .sign('Com o transistor, tudo vira bits: 0 ou 1.').run(5)
 .walker().run(6).pit(3).run(5).wall(1).run(4).frag().run(5)
 .gate(bits(3, 5), 'Mesa de 3 bits: eles valem 4, 2 e 1. Ligue os bits que somam o número pedido e toque em Gravar.')
 .run(4).flyer().run(6).high_frag().run(3).spikes(1).run(5).walker().run(6)
 .gate(bits(4, 9), 'Agora 4 bits: 8, 4, 2, 1. Comece pelo maior bit que cabe no número.')
 .stairs().crumble().upper().ammo().run(2).run(3).dropper().run(7).run(3).frag().goal())
add(s, 'Ligado e desligado',
    'Era 3 · Transistor e Linguagens. Em 1948, Shannon chamou de bit a menor peça de informação: 0 ou 1.',
    'Cada bit vale o dobro do vizinho, e o número é a soma dos bits ligados. Na Mesa de Bits você grava números assim.')

s = Stage('codigo-B', 'codigo')
(s.start().ammo()
 .sign('Grace Hopper traduzia ordens para a máquina.').run(5)
 .turret().run(7).pit(2).run(4).spikes(1).run(5).frag().run(4).walker().run(4).walker().run(6)
 .gate(bits(4, 11), 'Grave 11. Dica: 8 cabe, sobram 3; o 4 não cabe; o 2 cabe, sobra 1.')
 .run(4).wall(2).run(5).flyer().run(6).high_frag().run(3).pit(2).run(5)
 .gate(bits(5, 19), 'Cinco bits: 16, 8, 4, 2, 1. Com cinco bits dá para contar de 0 a 31.')
 .stones().upper().crumble().ammo().run(2).run(3).dropper().run(7).armored().run(7).run(3).frag().goal())
add(s, 'O compilador',
    'Era 3 · Transistor e Linguagens. Programar direto em bits era lento e cheio de erro. Por isso nasceu o compilador.',
    'Foto, música e mensagem viram fileiras de bits. É o poder CODIFICAR: escrever na língua da máquina.')

# Era 4 -- Redes: Conectar ------------------------------------------------------------
s = Stage('redes-A', 'redes')
(s.start().ammo()
 .sign('Na ARPANET, a mensagem viaja em pacotes.').run(5)
 .walker().run(6).pit(2).run(5).frag().run(5)
 .gate(route([2, 5], [[[4, 1], [1, 2]]], [1, 1]),
       'Roteador: escolha por qual máquina o pacote salta. Some os atrasos: o caminho mais barato no total é o melhor.')
 .run(4).flyer().run(6).high_frag().run(3).spikes(2).run(5).pit(1).run(5).walker().run(6)
 .gate(route([1, 4], [[[9, 8], [1, 2]]], [1, 1]),
       'Cuidado com a saída barata: veja para onde ela leva antes de escolher.')
 .stones().upper().ammo().run(2).run(3).hopper().run(7).dropper().run(7).run(3).frag().goal())
add(s, 'Pacotes em viagem',
    'Era 4 · Redes. Em 29 de outubro de 1969, o primeiro pacote saiu da UCLA para Stanford.',
    'Qualquer caminho chega; o difícil é chegar rápido. Na Rota dos Pacotes, some o atraso do caminho inteiro antes do primeiro salto.')

s = Stage('redes-B', 'redes')
(s.start().ammo()
 .sign('Caminho caiu? O pacote desvia.').run(5)
 .turret().run(7).pit(3).run(5).frag().run(4).walker().run(4).walker().run(6)
 .gate(route([3, 1, 2], [[[1, 6, 6], [7, 7, 2], [5, 1, 5]], [[2, 9, 9], [9, 9, 1], [9, 1, 9]]], [1, 2, 2]),
       'Três fileiras de máquinas. Tente de trás para a frente: qual ligação barata chega ao destino?')
 .run(4).pit(3).run(5).flyer().run(6).high_frag().run(3).pit(2).run(5)
 .gate(route([1, 2, 6], [[[8, 9, 2], [1, 3, 9], [2, 2, 2]]], [3, 1, 1]),
       'Último roteador. Some antes de saltar: o salto mais barato agora nem sempre dá o caminho mais barato.')
 .crumble().stairs().upper().ammo().run(2).run(3).armored().run(7).hopper().run(7).run(3).frag().goal())
add(s, 'Comutação de pacotes',
    'Era 4 · Redes. A rede não precisa de um fio só para cada conversa: o pacote usa as ligações que existem.',
    'É o poder CONECTAR: um salto de cada vez, pelo caminho de menor atraso. A internet funciona assim até hoje.')

# Era 5 -- Seguranca: Proteger ---------------------------------------------------------
s = Stage('seguranca-A', 'seguranca')
(s.start().ammo()
 .sign('César trocava cada letra por outra mais adiante.').run(5)
 .walker().run(6).wall(2).run(5).pit(2).run(5).frag().run(5)
 .gate(cipher('BIT', 1), 'Portão-cifra com chave 1: cada letra andou uma casa para a frente. Volte uma casa para decifrar.')
 .run(4).flyer().run(6).high_frag().run(3).spikes(1).run(5).walker().run(6)
 .gate(cipher('REDE', 2), 'Chave 2: volte duas casas em cada letra. Se passar do A, continue pelo Z.')
 .upper().stairs().ammo().run(2).run(3).dropper().run(7).armored().run(7).run(3).frag().goal())
add(s, 'A cifra de César',
    'Era 5 · Web, Nuvem e Segurança. Embaralhar mensagens é coisa antiga, e ainda protege senhas e compras.',
    'Quem tem a chave lê; quem não tem vê letras soltas. No Cofre Criptográfico você desfaz a cifra letra por letra.')

s = Stage('seguranca-B', 'seguranca')
(s.start().ammo()
 .sign('Espiões na rede: atire antes que encostem.').run(5)
 .turret().run(7).pit(3).run(5).frag().run(4).walker().run(4).walker().run(6)
 .gate(cipher('CHAVE', 3), 'Chave 3: D vira A, E vira B. Conte três casas para trás em cada letra.')
 .run(4).spikes(2).run(5).wall(1).run(5).flyer().run(6).high_frag().run(3).pit(2).run(5)
 .gate(cipher('SENHA', 3), 'Última cifra. A palavra é de verdade e tem a ver com segurança: se não fizer sentido, reconte.')
 .crumble().stones().upper().ammo().run(2).run(3).hopper().run(7).dropper().run(7).armored().run(7).run(3).frag().goal())
add(s, 'Chave pública',
    'Era 5 · Web, Nuvem e Segurança. Em 1976 e 1977, a chave pública tornou possível combinar segredos à vista de todos.',
    'Proteger não é esconder: é deixar a mensagem à vista sem que ninguém leia. É o poder PROTEGER.')

# Era 6 -- IA: Aprender ------------------------------------------------------------------
s = Stage('ia-A', 'ia')
(s.start().ammo()
 .sign('Ninguém conta a regra: descubra pelos exemplos.').run(5)
 .walker().run(6).pit(2).run(5).frag().run(4)
 .ammo().run(2).mark('C').run(2).sign('Vírus aqui são VERMELHOS. Derrube só eles.').run(5)
 .program([0, 0, 0]).run(4).program([1, 1, 0]).run(4).program([0, 2, 1]).run(4).program([2, 0, 1]).run(6))
s.gadgets.append(classify(0, 0, [[0, 1, 0], [0, 2, 1], [1, 1, 0], [2, 0, 1]]))
(s.gate_col().run(3)
 .run(4).high_frag().run(3).spikes(1).run(5).flyer().run(6)
 .ammo().run(2).mark('C').run(2).sign('Nova regra: compare a FORMA.').run(5)
 .program([1, 2, 0]).run(4).program([1, 0, 0]).run(4).program([0, 2, 1]).run(4).program([2, 1, 1]).run(6))
s.gadgets.append(classify(1, 2, [[1, 2, 0], [2, 2, 1], [1, 0, 0], [0, 1, 1]]))
(s.gate_col().stairs().upper().ammo().run(2).run(3).hopper().run(7).dropper().run(7).run(3).frag().goal())
add(s, 'Aprender com exemplos',
    'Era 6 · Inteligência Artificial. Em 2012, a AlexNet aprendeu a reconhecer imagens com exemplos, não com regras escritas.',
    'Você achou a regra olhando exemplos carimbados. No Treinar o Detector é isso: o detector é você, e programas novos provam se aprendeu.')

s = Stage('ia-B', 'ia')
(s.start().ammo()
 .sign('Só é regra se nenhum seguro tiver igual.').run(5)
 .turret().run(7).pit(3).run(5).frag().run(4).walker().run(6)
 .ammo().run(2).mark('C').run(2).sign('Todo vírus aqui tem ANTENA.').run(5)
 .program([0, 0, 1]).run(4).program([2, 1, 0]).run(4).program([1, 2, 1]).run(4).program([0, 1, 0]).run(4).program([2, 2, 1]).run(6))
s.gadgets.append(classify(2, 1, [[0, 0, 1], [1, 2, 1], [0, 1, 0], [2, 0, 0]]))
(s.gate_col().run(3)
 .run(4).wall(2).run(5).flyer().run(6).high_frag().run(3).pit(2).run(5)
 .ammo().run(2).mark('C').run(2).sign('Verde parece regra, mas não é. Olhe a forma.').run(5)
 .program([1, 1, 0]).run(4).program([1, 0, 1]).run(4).program([0, 1, 1]).run(4).program([2, 1, 0]).run(6))
s.gadgets.append(classify(1, 1, [[1, 1, 0], [0, 1, 1], [1, 0, 1], [2, 2, 0]]))
(s.gate_col().stones().crumble().upper().ammo().run(2).run(3).armored().run(7).hopper().run(7).dropper().run(7).run(3).frag().goal())
add(s, 'O detector',
    'Era 6 · Inteligência Artificial. Aprender de verdade só se prova com casos que não estavam nos exemplos.',
    'O detector não recebe a regra: ele a descobre nos exemplos. É o poder APRENDER, o último antes do BUG Day 0.')

io.open('src/data/stages.json', 'w', encoding='utf-8').write(
    json.dumps(stages, indent=1, ensure_ascii=False) + '\n')
io.open('src/data/stages.pt-BR.json', 'w', encoding='utf-8').write(
    json.dumps(texts, indent=2, ensure_ascii=False) + '\n')
print('fases:', len(stages), '- colunas:', [len(st['map'][0]) for st in stages])
