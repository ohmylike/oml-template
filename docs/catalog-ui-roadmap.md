# Catalog-Driven UI Roadmap

この roadmap は template 側から見た style flavor / preset / feature selection の進め方をまとめたもの。

## Phase 0: 契約の文書化

- ADR 0001: UI matrix
- ADR 0002: style flavor
- ADR 0003: template と generated repo の責務分離

## Phase 1: shared style foundation

- `packages/ui` に style metadata と shared CSS を置く
- template は全 flavor を保持する
- template preview の default を `neutral` にする
- `apps/web` / `apps/www` で `?style=` override を使って preview できる

## Phase 2: bootstrap single-flavor 化

- `bootstrap.sh --style` で注入した default flavor を起点にする
- 生成 repo では未選択 flavor の CSS / metadata を prune する
- fallback は `terra`

## Phase 3: web / feature pruning

- `--web` の actual pruning
- `tracking` / `user-auth` scaffold 注入

## Phase 4: catalogs schema 拡張

- `styleFlavor` を product definition schema に追加する
- catalog UI から template bootstrap に selection を流す
