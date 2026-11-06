# Preparar o deploy na Vercel

- **Data:** 2026-11-06
- **Autor:** agente (Claude Opus 5) a pedido da dona do repositorio
- **Tipo:** infraestrutura

## O que mudou

- `vercel.json` (novo) — build por Vite, redirecionamento de rota unica e
  cabecalhos de cache por tipo de arquivo, mais tres cabecalhos de seguranca.
- `vite.config.ts` — `emptyOutDir: true` no build; `scope: '/'` no manifesto do
  PWA; cor de tema atualizada para `#080c18`.
- `index.html` — `theme-color` atualizada para a mesma cor.
- `src/ui/WorldScreen.tsx` — os caminhos dos sprites passaram de relativos
  (`sprites/...`) para absolutos (`/sprites/...`).
- `.nvmrc` (novo) e `engines.node` no `package.json` — Node 22.
- `.gitignore` — ignora `.vercel`.
- `README.md` — secao "Publicar na Vercel", com a tabela de cache e o motivo de
  cada regra.

## Por que

Pedido: deixar o projeto pronto para publicar na Vercel.

A Vercel detecta Vite sozinha, entao o essencial nao era a configuracao de
build, e sim tres coisas que **quebram um PWA se ficarem no padrao**:

1. **Service worker em cache.** Se `sw.js` for cacheado, o jogador fica preso
   numa versao velha e nenhuma atualizacao chega — mesmo com `registerType:
'autoUpdate'`. `sw.js`, `manifest.webmanifest` e `index.html` agora
   revalidam sempre.
2. **Rota unica.** Sem o redirecionamento, abrir qualquer URL que nao seja `/`
   devolve 404 em vez de carregar o jogo.
3. **Arquivos sem hash no nome.** `/assets/*` tem hash e pode ficar um ano em
   cache; `/sprites/*` e `/fonts/*` nao tem, entao ficam 30 dias — quem versiona
   esses e o service worker, pelo precache do Workbox.

Dois problemas reais apareceram ao preparar isso:

- **O `dist/` nao estava sendo limpo entre builds.** Tinha 14 MB e 8 bundles
  antigos acumulados, e o service worker pre-carregava todos eles: 79 arquivos,
  4 MB. Com `emptyOutDir: true`, o build caiu para **1,1 MB e 39 arquivos de
  precache (269 KB)**. Isso ia subir para producao e todo jogador baixaria o
  lixo na primeira visita.
- **Os sprites usavam caminho relativo.** `loadImage('sprites/...')` resolve a
  partir da URL atual. Com o redirecionamento de rota unica, abrir
  `/qualquer/coisa` carregaria o jogo mas procuraria os sprites em
  `/qualquer/sprites/...`, e o mapa ficaria sem arte. O CSS ja usava caminho
  absoluto; agora os dois concordam.

## O que isso quebra

Nada de comportamento. Dois avisos:

1. **Quem tiver `dist/` antigo na maquina** vai ver o build apagar a pasta
   inteira antes de gerar. E o certo, mas se alguem guardava algo ali
   manualmente, perde.
2. **Node 22 agora esta declarado em `engines`.** Quem estiver numa versao mais
   antiga vai receber aviso do npm no `install`.

Nenhum formato de save mudou.

## Decisoes que tomei sozinho

- **Nao usei variavel de ambiente nenhuma.** O jogo roda inteiro no navegador,
  e o `localApi` nao precisa de chave. Quando o Supabase entrar, o deploy passa
  a precisar de configuracao — e ai o README muda junto.
- **Mantive os sourcemaps no build.** Ocupam espaco no deploy mas nao entram no
  precache do service worker, e o codigo e MIT: nao ha nada a esconder, e
  depurar um bug relatado pela banca fica muito mais facil.
- **30 dias para sprites e fontes, nao um ano.** Eles nao tem hash no nome; se
  alguem regenerar a arte, um cache de um ano deixaria jogadores com a arte
  velha por muito tempo. O service worker ja busca a versao nova pelo precache,
  mas o cache do navegador fica no meio do caminho.
- **`X-Frame-Options: SAMEORIGIN`.** O jogo nao precisa ser embutido em outro
  site; se um dia precisar (por exemplo, numa pagina da escola), e so tirar essa
  linha.

## Como conferir

```bash
cd game
npm run build && npm run preview   # serve exatamente o que a Vercel publica
npm run test:e2e                   # 54 testes rodam contra esse build
```

Confira que o `dist/` tem cerca de 1 MB e que o build anuncia **39 arquivos de
precache**, nao 79. Se voltar a crescer, o `emptyOutDir` saiu do lugar.

Depois do deploy, com as ferramentas do navegador: a resposta de `sw.js` deve
trazer `Cache-Control: public, max-age=0, must-revalidate`, e a de qualquer
arquivo em `/assets/` deve trazer `immutable`.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 54 testes nos 3 dispositivos, contra o build
      de producao
- [x] Os testes de contrato continuam verdes **sem eu ter afrouxado nenhum
      deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que — nao mexi
- [x] O `vercel.json` valida contra o esquema oficial (`$schema` declarado)
- [x] Build limpo: 1,1 MB, 39 arquivos de precache
