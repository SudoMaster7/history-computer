# DECISIONS.md

Registro das escolhas feitas quando o briefing deixou margem. Formato: data, decisão, motivo.

## 2026-11-05 — Fases 1 e 2

### D1. `bossScore(hpLeft, turns)` usa a vida do **jogador**

O briefing diz `2000 + 10 × vida restante − 60 × turnos` sem dizer de quem é a vida. Como a
pontuação premia quem vence rápido e inteiro, e a vida do chefão é 0 na vitória, adotamos a
**vida restante do jogador**. Está comentado em `src/core/scoring.ts`.

### D2. XP da missão: primeira conclusão paga integral; repetição paga só a melhoria

"XP por missão: 50 + 30 por estrela (conta só a melhoria em repetições)". Uma leitura literal
faria a primeira conclusão com 1★ pagar 30 XP (80 − 50). Adotamos: tentativa falhada credita 0,
primeira conclusão credita `50 + 30 × ★` integral, repetição credita a diferença. Testado em
`rpg.test.ts` ("em repeticao melhor, conta so a melhoria de XP").

### D3. `drawGate` recebe o baralho por parâmetro

`core/` não lê arquivos nem importa `data/`. A assinatura ficou
`drawGate(era, seed, deck)` em vez de `drawGate(era, seed)` — o store injeta `CARDS`.
Mudança de contrato em relação ao F1; combinada aqui.

### D4. `MinigameModule.Screen` tipado como `ScreenComponent`, não `React.ComponentType`

`core/types.ts` não pode importar React. `ScreenComponent<I, S>` é uma função que recebe
`MinigameScreenProps` e devolve `unknown`; os módulos de minijogo passam o componente React
normalmente, sem cast.

### D5. Ano do mundo derivado das eras conquistadas

O briefing não define a fórmula do relógio do HUD. `worldYear(state)` devolve o ano de abertura
da era mais avançada já conquistada (`ERA_START_YEAR`), e o ano nunca retrocede.

### D6. A carta inicial do portão é a de ano mediano

Para que haja espaço de inserção dos dois lados desde a primeira jogada, em vez de sortear
qualquer carta como inicial.

### D7. `localApi` nunca marca `verified: true`

Só a Edge Function `validate-run` (fase 6) marca verificado. O ranking local mistura um ranking
simulado (Ada, Turing, Grace) com o recorde do jogador, sinalizado como não verificado.

### D8. Baralho com 38 cartas, 6 a 7 por era

O mínimo exigido é 25. Lógica e Redes tinham só 4 candidatas no briefing, abaixo do mínimo de
5 por portão, então acrescentamos marcos consagrados (Shannon 1937, Z3 1941, Colossus 1943,
comutação de pacotes 1964, Ethernet 1973, NSFNET 1986, entre outros). 10 cartas estão com
`verified: false` à espera de conferência da F5.

### D9. Cobertura ignora `core/types.ts` e `core/index.ts`

São apenas tipos e reexports, sem lógica executável. Os demais módulos do `core` estão em 100%
de linhas e funções.

### D10. Nenhuma biblioteca fora da stack fixa

Não foi adicionada nenhuma dependência além das listadas na seção 2 do briefing. Todas as
versões estão fixas, sem `^`.

## 2026-11-05 — Pivo 1 (REVOGADO): jogo de plataforma lateral

> Revogado no mesmo dia pelo Pivo 2, mais abaixo. D11 a D16 ficam registradas
> porque explicam por que `core/level.ts` existiu e por que saiu.

O briefing (`PROMPT_MVP_Da_Valvula_a_IA.md` e os prompts F1–F5) descreve um **RPG** com hub 3D,
menu de eras e combate por turnos. A intencao do projeto e um **jogo de plataforma com
minijogos**. O produto manda, nao o documento: os documentos precisam ser atualizados.

### D11. O platformer substitui a navegacao, nao o RPG

Vida, XP, nivel, clock, arvore de poderes, portao da Linha do Tempo e chefao **ficam**. O que sai
e o hub 3D e o menu de eras: cada era agora e uma **fase de plataforma** com dois terminais
(missoes A e B) e uma porta que leva ao portao da Linha do Tempo.

### D12. Controle por "toque no destino"

O jogador toca num ponto da fase e o Bit caminha e salta sozinho ate la. Escolhido porque o
briefing exige **100% jogavel por toque simples, sem arrastar**, e um d-pad na tela precisa de
toque mantido. Consequencia tecnica boa: a travessia e um problema de grafo (plataformas =
vertices, saltos = arestas), ou seja **logica pura e deterministica** em `core/level.ts`, testavel
sem React nem fisica. Nao ha motor de fisica no projeto.

### D13. Fases em SVG, sem WebGL

Coerente com a secao 7.3 do briefing (minijogos 2D sem WebGL). Sobra Three.js apenas para a arena
do chefao, na Fase 5 — se o chefao tambem virar fase de plataforma, as dependencias de Three.js
saem do projeto.

### D14. Fases validadas por teste, nao por inspecao

`validateLevel` recusa fase com plataforma fora da area, terminal solto, porta sem exigencia ou
qualquer coisa inalcancavel a partir do spawn. Um teste roda as 6 fases e exige zero problemas,
mais rota comprovada do spawn ate cada terminal e ate a porta. Fase com problema nao entra.

### D15. Missao A resolve na mao; missao B exige repeticao

No Tear de Engrenagens, o limite de cartoes da missao A (e da versao micro) permite escrever o
padrao cartao por cartao — rende 1 estrela e ensina por contraste. Na missao B o limite e o custo
da solucao de referencia, logo **so fecha usando repeticao**, como o briefing pede. Ha teste para
as duas coisas.

### D16. A referencia do Tear e otima, calculada por programacao dinamica

`reference(instance)` acha a codificacao mais curta do padrao (menor custo em cartoes), em vez de
guardar a solucao no JSON. Assim a eficiencia 1,0 significa "tao bom quanto o melhor possivel".

## 2026-11-05 — Pivo 2: RPG de cima em pixel art

Referencia dada pelo usuario: [uniaodk/codemon](https://github.com/uniaodk/codemon), um
RPG educacional de cima, em pixel art, feito em Godot. O jogo passa a ser isso: mapa visto
de cima, personagem que anda pelo cenario, personagens com fala, terminais com os minijogos.
O platformer lateral (D11 a D16) sai inteiro.

### D17. Mapa de cima em grade, com busca em largura

Cada era e uma **zona**: uma grade de tiles onde o Bit anda em 4 direcoes, sem pulo. O
caminho ate o ponto tocado vem de busca em largura sobre as celulas caminhaveis
(`findPath`, em `core/world.ts`). Continua sendo **logica pura e deterministica**, sem
motor de fisica e sem React: a ordem dos vizinhos e fixa, entao a mesma consulta devolve
sempre o mesmo caminho, e o teste pode exigir o caminho **mais curto**.

### D18. Controle continua sendo "toque no destino"

O Codemon e de teclado e mouse (WASD). Aqui o briefing exige **100% jogavel por toque
simples, sem arrastar**, e um d-pad na tela precisa de toque mantido. O jogador toca numa
celula e o Bit anda sozinho ate la, desviando de arvore e agua.

### D19. Mapas escritos em texto no JSON

`src/data/worlds.json` desenha cada zona com caracteres (`.` grama, `,` caminho, `T`
arvore, `~` agua, `#` parede, `_` piso). `parseWorld` traduz para a grade. E mais facil de
ler e de corrigir do que uma lista de numeros, e `validateWorld` continua recusando zona
com terminal solto, porta sem exigencia ou qualquer coisa inalcancavel a partir da entrada.

### D20. As 6 zonas compartilham a planta, mudando so o cenario

As seis zonas tem hoje o mesmo traçado (caminho em cruz, dois terminais, porta ao norte) e
mudam o **tileset e os tiles de cenario** por era: bosque, bunker de valvulas, sala de
terminais, ilhas, patio murado, praca de servidores. E simplificacao consciente de MVP para
nao travar nas outras cinco eras; a planta e dado, nao codigo, entao variar depois e so
reescrever o JSON e deixar o teste conferir.

### D21. A pixel art e gerada por codigo, nao baixada

`tools/make-sprites.mjs` desenha os tilesets, o Bit (4 direcoes x 3 quadros) e os
personagens, e escreve os PNG direto, com `zlib` do Node e nenhuma dependencia nova. Assim
a arte e **autoral e sem licenca pendente** (ver `ASSETS.md`), e e deterministica: rodar de
novo gera exatamente os mesmos arquivos. Se mais tarde entrar arte de pack CC0, o script sai.

### D22. Menu de jogo e tutorial

O jogo abre num **menu** (Continuar, Novo jogo, Zonas, Ajustes, Sobre), nao mais na lista de
eras. Na primeira partida um **tutorial de 4 passos** acompanha o jogador dentro da zona: ele
anda conforme o jogador faz a acao pedida (andar, achar o terminal, usar o terminal, abrir a
porta), pode ser pulado e fica salvo como concluido.

### D23. Cada zona tem um personagem historico com fala

Ada, Alan, Grace, Vint, Whitfield e Geoffrey ficam no mapa e explicam o poder da era em uma
frase. E o canal de conteudo historico fora das cartas do portao, como os NPCs do Codemon.

## 2026-11-05 — Portao da Linha do Tempo sai; entram quiz, itens e NPCs

### D24. O portao da Linha do Tempo foi removido

A pedido do usuario. Saiu `core/timeline.ts`, `ui/Gate.tsx`, o baralho de 38 cartas
(`cards.pt-BR.json`) e os testes do portao. O conteudo historico que estava nas cartas agora
e contado pelos personagens do mapa, que e onde o jogador ja esta.

### D25. A progressao passa a ser missoes + prova da era

A porta da zona abre quando as duas missoes daquela zona estao concluidas. Atravessar a porta
abre a **prova da era**: quatro perguntas de multipla escolha, 3 acertos para passar. Passar
entrega o item da era, cura por inteiro e abre a zona seguinte.

Errar na prova **nao tira vida**: custa a repeticao, nao integridade. XP e creditado por
acerto mesmo quem reprova, para que tentar de novo nunca seja desperdicio.

### D26. A porta nao guarda lista de exigencias

Antes a porta trazia `requires: ['<era>-A', '<era>-B']` no JSON, o que permitia uma zona pedir
missao que nao existe no mapa. Agora `isDoorOpen` olha os proprios terminais da zona. O erro
deixou de ser possivel em vez de ser testado.

### D27. Um item por era, com efeito concreto

Nada de colecionavel decorativo: `valvula-reserva` cura 40 de integridade e ja e usavel pelo
HUD; `cartao-perfurado` e `fita-magnetica` darao dica nos minijogos; `pacote-roteado` e
`chave-publica` bloqueiam ataque do chefao; `modelo-treinado` aumenta dano. Os tres ultimos so
ganham efeito quando o chefao existir -- ate la, ficam guardados na mochila, e isso esta dito
aqui para nao parecer pronto.

### D28. Tres personagens historicos por zona

Cada zona tem tres figuras reais daquele momento, com nome, papel e tres a quatro falas, em
`src/data/npcs.pt-BR.json`. O conjunto responde sempre as mesmas perguntas: o que a maquina
daquela era e, o que ela consegue fazer e o que ainda nao consegue. Os sprites tem cores
proprias por pessoa, mas nenhum pretende ser retrato de semelhanca.

### D29. As 6 zonas passaram a ter plantas diferentes

Revoga a D20. Bosque em cruz, bunker com pilares, sala de terminais com jardim, ilhas ligadas
por pontes, patio murado com fosso e praca de servidores. Ha teste exigindo que as seis
plantas sejam diferentes entre si, alem da validacao de alcance que ja existia.

### D30. Os mapas e o conteudo sao gerados por script versionado

`tools/make-worlds.py`, `tools/make-npcs.py` e `tools/make-quizzes.py` escrevem os JSON de
`src/data/`. Os scripts conferem largura de linha, tile caminhavel sob cada personagem e id
repetido na hora de gerar, entao erro de digitacao no mapa nao chega no jogo.

## 2026-11-06 — Interface recolhida e acabamento tecnico

### D31. O HUD fica recolhido atras de um botao

O estado da maquina ocupava uma faixa permanente e competia com o mapa, que e
onde o jogo acontece. Agora e um distintivo no canto que abre um painel.

O distintivo **nao e so um gatilho**: mostra a integridade em miniatura e o
nivel. Esconder a vida por completo faria o jogador perder integridade sem ver,
e achar que o jogo trapaceou. O painel guarda o detalhe (clock, ano, poderes,
mochila), nao o alarme.

### D32. O console mora dentro do quadro do mapa

O mapa tem proporcao propria (15x17), entao sempre sobra faixa no quadro. Em vez
de preto morto, a faixa virou area util: mensagem de estado e acoes do lugar
onde o Bit esta. O mapa fica ancorado no topo (`object-position: top center`) e
toda a sobra desce para o rodape.

Consequencia tecnica: `toLevelPoint` passou a usar margem vertical zero. Quem
mexer no ancoramento tem de mudar a funcao **e** o `tapCell` do teste de ponta a
ponta juntos.

### D33. Os cantos de cima de toda zona sao intransponiveis

Os botoes de canto flutuam sobre o mapa, e um toque ali atinge o botao. Se uma
zona puser chao caminhavel embaixo deles, aquele pedaco fica inalcancavel — e o
jogo e **so por toque**. Virou contrato em `tests/contract/content.test.ts`.

### D34. A fonte e auto-hospedada, nao vem do Google Fonts

Chakra Petch (OFL), subconjunto latino de 3 pesos, 36 KB. O jogo e PWA e precisa
abrir offline; alem disso, nao ha motivo para pedir algo a um servidor de
terceiros enquanto alguem joga.

### D35. O sistema de design sugerido pela ferramenta foi recusado

A skill `ui-ux-pro-max` devolveu "3D & Hyperrealism", com WebGL/Three.js e
paleta roxo neon. O jogo e 2D em pixel art, o projeto proibe WebGL (D13) e a
identidade de cor ja estava firmada. Aproveitamos dela apenas a tipografia, que
combina com pixel art por ser angulosa. **Resultado de ferramenta e sugestao,
nao ordem** — vale o mesmo para quem usar a skill depois.

## 2026-11-09 — Era 2: Circuitos Logicos

### D36. O menor circuito e calculado, nao escrito a mao

`reference()` nao guarda uma expressao sorteada: ele resolve o menor circuito de
**todas** as funcoes booleanas daquele tamanho de cofre de uma vez, por
relaxamento sucessivo (parte das entradas com custo 0 e vai combinando NAO, E e
OU ate nenhum custo melhorar). Com 3 entradas sao 8 linhas, ou seja 256 funcoes
— pequeno o bastante para a tabela inteira caber em milissegundos, e memoizada
por numero de entradas.

Motivo: se a referencia fosse a expressao que o gerador sorteou, a eficiencia
mediria "quanto voce se parece com o sorteio", e um jogador que achasse circuito
melhor passaria de 1,0 sem merito proprio. Assim 1,0 significa literalmente
"tao enxuto quanto da para ser".

O custo conta a **arvore** (porta reaproveitada conta duas vezes), que e
exatamente o que `gates.length` mede numa solucao montada em arvore. Quem
reaproveitar uma porta pode fechar com menos portas que a referencia e passar de
1,0 — o teto de `SCORING.EFFICIENCY_MAX` segue valendo.

### D37. Uma porta so liga em entradas ou em portas montadas antes dela

O briefing exige grafo aciclico. Em vez de procurar ciclo, `{ gate: n }` so vale
se `n` for menor que o indice da porta que esta ligando. Aciclico por
construcao, e a regra da interface fica dizivel em uma frase: "da para puxar fio
do que ja existe". Apagar uma porta desliga os fios que apontavam para ela em vez
de deixar referencia podre.

### D38. O fio se liga em dois toques, encaixe primeiro

O briefing sugeria tocar na origem e depois no destino. Ficou o contrario:
tocar no encaixe vazio e depois na origem. Assim a lista de origens mostrada e
so a **valida para aquele encaixe** (entradas e portas anteriores), em vez de o
jogador escolher uma origem e descobrir que nao havia onde encaixar. Continua
dois toques e nenhum arrasto.

### D39. A tabela sorteada tem de usar todas as chaves do cofre

Uma funcao de 3 entradas pode ignorar uma delas. O cofre ficaria com chave
decorativa e o jogador acharia que entendeu a tabela errado. `generate` exige que
cada entrada mude a resposta em alguma linha, e ha teste exigindo isso em todas
as dificuldades.

### D40. A faixa de portas e por dificuldade, com folga decrescente

`CIRCUIT.MIN_GATES`/`TOP_GATES` dizem quantas portas a tabela sorteada pode
exigir, e `CIRCUIT.SLACK` quanta folga a solucao tem sobre a referencia: micro e
missao A sorteiam alvos pequenos e dao folga (fechar e facil, 3 estrelas nao),
a missao B aperta, e a dificuldade 3 nao da folga nenhuma — so o circuito minimo
fecha. Se o sorteio nao achar tabela na faixa em `GEN_ATTEMPTS` tentativas, ha
varredura deterministica das funcoes: a instancia nunca sai insoluvel.

## 2026-11-09 — Explicacao e dica em todo minijogo

### D41. Todo minijogo explica o que representa e da dica, e isso e contrato

A pedido do grupo: um minijogo sem explicacao vira quebra-cabeca solto — o
jogador fecha a missao sem saber o que aquilo tinha a ver com a historia da
computacao, que e o assunto do jogo. E quem trava num minijogo sem dica so tem a
saida de abandonar a missao.

Entao cada era com minijogo registrado tem, em `src/data/minigames.pt-BR.json`,
quatro textos e uma lista de dicas:

| campo        | o que responde                                           |
| ------------ | -------------------------------------------------------- |
| `machine`    | que maquina real aquilo imita, com nome e ano            |
| `represents` | o que ela fazia, para quem nunca viu                     |
| `power`      | a funcionalidade da era, ligada ao poder que a missao da |
| `lesson`     | por que o desafio e esse, e nao outro                    |
| `hints`      | dicas em ordem, da mais geral a mais concreta            |

`tests/contract/content.test.ts` cobra isso de **toda era com minijogo
registrado**, com minimo de 2 dicas. Quem implementar o minijogo da Era 3 esbarra
no contrato antes de entregar sem os textos — era esse o ponto de fazer contrato
em vez de convencao.

### D42. A ajuda fica recolhida, e a dica sai uma por toque

Mesma escolha do HUD (D31): a explicacao mora atras de um botao, nao numa faixa
permanente, porque a tela do minijogo e onde o jogo acontece. As dicas saem uma
por toque, da mais geral a mais concreta, para que quem travou numa coisa pequena
nao leve a resposta inteira na cara.

### D43. Dica nao custa pontos

A dica nao mexe em estrela, eficiencia nem pontuacao. O jogo e educacional e o
publico e adolescente curioso: cobrar pela ajuda ensina a nao pedir ajuda. Quem
quiser 3 estrelas ainda precisa da solucao enxuta, com dica ou sem.

### D44. A explicacao e componente unico, nao copia por era

`src/ui/MinigameHelp.tsx` serve todas as eras e le o texto por `EraId`. Um
minijogo novo ganha a ajuda com uma linha (`<MinigameHelp era="..." mode={mode} />`)
e o texto no JSON — nao reescrevendo o painel. No modo `micro` (chefao) o campo
`lesson` fica de fora, que e onde o espaco e mais curto.

## 2026-11-10 — Eras 3 a 6, chefao e itens de combate

### D45. Cada minijogo novo imita o algoritmo classico da era, e a referencia e o otimo

Mesa de Bits e Huffman (1952), Rota dos Pacotes e caminho minimo (Dijkstra,
1959), Cofre Criptografico e corte minimo (Menger/Ford-Fulkerson), Treinar o
Detector e selecao de atributos. Nao foi enfeite historico: a eficiencia do jogo
compara a solucao do jogador com a **referencia**, e referencia que nao e o otimo
de verdade mentiria na estrela — daria 3 estrelas para quem nao chegou ao melhor,
ou nunca daria 3 a ninguem.

Consequencia pratica: `reference()` de cada minijogo e um algoritmo exato, nao
uma heuristica. Isso cabe porque as instancias sao pequenas de proposito (3 a 5
simbolos, 6 a 10 maquinas, 6 sinais) — e o tamanho esta em `constants.ts`, nao
espalhado na regra.

### D46. A Era 5 e a Era 4 de tras para frente, de proposito

As duas telas sao a mesma gramatica (uma rede, ligacoes, um orcamento), e a licao
e oposta: na Era 4 o jogador **abre um caminho** (basta um que chegue), na Era 5
ele **fecha todos** (basta um aberto para o invasor entrar). Deixar as duas
parecidas e o que faz a inversao aparecer; se cada era tivesse uma tela
completamente diferente, o jogador nao notaria que e o mesmo grafo visto do outro
lado.

### D47. A Era 6 esconde exemplos e planta um sinal-armadilha

O conjunto de treino e visivel, o de teste nao — e so conferido no envio. Alem
disso, `generate` escolhe um sinal que no treino coincide **exatamente** com o
rotulo e no teste faz o contrario.

E o unico jeito de a era ensinar o que ela tem para ensinar: um detector que
acerta tudo o que ja viu pode nao ter aprendido nada. Quem pega o atalho acerta o
treino inteiro, envia confiante e reprova — e a mensagem da tela explica por que.
Sem a armadilha, "Aprender" viraria so mais um quebra-cabeca de logica.

### D48. O chefao nao traz mecanica nova: ele e a versao `micro` dos seis minijogos

O BUG Day 0 anuncia o ataque, e cada ataque e neutralizado por um poder. Responder
e jogar o minijogo daquela era na dificuldade `'micro'` (a versao curta, que ja
existia no tipo `Difficulty` desde o inicio).

A alternativa seria um combate com regras proprias. Foi recusada por dois
motivos: o jogo e educacional e o chefao e o lugar de **cobrar o que foi
ensinado**, nao de ensinar uma setima coisa; e um combate novo seria um sistema
novo para testar, enquanto este reusa seis logicas que ja tem centenas de testes.

### D49. A regra do combate mora no nucleo, nao na tela

`src/core/boss.ts` e pura: `strike`, `endTurn`, `patchStep`, `armShield`,
`armBonus`, `armAuto`. `BossScreen.tsx` nao calcula dano, nao decide bloqueio e
nao sabe quando a luta acabou — ela chama a funcao e desenha o que voltou.

Por isso da para testar a luta inteira sem navegador, inclusive "um veterano
respondendo sempre certo derruba o chefao" e "quem nao responde nada perde", que
sao as duas pontas do balanceamento.

### D50. Os itens de dica viraram itens de combate

O briefing dava ao Cartao Perfurado e a Fita Magnetica o papel de "revelar uma
dica no minijogo". Isso perdeu sentido com D43 (dica e de graca, ilimitada): o
item nao teria efeito nenhum.

Entao os dois passaram a resolver **um micro-desafio do chefao** com eficiencia
cheia. Os seis itens ficaram assim:

| item             | efeito no BUG Day 0                         |
| ---------------- | ------------------------------------------- |
| Cartao Perfurado | resolve um micro-desafio                    |
| Valvula Reserva  | cura 40 de integridade (ja funcionava)      |
| Fita Magnetica   | resolve um micro-desafio                    |
| Pacote Roteado   | bloqueia o ataque do turno, sem gastar acao |
| Chave Publica    | bloqueia o ataque do turno, sem gastar acao |
| Modelo Treinado  | +50% de dano no proximo golpe               |

O `kind` do item (`hint`, `heal`, `shield`, `power`) nao mudou — mudou o que
`hint` faz, e os textos em `ui.pt-BR.json` dizem o efeito novo. Fora do combate,
o HUD lista os itens de combate como guardados para o BUG Day 0.

### D51. O item guardado nao e gasto por jogar na mao

`strike` nao zera a resposta pronta (`auto`); quem gasta e `spendAuto`, chamado
so quando o jogador toca em "Usar a resposta pronta". Assim, ter o item na
mochila nunca pune quem resolve o micro-desafio sozinho — o que seria o pior tipo
de surpresa, perder um item por ter jogado bem.

O bonus de dano, ao contrario, e consumido pelo golpe: foi aplicado, foi gasto.

### D52. A campanha do contrato passou a ser jogada pelos minijogos de verdade

Antes, `progression.test.ts` fingia missao perfeita (`{ ok: true, efficiency: 1 }`).
Agora ele chama `generate` + `reference` + `evaluate` de cada era, nas seeds reais
das missoes, e no fim vence o chefao respondendo cada ataque com o micro-desafio
certo.

Com isso o contrato "o jogo e zeravel" passou a cobrir tambem: minijogo cuja
referencia nao fecha a propria missao, minijogo que nao fecha na versao `micro`
(que e o que o chefao usa) e chefao invencivel. O teste diz em qual era travou.

## 2026-11-10 — Modo desenvolvedor

### D53. O modo desenvolvedor destranca telas, e nao concede progresso

`Settings.devMode` (botao no painel de Ajustes) faz `isEraUnlocked` e
`canFaceBoss` devolverem `true`, abre a porta da prova sem cobrar as duas missoes
e, no chefao, poe os seis poderes no nivel maximo — porque sem poder nenhum a
tela do combate nao teria resposta para oferecer.

O que ele **nao** faz: marcar era como concluida, dar estrela, dar XP ou encher a
mochila. Progresso inventado mentiria no `clearedEras` e em `player.missions`, e
o save passaria a contar uma historia que nao aconteceu — inclusive para quem
pegasse aquele save depois para revisar balanceamento. Ha teste de ponta a ponta
exigindo que o save continue zerado depois de abrir o combate pelo modo.

Consequencia aceita: item de combate nao da para testar so ligando o modo, porque
a mochila segue vazia. Quem precisar disso joga a era que entrega o item, ou cola
o save de teste do `seedCleared` em `tests/e2e/smoke.spec.ts`.

Tambem ficou decidido que ele e um ajuste visivel, com texto dizendo o que abre, e
nao um atalho escondido: o jogo e de celular e nao pode depender de teclado
(secao 5 do CLAUDE.md), e parametro de URL ninguem do grupo lembraria na hora de
testar.

Quem precisar da regra **pura** de liberacao continua chamando `eraUnlocked` do
`core/powers` — ela nao sabe que o modo existe, e os contratos cobram ela. Quem
quiser a regra **com** o atalho usa `isEraUnlocked` do store.

## 2026-11-10 — Acentuacao dos textos e a arena do chefao

### D54. Texto de jogador e portugues escrito certo, com acento e cedilha

Ate aqui `ui.pt-BR.json`, as falas dos personagens e o banco de perguntas eram
ASCII puro ("Da Valvula a IA", "Missao concluida"). Num jogo educacional isso
pesa duas vezes: ensina historia da computacao com portugues errado, e a banca le
antes de qualquer jogador.

Entao: **todo texto visivel ao jogador leva acento**. Comentario de codigo,
identificador, nome de arquivo e id de dado continuam sem acento — ali o risco de
codificacao e real e o ganho e zero.

Antes de converter, conferimos o que de fato impedia: a fonte. `Chakra Petch`
esta no projeto em subconjunto latino, nos tres pesos, e tem todos os glifos
acentuados do portugues (á é í ó ú â ê ô ã õ ç à ü, maiusculas inclusive). Era o
unico motivo tecnico plausivel para o ASCII, e ele nao se sustenta.

Consequencia para quem mexer: os textos de NPC e de prova sao **gerados**
(`tools/make-npcs.py`, `tools/make-quizzes.py`). Acentuar ali, nao no JSON. E os
testes de ponta a ponta casam por rotulo — mudou texto, atualiza
`tests/e2e/smoke.spec.ts` na mesma iteracao.

### D55. O chefao tem arena, e ela nao sabe nada da regra

O combate mostrava so numeros. Agora `BossScreen` abre com uma arena: o Bit de um
lado, o BUG do outro, as duas integridades, e uma frase do que acabou de
acontecer.

Tres escolhas dentro disso:

- **A arena e leitura pura.** Ela recebe `boss`, `player` e um efeito (`fx`) e
  desenha. Nao calcula dano, nao decide bloqueio, nao guarda estado de combate —
  isso continua todo em `core/boss.ts` (D49). O `fx` so existe na tela e volta
  para `idle` sozinho depois de 900 ms.
- **Sem canvas e sem WebGL.** Os dois sprites sao PNG gerados por
  `tools/make-sprites.mjs` (`bit.png` e o novo `bug.png`, 3 quadros de 32 px:
  parado, atingido, desfeito), recortados por `background-position`. O combate
  nao tem laco de animacao: tem o quadro certo e um efeito curto de CSS. Isso
  mantem a regra da secao 5 do CLAUDE.md (mapa em canvas 2D, nada de WebGL) e nao
  acrescenta nenhuma dependencia.
- **O ajuste "Reduzir animacoes" desliga o movimento.** Com ele ligado nada se
  mexe, e o estado continua legivel pelo quadro do sprite, pela cor de fundo da
  arena e pela frase — que e o que um leitor de tela ja usava.

A barra de integridade do chefao saiu do painel de numeros e ficou so na arena:
o mesmo valor em dois medidores com o mesmo rotulo atrapalha quem navega por
leitor de tela.

## 2026-11-13 — Acabamento: movimento, som, fragmentos e resultado

### D56. Movimento e som sem biblioteca nova

O pedido era deixar o jogo "mais divertido, com animações" e perguntava se valia
usar uma biblioteca de efeitos. Foram consideradas Motion (animação de
interface) e ZzFX (som sintetizado). Não entrou nenhuma: **a D10 continua
valendo**.

O que o jogo precisava cabe no que ele já tinha:

- **Animação de interface** em CSS (`src/styles/fx.css`): entrada de tela,
  estrelas, estouro de partículas, tremor, brilho.
- **Animação do mapa** no canvas 2D que já existia (`src/ui/worldArt.ts`).
- **Som** com a Web Audio API (`src/fx/sound.ts`): cada efeito é uma ou mais
  notas de oscilador. Sem arquivo de áudio, sem licença de terceiros, e o jogo
  continua abrindo offline.

O que se perde é animação de **saída** de tela (o elemento some na hora), que só
uma biblioteca resolveria bem. Foi troca consciente: animação de saída mantém
dois elementos na página ao mesmo tempo, e os testes de ponta a ponta casam por
rótulo — dois títulos iguais na tela derrubariam a suíte.

Duas regras nasceram daqui e estão escritas no topo de `fx.css`:

- **Nenhuma animação em laço mexe em `transform` ou tamanho de botão.** Botão
  chama atenção com brilho (`box-shadow`). Botão que pulsa de tamanho escapa do
  dedo e do teste de 44 px.
- **Toda animação termina num quadro que faz sentido parado**, porque "Reduzir
  animações" zera a duração (e, agora, o atraso) de todas.

### D57. O mapa tem laço de animação, e o canvas tem 3 px por pixel do mapa

Antes o mapa só era redesenhado enquanto o Bit andava. Agora ele tem um laço
próprio: água que brilha, personagens que respiram e olham para o Bit,
marcadores que quicam, poeira no passo, ciscos no ar com o jeito de cada era.

O canvas passou a ter `WORLD.SCALE` (3) pixels por pixel do mapa. A pixel art
continua em 16 px por tile; o que muda é que o Bit anda um terço de pixel por
vez e os marcadores não ficam serrilhados. Essa constante já existia e não era
usada. **Consequência para os testes:** `tapCell`, em `tests/e2e/smoke.spec.ts`,
tira o lado do tile de `data-cols` no canvas, em vez de supor 16.

Nada disso é regra de jogo, e com "Reduzir animações" o laço nem começa: o mapa
é desenhado parado, com os mesmos marcadores no mesmo lugar.

### D58. O Bit não atravessa terminal, personagem nem porta

Tocar num terminal levava o Bit para **cima** dele, cobrindo o sprite; com
personagem, o personagem sumia atrás do Bit. Agora o Bit para na célula livre ao
lado e vira para o que foi tocado.

Entrou `approachPath` em `core/world.ts`, ao lado de `findPath`, que **não
mudou**:

- `findPath` responde "o chão deixa passar?". É o que o contrato de progressão
  confere, e continua igual.
- `approachPath` responde "por onde o Bit vai?": desvia de célula ocupada e,
  quando o destino é ocupado, para ao lado.

`validateWorld` passou a acusar zona em que um personagem tampa a passagem para
outra coisa (`sem acesso a pe`). As seis zonas passam.

### D59. Fragmentos de memória: colecionável que sai da planta da zona

O mapa não tinha nada para achar além dos terminais e dos personagens. Cada zona
ganhou 3 fragmentos; pisar num deles rende conhecimento (`RPG.FRAGMENT_XP`) e
mostra uma curiosidade da era.

- **Os lugares não estão no JSON do mapa.** Saem de `fragmentsOf(world)`, por
  sorteio com seed fixa sobre a planta, só em célula alcançável a pé e fora do
  caminho principal quando há espaço. Zona nova já nasce com os seus.
- **O texto mora em `src/data/fragments.pt-BR.json`**, escrito à mão como
  `ui.pt-BR.json` e `minigames.pt-BR.json`. São 18 curiosidades e, como as falas
  e as provas, **ainda precisam de conferência em fonte primária** (ver
  `ASSETS.md`).
- **O save ganhou a lista `fragments`**, fora de `PlayerState`. Campo novo com
  valor inicial não invalida save antigo, então `STORAGE.VERSION` não subiu —
  mesma escolha feita para `bossDefeated`.

### D60. O som continua desligado por padrão, com botão no menu

O briefing pede áudio "mudo por padrão", e isso foi mantido. Para o som não
ficar escondido, o menu inicial ganhou um botão de som no canto, além do ajuste
na tela de ajustes. Todo botão do jogo toca pelo mesmo ouvinte em `App.tsx`; um
botão escolhe o próprio efeito com `data-sfx`.

### D61. O ganho é avisado pelo HUD, e o resultado mede antes e depois

Duas telas mostram recompensa sem refazer conta nenhuma do núcleo:

- **O HUD** compara o jogador de uma renderização com o da seguinte e avisa
  quando o conhecimento ou o nível sobem. Vale para missão, prova e fragmento
  sem nenhuma tela precisar lembrar de avisar.
- **O resultado da missão** (`MissionResult`) recebe a diferença entre o jogador
  antes e depois de `completeMission`: conhecimento ganho, nível, poder, recorde.

### D62. Multiplayer fica só documentado

Ranking, duelo assíncrono e batalha entre jogadores estão desenhados em
`docs/MULTIPLAYER.md`, e **nada disso foi implementado**. O documento separa o
que cabe no briefing (ranking e duelo assíncrono) do que muda o escopo (tempo
real), e recomenda uma batalha por turnos assíncrona antes de qualquer tempo
real.

## 2026-11-13 — Música de fundo e pixel art refeita

### D63. A música é partitura em código, tocada por um sequenciador

O pedido era música de fundo. Ela segue a mesma escolha dos efeitos (D56): **não
há arquivo de áudio**. `src/fx/music.ts` guarda nove faixas como partitura — tom,
escala, quatro acordes e uma melodia de 32 passos — e um sequenciador as toca em
laço com três vozes de oscilador (baixo, arpejo, melodia).

- **Uma faixa por lugar:** menu, cada uma das seis eras (que segue tocando dentro
  da missão), prova e chefão. Quem escolhe é `App.tsx`, pela tela.
- **Nada é sorteado.** A mesma faixa soa sempre igual.
- **Dois ajustes.** A música só toca com o som ligado **e** "Música de fundo"
  ligada. O ajuste novo (`settings.music`) nasce ligado, então quem liga o som
  ouve música; quem quer só os efeitos desliga a música. Save antigo não tem a
  chave e é lido como ligado.
- **Para o teste:** a faixa atual aparece em `data-music` na raiz do app.

O que isso não é: trilha composta por músico. São temas curtos de chip, feitos
para não cansar em laço. Se o grupo gravar ou licenciar música de verdade, o
ponto de troca é `playMusic`.

### D64. O Bit é um robô

O Bit era desenhado como uma pessoa, igual aos personagens históricos, embora a
história o chame de máquina desde o briefing ("o Bit, uma máquina primitiva").
Agora ele é um robô pequeno: cabeça de caixa com visor, olhos de luz, antena.
Mesma folha de sprites (3 quadros × 4 direções, 16 px), então nenhuma tela mudou.

### D65. A pixel art foi refeita no gerador, não trocada por pack

Continua valendo a D21: toda a arte sai de `tools/make-sprites.mjs`, sem asset de
terceiros. O que mudou foi o desenho:

- **Paletas por era** mais vivas, e cada zona com a sua cara: campo (Mecânica),
  laboratório de válvulas, sala do mainframe, campus com pinheiros (Redes),
  entardecer (Segurança), datacenter (IA).
- **Tiles com volume:** árvore com contorno, luz e sombra; pinheiro nas zonas
  `pine`; parede de tijolo em fiadas; piso em placas chanfradas; terminal e porta
  redesenhados. Zona a céu aberto ganhou pedra própria (`wall`) no prédio da porta.
- **Personagens com traço próprio** (`look`): cabelo comprido, barba, óculos,
  boné, gravata. Continuam sem pretender semelhança com quem existiu.
- **O formato das folhas não mudou** (8 tiles de 16 px; 3×4 quadros por
  personagem; 3 quadros de 32 px no BUG), que é o que as telas e o contrato leem.

### D66. O chão do mapa é desenhado uma vez, e ganha borda, sombra e flores

`buildGround` (`src/ui/worldArt.ts`) monta o chão da zona num canvas à parte,
uma vez por zona; o laço do mapa só copia essa camada. Antes eram 255 tiles
redesenhados a cada quadro.

É nessa camada que os tiles deixam de parecer ladrilho solto: caminho com borda
onde encosta na grama, água com margem clara, parede e árvore projetando sombra
no tile de baixo, e flores espalhadas nas zonas a céu aberto. As flores **não**
ficam no tile de grama de propósito — repetidas em toda célula viravam uma grade
de pontinhos.

### D67. Em tela larga o jogo fica na coluna de 560 px, como sempre foi a intenção

`global.css` já pedia `width: min(100%, 560px)` no desktop, mas `.layout` tinha
`flex: 1` dentro de um contêiner flex e a largura era ignorada: o jogo esticava
pela janela inteira. Corrigido com `flex: 0 1 560px`.
