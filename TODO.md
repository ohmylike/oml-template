# TODO

## now
> bootstrap の selection layer v1 は入った。
> 次は style flavor を 1. shared foundation 2. template backport 3. bootstrap prune 4. catalog schema 拡張の順で固める。

## next
- [ ] **StyleFlavor foundation を `packages/ui` と docs に固定する** (2026-03-11)
  > `oml-template` 自体は `terra` / `neutral` / `vivid` を保持し、style metadata と shared CSS を `packages/ui` に持つ。
  > generated repo は single-flavor にする前提で、token block / metadata / README 契約を先に揃える。

## backlog
- [ ] **`bootstrap.sh` に `--style` と single-flavor prune を実装する** (2026-03-11)
  > `--style terra|neutral|vivid` を追加し、未指定時は `terra` fallback とする。
  > 生成 repo では未選択 flavor の CSS token block / metadata / selector option を削除する。

- [ ] **`apply_web_variant_selection` に web variant pruning を実装する** (2026-03-10)
  > `bootstrap.sh` には `--web b2b|b2c` と `resolve_selection`、`apply_web_variant_selection`
  > の hook が入ったが、v1 では no-op のまま。次は `apps/web` / `apps/www` まわりの
  > template 切り替え境界を決め、選択されなかった variant の除去と必要な rename /
  > placeholder 調整までを 1PR で実装する。

- [ ] **`user-auth` feature scaffold を設計し、`apply_feature_selection` に注入する** (2026-03-10)
  > bootstrap 契約上の feature 名は `user-auth`。manifest auth preset とは切り離して扱う。
  > 次の実装では scaffold の配置場所、`apps/api` / `apps/web` / workspace 依存の注入点、
  > 未選択時に痕跡を残さない pruning 方針を決めて、`apply_feature_selection` から適用する。

- [ ] **`tracking` feature scaffold を設計し、bootstrap feature として注入する** (2026-03-10)
  > `--features tracking` 選択時だけ `apps/web` / `apps/www` に
  > GTM/GA スニペット雛形と `TRACKING_ID` プレースホルダーを入れる。
  > あわせて設定ファイル側の変数定義も整え、未選択時は痕跡を残さない。

- [ ] **selection layer v1 の挙動を ADR か軽量設計メモに固定する** (2026-03-10)
  > 現在の契約は `--web b2b|b2c`、`--features user-auth,tracking|none`、
  > 非対話 default は `b2b / none`、hook は no-op。今後 pruning/scaffold を入れる前に
  > 境界と non-goal を短い ADR で固定して、template と sandbox のズレを減らす。

- [ ] **`styleFlavor` の catalogs schema 追加位置を docs で固定する** (2026-03-11)
  > 今フェーズでは schema を変えない。次フェーズで `oml-catalogs/packages/product-definition` に
  > どう差し込むか、selection payload と default 解決ルールだけを docs に残す。

## inbox
- 仕様ドキュメントを全部書くのはやめて、意思決定ADR（Architecture Decision Record）だけ軽量に残す運用にする (2026-03-07)
- AIが既存コードの古いパターンに引っ張られる問題：「止めるぞ」と明示的に宣言するルールをCLAUDE.mdやADRに入れる (2026-03-07)

## done
- [x] **StyleFlavor の template foundation と `--style` 契約を導入した** (2026-03-11 -> 2026-03-11)
  > `packages/ui` を追加し、template は multi-flavor、generated repo は single-flavor という方針を README / docs / bootstrap smoke に固定した。
- [x] **bootstrap.sh に機能選択の仕組み（フラグ解析 + 対話プロンプト）を追加した** (2026-03-07 -> 2026-03-10)
- [x] **新サービス bootstrap hardening を `oml-catalogs` の事故ベースで反映した** (2026-03-08 -> 2026-03-08)
- [x] **CLI E2E Test をプレビュー環境対向の CI ワークフローに拡張する** (2026-03-07 -> 2026-03-08)
- [x] **CLI Unit Test を command 単位へ拡張する** (2026-03-08 -> 2026-03-08)
- [x] **CLI Integration Test をローカル API 起動ベースに拡張した** (2026-03-08 -> 2026-03-08)
- [x] **CLI の `schema/export/import` に対応する API route と API transport を実装した** (2026-03-08 -> 2026-03-08)
- [x] **CLI の接続戦略を整理し、API 接続設定（`--api-url` / `API_BASE_URL`）を導入した** (2026-03-08 -> 2026-03-08)
- [x] **CLI の Unit / Integration テスト雛形を追加した** (2026-03-07 -> 2026-03-08)
- [x] **ビルド済み CLI のローカル E2E smoke と `test-template` ワークフローを追加した** (2026-03-07 -> 2026-03-08)
