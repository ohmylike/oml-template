# ADR 0002: Design Style Flavors

- Status: Draft
- Date: 2026-03-11

## 背景

template は新規 repo の初期状態を作る基盤であり、将来の catalog UI から style を選ぶ入口にもなる。
そのため、preset と独立した visual 軸を template 自体が保持する必要がある。

同時に、生成された repo は「選んだ flavor だけを持つ」方が分かりやすい。よって template と生成 repo では
保持する範囲を分ける必要がある。

## 決定

### 1. `StyleFlavorId` を正式な selection axis にする

```text
Audience × Surface × Preset × StyleFlavor
```

- Preset は構造
- StyleFlavor は visual treatment

### 2. template は全 flavor を保持する

template には `terra` / `neutral` / `vivid` を保持する。

理由:

- 将来の catalog UI で selectable な一覧を持つため
- showcase や docs の基盤になるため
- service repo へ戻す前の generic contract を一か所で持つため

### 3. 生成 repo は single-flavor にする

bootstrap 後の repo は、選択した flavor だけを残す。

prune 対象:

- 未選択 flavor の CSS token block
- 未選択 flavor の metadata
- 未選択 flavor の selector / showcase option

### 4. root の `data-style` を正とする

各 app の root は `data-style="__DEFAULT_STYLE_FLAVOR__"` を持ち、bootstrap がそれを選択 flavor に置換する。

### 5. default 解決ルール

1. `--style` 明示指定
2. 将来の selection manifest 由来の値
3. 未指定時のみ `terra`

## 影響

- template README と bootstrap help に `--style` を追加する。
- `packages/ui` は flavor metadata と shared CSS を持つ。
- catalogs schema 追加は後続フェーズで扱う。

## 非目標

- catalog schema の即時変更
- runtime visual editor
- audience ごとの flavor 制限
