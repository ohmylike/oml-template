# TODO

## now
> CLI は `--api-url` / `API_BASE_URL` と API route 経由の `schema/export/import` まで通った。
> 次はローカルで API を実際に起動し、CLI の API mode を本当の HTTP 越しに検証する。

## next
- [ ] **CLI Integration Test をローカル API 起動ベースに拡張する** (2026-03-08)
  > 現状の CLI integration は temp libsql DB と fetch モックまでは確認できるが、
  > 実 HTTP で `apps/api` を起動して API mode の contract を検証していない。
  > テスト中にローカルサーバを立ち上げ、`API_BASE_URL=http://localhost:...` または
  > `--api-url` を使って `schema/export/import` を実行し、route と CLI の結合を確認する。

## backlog
- [ ] **CLI Unit Test を command 単位へ拡張する** (2026-03-07)
  > 現状の Unit Test は `apps/cli/src/__tests__/unit/bundle.unit.test.ts` のみで、
  > command の引数パース・出力フォーマット・エラーハンドリングは未検証。
  > API transport / DB transport を差し替えられる形にして、モックベースの
  > command test を追加する。

- [ ] **CLI E2E Test をプレビュー環境対向の CI ワークフローに拡張する** (2026-03-07)
  > 現状の `e2e/cli.test.ts` と `.github/workflows/test-template.yml` は
  > ビルド済み CLI をローカルで検証する smoke に留まる。
  > PR ごとの preview deploy 完了後に、プレビュー API URL を注入して
  > CLI E2E を走らせるワークフローへ発展させる。

- [ ] **bootstrap.sh に機能選択の仕組み（フラグ解析 + 対話プロンプト）を追加する** (2026-03-07)
  > 現状の `bootstrap.sh` は `<service_name>` の受け取りとプレースホルダ置換、
  > インフラ作成のみ。ここに `--features auth,tracking` のようなフラグ指定、
  > またはフラグ未指定時の対話選択 UI を追加し、選択結果を後続処理で
  > 参照できるようにする。まずはフラグ解析と選択 UI まで。

- [ ] **apps/web の toB / toC テンプレートバリアントを作成する** (2026-03-07)
  > 現在の `apps/web` をベースに 2 つのバリアントを用意する。
  > - `apps/web-b2b/`: ダッシュボード系（サイドバーレイアウト、テーブル、フォーム中心）
  > - `apps/web-b2c/`: ユーザー向け（LP風ヒーロー、カード型一覧、プロフィール）
  > bootstrap の feature 選択で `--web b2b` or `--web b2c` で切り替え、
  > 未選択側を削除して選択側を `apps/web` にリネームする。

- [ ] **packages/auth テンプレートを作成し、bootstrap で選択注入する** (2026-03-07)
  > `packages/auth/` を新規作成し、JWT トークン検証とセッション管理の雛形を持たせる。
  > `--features auth` 選択時だけ残し、`apps/api` のミドルウェア登録、
  > `apps/web` のログイン画面雛形、workspace 依存関係の調整まで含めて注入する。

- [ ] **トラッキングタグの feature テンプレートを作成する** (2026-03-07)
  > `--features tracking` 選択時だけ `apps/web` / `apps/www` に
  > GTM/GA スニペット雛形と `TRACKING_ID` プレースホルダーを入れる。
  > あわせて設定ファイル側の変数定義も整え、未選択時は痕跡を残さない。

## inbox
- 仕様ドキュメントを全部書くのはやめて、意思決定ADR（Architecture Decision Record）だけ軽量に残す運用にする (2026-03-07)
- AIが既存コードの古いパターンに引っ張られる問題：「止めるぞ」と明示的に宣言するルールをCLAUDE.mdやADRに入れる (2026-03-07)

## done
- [x] **CLI の `schema/export/import` に対応する API route と API transport を実装した** (2026-03-08 -> 2026-03-08)
- [x] **CLI の接続戦略を整理し、API 接続設定（`--api-url` / `API_BASE_URL`）を導入した** (2026-03-08 -> 2026-03-08)
- [x] **CLI の Unit / Integration テスト雛形を追加した** (2026-03-07 -> 2026-03-08)
- [x] **ビルド済み CLI のローカル E2E smoke と `test-template` ワークフローを追加した** (2026-03-07 -> 2026-03-08)
