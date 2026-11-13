# ASSETS.md

Registro de assets e licencas. Codigo MIT; conteudo educacional CC BY 4.0.
Assets de terceiros apenas CC0 ou compativeis.

| Asset                                           | Origem                               | Licenca   | Onde e usado              |
| ----------------------------------------------- | ------------------------------------ | --------- | ------------------------- |
| `public/favicon.svg`                            | feito neste projeto                  | CC BY 4.0 | aba do navegador          |
| `public/icon-192.png`, `public/icon-512.png`    | gerados neste projeto (placeholder)  | CC BY 4.0 | PWA                       |
| Textos das cartas (`src/data/cards.pt-BR.json`) | escritos neste projeto               | CC BY 4.0 | portao da Linha do Tempo  |
| Textos de interface (`src/data/ui.pt-BR.json`)  | escritos neste projeto               | CC BY 4.0 | toda a UI                 |
| `public/sprites/tiles-<era>.png`                | gerados por `tools/make-sprites.mjs` | CC BY 4.0 | tiles das zonas           |
| `public/sprites/bit.png`                        | gerado por `tools/make-sprites.mjs`  | CC BY 4.0 | o jogador, 4 direcoes     |
| `public/sprites/npc-<pessoa>.png`               | gerados por `tools/make-sprites.mjs` | CC BY 4.0 | 18 personagens historicos |
| `public/sprites/bug.png`                        | gerado por `tools/make-sprites.mjs`  | CC BY 4.0 | o BUG Day 0, 3 quadros    |
| Fonte                                           | pilha do sistema (`system-ui`)       | n/a       | toda a UI                 |
| Curiosidades (`src/data/fragments.pt-BR.json`)  | escritas neste projeto               | CC BY 4.0 | fragmentos de memoria     |
| Efeitos sonoros                                 | sintetizados em `src/fx/sound.ts`    | MIT       | todo o jogo               |
| Marcadores e particulas do mapa                 | desenhados em `src/ui/worldArt.ts`   | MIT       | mapa e faixa do menu      |

## Fonte

**Chakra Petch**, de Cadson Demak, sob a SIL Open Font License 1.1 — licenca que
permite uso, modificacao e redistribuicao, inclusive comercial, desde que a
fonte nao seja vendida isoladamente e que o nome reservado seja respeitado.

Estao no repositorio apenas os subconjuntos latinos dos pesos 400, 600 e 700, em
woff2, somando 36 KB. **Auto-hospedada de proposito**: o jogo e PWA e precisa
abrir offline, e nao deve pedir nada a um servidor de terceiros enquanto alguem
joga. Origem: <https://fonts.google.com/specimen/Chakra+Petch>.

## Pixel art

Toda a pixel art do jogo e **autoral e gerada por codigo**: `tools/make-sprites.mjs` desenha
os tilesets, o Bit e os personagens e escreve os PNG usando so o `zlib` do Node, sem
dependencia nova e sem download. Regenerar com `npm run sprites` produz exatamente os
mesmos arquivos (o gerador de ruido e deterministico). Nao ha asset de terceiros no
projeto, portanto nao ha licenca pendente de atribuicao.

## Som

Nao ha arquivo de audio no projeto. Os 16 efeitos sao notas de oscilador geradas
na hora pela Web Audio API (`src/fx/sound.ts`): o som e codigo, entao segue a
licenca do codigo e nao ha nada de terceiros para atribuir. Comeca desligado; o
jogador liga no menu.

## Pendente

- Icones PWA definitivos (os atuais sao placeholders solidos).
- Retratos maiores dos personagens para a caixa de fala (hoje so o sprite do mapa).
- Conferencia em fonte primaria das falas e das perguntas.
- Musica de fundo: ha efeitos, nao ha trilha.
- Capturas de tela do `README.md` (`docs/img/`): sao de antes do acabamento visual.

## Conteudo historico

As falas dos personagens, as perguntas das provas e as curiosidades dos fragmentos foram escritas para este projeto a partir
de conhecimento consolidado sobre a historia da computacao. **Ainda nao passaram por
conferencia em fonte primaria**: datas, atribuicoes e numeros (como as 18 mil valvulas do
ENIAC) precisam ser checados antes do congelamento de escopo.

Os sprites dos personagens usam cores proprias por pessoa, mas nenhum pretende ser retrato de
semelhanca de quem existiu.
