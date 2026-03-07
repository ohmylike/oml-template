---
name: diff-check
description: >
  oml-template と oml-sandbox 間の差分を検出・分類・解消するワークフロー。
  開発方針は「sandbox で開発 → template に汎化」。
  トリガー: 「diff-check」「差分」「template sync」「テンプレート同期」「template と sandbox の違い」
  などの発話、または template/sandbox 間の乖離を確認・解消する場面。
---

# Diff Check: Template-Sandbox 同期ワークフロー

## 前提

- `oml-sandbox` で機能開発し、汎用化したものを `oml-template` に反映する
- `scripts/diff-check.sh` が差分検出ツール（`--brief` で概要のみ）
- テンプレート側の `__SERVICE_NAME__` は `sandbox` に置換してから比較される

## ワークフロー

### Step 1: 差分検出

```bash
./scripts/diff-check.sh --brief
```

差分ゼロなら終了。差分があれば Step 2 へ。

### Step 2: 差分の分類

各差分を以下の4カテゴリに分類する。

| カテゴリ | 方向 | 判断基準 |
|---------|------|---------|
| **(a) template に反映** | sandbox → template | sandbox で行った改善・修正で、全サービス共通にすべきもの |
| **(b) sandbox を修正** | template → sandbox | sandbox 側が意図せずズレたもの（typo、不要な変更の混入等） |
| **(c) 除外対象に追加** | - | 生成ファイル・ビルド成果物（`.tanstack`, `routeTree.gen.ts` 等） |
| **(d) 要確認** | - | 意図が不明。ユーザーに判断を仰ぐ |

分類のヒント:
- ワークフロー改善、devツール設定 → 通常 **(a)**
- doctype/lang 等の些末な差異 → 通常 **(b)**
- `dist/`, `.wrangler/`, 自動生成ファイル → 通常 **(c)**
- 片方にしか存在しないファイル → まず中身を確認し、空なら **(c)**、実体があれば **(d)**

### Step 3: 分類結果を提示

分類結果をテーブル形式でユーザーに提示し、承認を得る。

```
### (a) template に反映 (sandbox → template)
| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | ... | ... |

### (b) sandbox を修正 (template → sandbox)
...

### (c) 除外対象に追加
...

### (d) 要確認
...
```

### Step 4: 変更を実行

承認された分類に従い変更を適用する。

- **(a)**: template 側のファイルを編集（`__SERVICE_NAME__` プレースホルダーを維持）
- **(b)**: sandbox 側のファイルを template に合わせて編集
- **(c)**: `scripts/diff-check.sh` の `DIFF_EXCLUDES` に追加、または不要ファイルを削除
- **(d)**: ユーザーの判断に従う

### Step 5: 再検証

```bash
./scripts/diff-check.sh
```

"No differences found" が出れば完了。差分が残っていれば Step 2 に戻る。

## 注意事項

- template 編集時は `__SERVICE_NAME__` を実際のサービス名に置き換えないこと
- `diff-check.sh` の除外リストは rsync 用（`TEMPLATE_DIR` コピー時）と diff 用（`DIFF_EXCLUDES`）の2箇所がある。生成ファイルは diff 用に追加すれば十分
- 空ディレクトリは git で追跡されないため、diff に出ても実害がなければ無視してよい
