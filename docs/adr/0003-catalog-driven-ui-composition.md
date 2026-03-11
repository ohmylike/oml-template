# ADR 0003: Catalog-Driven UI Composition Contract

- Status: Draft
- Date: 2026-03-11

## 背景

- template は sandbox の generic 成果を受け取る場所である。
- 将来的には `oml-catalogs` から選択された内容を template bootstrap に流し込みたい。
- その前に、何を template が保持し、何を生成 repo で prune するかを文書化する必要がある。

## 決定

### 1. contract は 5 軸で表現する

```text
Audience x Surface x Preset x StyleFlavor x Feature
```

### 2. repo ごとの責務

| Layer | 責務 |
| --- | --- |
| `oml-catalogs` | selection UI、schema、validation、plan |
| `oml-template` | generic bootstrap contract、shared docs、shared style foundation |
| service repo | service 固有 copy、実験、local default |

### 3. style flavor は docs 先行で進める

このフェーズでは schema をまだ変えず、template の docs / bootstrap / metadata を先に固める。

### 4. template は multi-flavor、生成 repo は single-flavor

- template: 全 flavor を保持
- generated repo: 選択 flavor を default として注入し、prune は後続フェーズで完成させる

### 5. sandbox から template への backport 条件

- generic な API / metadata である
- docs が更新済みである
- smoke / test / showcase のどれかで検証できる
- service 固有 copy を含まない

## 影響

- `bootstrap.sh` は `--style` と prune を扱う
- `packages/ui` は selection contract の shared seam になる
- catalogs schema への `styleFlavor` 追加位置は docs で先に固定する

## 非目標

- catalog launcher の一括実装
- service 固有 UI の共通化
