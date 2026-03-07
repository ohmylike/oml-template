# TODO

## now
> CLI の検証基盤を整備する。API/web はプレビュー環境にデプロイされる前提で、CLI も3層（Unit / Integration / E2E）で検証できる構成にする。

## next
- [ ] **CLI に `--api-url` フラグと環境変数 `API_BASE_URL` での接続先切り替えを実装する** (2026-03-07)
  > CLI 検証戦略の前提となる baseUrl 外部注入の仕組み。
  > `apps/cli/src/index.ts` で gunshi の args 定義に `apiUrl` を追加し、
  > `args.apiUrl ?? process.env.API_BASE_URL ?? デフォルトURL` の優先順位で解決する。
  > `createApiClient({ baseUrl })` に渡す。これが後続のテスト全レイヤーの基盤になる。

## backlog
- [ ] **CLI Unit Test のセットアップ（モックAPI）** (2026-03-07)
  > コマンドロジックの単体テスト基盤。API クライアントをモックして、
  > 引数パース・出力フォーマット・エラーハンドリングを検証する。
  > `apps/cli/src/commands/__command__.test.ts` のパターンで配置。
  > vitest の既存設定（`vitest.config.ts`）でそのまま拾われる。

- [ ] **CLI Integration Test のセットアップ（ローカルAPI起動）** (2026-03-07)
  > ローカルで `apps/api` を起動し、CLI から実際にリクエストを投げるテスト。
  > vitest の `globalSetup` で wrangler dev or miniflare を起動、
  > `API_BASE_URL=http://localhost:8787` で CLI を実行。
  > `apps/cli/src/__tests__/integration/` に配置。DB はテスト用 Turso インスタンス。

- [ ] **CLI E2E Test（プレビュー環境対向）の CI ワークフロー作成** (2026-03-07)
  > PR 作成時にプレビューデプロイ後、ビルド済み CLI (`dist/index.js`) を
  > プレビュー API (`pr-{N}.api.__SERVICE_NAME__.ohmylike.app`) に向けて実行。
  > GitHub Actions で `deploy-preview` → `cli-e2e` の依存ジョブ構成。
  > `API_BASE_URL` をプレビュー URL から注入する。

## backlog (bootstrap feature selection)
- [ ] **bootstrap.sh に機能選択の仕組み（フラグ解析 + 対話プロンプト）を追加する** (2026-03-07)
  > bootstrap.sh を拡張して `--features auth,tracking` のようなフラグ指定、
  > またはフラグ未指定時に対話的に選択できる仕組みを入れる。
  > 選択結果を変数に格納し、後続の処理で分岐させる土台を作る。
  > まずはフラグ解析と選択UIだけ。実際のテンプレ適用は後続タスク。

- [ ] **apps/web の toB / toC テンプレートバリアントを作成する** (2026-03-07)
  > 現在の `apps/web` をベースに2つのバリアントを用意する。
  > - `apps/web-b2b/`: ダッシュボード系（サイドバーレイアウト、テーブル、フォーム中心）
  > - `apps/web-b2c/`: ユーザー向け（LP風ヒーロー、カード型一覧、プロフィール）
  > bootstrap.sh の feature 選択で `--web b2b` or `--web b2c` で切り替え。
  > 選択されなかった方のディレクトリを削除し、選択された方を `apps/web` にリネーム。

- [ ] **packages/auth テンプレートを作成し、bootstrap で選択注入する** (2026-03-07)
  > `packages/auth/` を新規作成。JWT トークン検証、セッション管理の雛形。
  > `--features auth` で選択されたら:
  > 1. `packages/auth/` を残す（未選択なら削除）
  > 2. `apps/api` にミドルウェア登録コードを注入
  > 3. `apps/web` にログインページの雛形を追加
  > 4. `pnpm-workspace.yaml` と `package.json` の依存を調整

- [ ] **トラッキングタグの feature テンプレートを作成する** (2026-03-07)
  > `--features tracking` で選択されたら:
  > 1. `apps/web` の `index.html` に GTM/GA スニペットの雛形を挿入
  > 2. `apps/www` にも同様に挿入
  > 3. 環境変数 `TRACKING_ID` のプレースホルダーを配置
  > 4. wrangler.toml の vars に `TRACKING_ID` を追加
  > 未選択ならこれらのスニペットやプレースホルダーを除去する。

## inbox
- 仕様ドキュメントを全部書くのはやめて、意思決定ADR（Architecture Decision Record）だけ軽量に残す運用にする (2026-03-07)
- AIが既存コードの古いパターンに引っ張られる問題：「止めるぞ」と明示的に宣言するルールをCLAUDE.mdやADRに入れる (2026-03-07)

## done
