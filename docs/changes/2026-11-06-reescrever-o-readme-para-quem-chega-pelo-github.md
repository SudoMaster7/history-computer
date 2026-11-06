# Reescrever o README para quem chega pelo GitHub

- **Data:** 2026-11-06
- **Autor:** agente (Claude Opus 5) a pedido da dona do repositorio
- **Tipo:** infraestrutura

## O que mudou

- `README.md` — reescrito inteiro, com o leitor do GitHub em mente: capturas de
  tela logo no topo, "como se joga" em cinco passos, tabela das seis eras,
  tabela de estado do projeto, comandos recolhidos num `<details>`, e indice dos
  documentos do repositorio. Tambem **removi 36 bytes corrompidos no fim do
  arquivo**.
- `docs/img/*.png` (novos) — seis capturas de tela geradas pelo Playwright no
  Pixel 5 emulado: menu, tutorial, mapa, fala, painel de estado e minijogo.
- `LICENSE` (novo) — texto da MIT, mais a nota de que o conteudo educacional e
  CC BY 4.0 e a fonte e OFL.

## Por que

O README precisava servir a quem abre o repositorio no GitHub: colegas de
grupo, a banca e quem passar por ali. O anterior comecava pela arquitetura e so
dizia o estado do projeto no meio do texto — quem chegava nao via o jogo nem
entendia em trinta segundos o que ele e.

Tres problemas concretos que o arquivo tinha:

1. **Lixo no fim do arquivo.** As ultimas linhas eram
   `#   h i s t o r y - c o m p u t e r`, bytes UTF-16 de um README gerado pelo
   GitHub que acabou concatenado neste. Isso aparecia renderizado na pagina
   inicial do repositorio.
2. **Nenhuma imagem.** Um jogo de pixel art sem captura de tela obriga o leitor
   a clonar e rodar para saber do que se trata.
3. **O README dizia MIT e nao havia arquivo `LICENSE`.** O GitHub so reconhece
   a licenca quando o arquivo existe, entao o repositorio aparecia sem licenca
   nenhuma.

## O que isso quebra

Nada de codigo. Duas coisas para resolver fora daqui:

1. **`LICENSE` esta com o titular generico** ("Da Valvula a IA — autores do
   projeto"). Troque pelos nomes do grupo antes de entregar: nao inventei nomes.
2. **`docs/img/`, `docs/fases/` e `LICENSE` ainda nao estao versionados.** Sem
   commitar `docs/img/`, as capturas aparecem quebradas no GitHub; sem
   `docs/fases/`, o aviso do README aponta para uma pasta que nao existe no
   repositorio.

## Decisoes que tomei sozinho

- **Capturei as telas com o Playwright, no Pixel 5 emulado**, em vez de pedir
  prints. Assim as imagens saem sempre no mesmo tamanho e podem ser refeitas
  quando a interface mudar.
- **Pus a tela do minijogo mesmo sabendo que ela esta atras das outras em
  acabamento**, e escrevi isso no proprio README. Esconder a tela mais fraca
  daria uma impressao que a proxima pessoa a abrir o jogo desmentiria.
- **Criei o `LICENSE` sem pedir.** O README afirmava MIT; sem o arquivo, a
  afirmacao nao se sustenta no GitHub. Deixei o titular generico de proposito,
  marcado aqui para o grupo preencher.
- **Avisei no README que `docs/fases/` esta desatualizado.** Aquele briefing
  descreve um RPG com hub 3D que nao e mais o jogo; quem ler sem o aviso vai
  implementar a coisa errada.
- **Nao criei README na raiz da pasta TCC.** O repositorio do GitHub e a pasta
  `game/`, entao a pagina inicial e este README mesmo.

## Como conferir

```bash
cd game
npm run ci     # 207 testes; o README entra na checagem de formatacao
```

Para ver como fica no GitHub antes de publicar, abra o `README.md` em qualquer
visualizador de Markdown e confira se as seis imagens de `docs/img/` carregam.
Depois:

```bash
git add README.md LICENSE docs/img docs/fases
git commit -m "Reescrever o README para quem chega pelo GitHub"
git push
```

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — nao foi tocado por esta mudanca, rodado na
      iteracao anterior com 54 testes verdes
- [x] Os testes de contrato continuam verdes **sem eu ter afrouxado nenhum
      deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que — nao mexi
- [x] Todos os links relativos do README apontam para arquivo existente
- [x] O arquivo decodifica em UTF-8 e nao tem mais nenhum byte NUL
