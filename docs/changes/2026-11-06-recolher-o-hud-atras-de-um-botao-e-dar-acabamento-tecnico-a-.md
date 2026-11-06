# Recolher o HUD atras de um botao e dar acabamento tecnico a interface

- **Data:** 2026-11-06
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** interface

## O que mudou

- `src/ui/Hud.tsx` — reescrito. O HUD deixou de ser uma coluna fixa e virou um
  **distintivo sobre o mapa** que abre um painel. Barras de integridade e
  conhecimento agora sao segmentadas; poderes mostram nivel em tres marcas;
  mochila ganhou nome, descricao e botao de usar.
- `src/ui/icons.tsx` (novo) — 10 icones em SVG inline, mesmo tracado e mesma
  caixa, todos decorativos (`aria-hidden`) ao lado de texto que ja diz o mesmo.
- `src/ui/WorldScreen.tsx` — a mensagem e os botoes de acao viraram o
  **console**, flutuando dentro do quadro do mapa; botao de menu virou icone no
  canto; a fala e o console nao aparecem juntos.
- `src/styles/global.css` — tokens reescritos: escala de tipo, escala de espaco
  4/8, superficies, linhas, duracoes de movimento por distancia. O palco passou
  a ocupar a tela inteira (era duas colunas em tela larga).
- `src/styles/app.css` — estilos do HUD antigo removidos; entram distintivo,
  painel, medidores segmentados, poderes, mochila e console.
- `public/fonts/chakra-petch-{400,600,700}.woff2` (novos) — a fonte do jogo.
- `src/data/ui.pt-BR.json` — textos novos (`hud.of`, `hud.yearShort`,
  `items.held`) e `hud.levelShort` encurtado.
- `tests/contract/content.test.ts` — contrato novo: os cantos de cima de toda
  zona precisam ser intransponiveis.
- `tests/e2e/smoke.spec.ts` — testes ajustados ao HUD recolhido, mais um teste
  novo de fechar o painel com Esc.

## Por que

Pedido de Leticia: a barra de integridade, conhecimento, nivel e itens "deve
estar melhor estilisada e ficar escondida por um botao clicando para abrir para
dar enfase ao jogo mapa e as falas", com aspecto "mais tech" e profissional.

O HUD ocupava uma faixa permanente da tela e competia com o mapa, que e onde o
jogo acontece. Recolhido, o mapa ganhou a tela inteira.

Nao escondi tudo: o distintivo mostra a integridade em miniatura e o nivel.
Perder vida sem ver seria o tipo de surpresa que faz o jogador achar que o jogo
trapaceou. Abrir o painel e para os detalhes (clock, ano, poderes, mochila), nao
para saber se esta morrendo.

A fonte **Chakra Petch** e auto-hospedada (36 KB, 3 pesos) em vez de vir do
Google Fonts: o jogo e PWA e precisa abrir offline, e nao deve pedir nada a um
servidor de terceiros enquanto alguem joga.

## O que isso quebra

1. **Quem estiver escrevendo teste de ponta a ponta que leia o HUD** precisa
   abrir o painel antes (`.statusChip` → `.hudPanel`). O HUD nao esta mais na
   tela por padrao.
2. **A conta que converte toque em celula do mapa mudou.** O mapa agora e
   ancorado no topo (`object-position: top center`), entao a margem vertical e
   zero. Quem mexer nisso tem de mudar `toLevelPoint` em `WorldScreen.tsx` **e**
   o `tapCell` do teste de ponta a ponta juntos — eles precisam concordar.
3. **O layout de duas colunas em tela larga saiu.** Em telas largas o jogo fica
   centrado em 560 px, em proporcao de retrato, em vez de esticar.

Nenhum formato de save mudou.

## Decisoes que tomei sozinho

- **Nao segui o sistema de design que a skill sugeriu.** Ela devolveu "3D &
  Hyperrealism" com WebGL/Three.js e paleta roxo neon. O jogo e 2D em pixel art,
  o projeto proibe WebGL (D13) e ja tem identidade de cor firmada. Aproveitei
  dela so a tipografia (Chakra Petch), que combina com pixel art por ser
  angulosa, e segui o resto pelas regras de toque, contraste e movimento.
- **Barras segmentadas em vez de lisas.** Vinte blocos leem-se como "quanto
  falta" sem interpretar porcentagem, e combinam com a pixel art, que tambem e
  feita de quadradinhos.
- **O console entrou dentro do quadro do mapa.** O mapa tem proporcao propria
  (15x17), entao sempre sobra faixa no quadro. Em vez de preto morto, a faixa
  virou area util.
- **Os botoes de canto sobrepoem o mapa.** Isso esconde do toque as celulas
  embaixo deles. Hoje todas as zonas tem borda intransponivel ali, entao nao ha
  perda — mas isso era sorte das plantas atuais, nao garantia. Virou contrato
  (`content.test.ts`), senao um mapa futuro com chao no canto deixaria aquele
  pedaco inalcancavel, e o jogo e so por toque.
- **Botoes com icone sozinho levam `aria-label`;** os icones ao lado de texto
  ficam fora da leitura de tela, para nao repetir a mesma informacao duas vezes.

## Como conferir

```bash
cd game
npm run ci          # 207 testes, inclui os 56 de contrato
npm run test:e2e    # 54 testes nos 3 dispositivos
npm run dev         # e olhe no celular, em retrato
```

No jogo: entre numa zona, confira que o mapa ocupa a tela e que so o distintivo
aparece no canto. Toque nele para abrir o painel; feche com o X ou com Esc.
Perca vida e veja a miniatura do distintivo mudar de cor.

Para ver o contrato novo funcionando, abra `src/data/worlds.json` e troque o
primeiro caractere do mapa de uma zona por `,` (caminho). `npm run
test:contract` acusa que aquele canto ficaria inalcancavel por toque.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 54 em Pixel 5, iPhone 12 e desktop
- [x] Os testes de contrato continuam verdes **sem eu ter afrouxado nenhum
      deles** — acrescentei um
- [x] Se mexi em `tests/contract/`, expliquei acima por que — o contrato novo
      cobre um risco que esta mudanca criou, nao afrouxa exigencia anterior
- [x] Alvos de toque >= 44 px (ha teste medindo todos os botoes)
- [x] `prefers-reduced-motion` zera as duracoes, e o ajuste do jogo tambem
- [x] Contraste: texto normal >= 4.5:1 sobre as superficies escuras; o botao
      principal usa `#080c18` sobre `#58e0c8` (11,8:1)
