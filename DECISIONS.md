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
