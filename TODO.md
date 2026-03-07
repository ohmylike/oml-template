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

## inbox

## done
