# ADR 0001: Web UI Matrix

- Status: Accepted
- Date: 2026-03-10

## 背景

- `oml-template` には `apps/web` (`web_app`) と `apps/www` (`public_site`) がある。
- `internal` / `b2b` / `b2c` は app 名ではなく audience id として扱う。
- 新規 repo を bootstrap するときに audience と app directory を混同すると、preset・routing・selection contract が崩れる。
- template 側で stable な matrix を先に固定しておく必要がある。

## 決定

### 1. app topology は surface 単位のままにする

- `web_app` は `apps/web`
- `public_site` は `apps/www`

`apps/internal`、`apps/b2b`、`apps/b2c` は作らない。

### 2. shared UI foundation は `packages/ui` に置く

`packages/ui` は以下を持つ。

- UI matrix の型と定数
- style flavor metadata
- shared CSS foundation
- 将来 template から各 service repo に戻せる generic seam

`apps/web` / `apps/www` は routing と surface 固有 composition に専念する。

### 3. audience-to-surface matrix は以下を正とする

| Audience | Primary surface | Optional surface | Default preset(s) | Auth expectation |
| --- | --- | --- | --- | --- |
| `internal` | `web_app` | none | `admin_sidebar` | `cloudflare_access` |
| `b2b` | `web_app` | `public_site` | `simple_dashboard`, `b2b_lp` | `enterprise_sso` |
| `b2c` | `public_site` | `web_app` | `b2c_lp`, `consumer_app` | `consumer_simple` |

補足:

- `service_homepage` は単一 audience に固定しない `public_site` preset
- 例外ケースは template 既定ではなく service repo 側で document 化する

## 影響

- template から生成される repo は audience 用 app directory を増やさない。
- preset / style / feature は同じ matrix の上に積む。
- UI contract を catalogs と同期するときは、この ADR と `packages/ui` を一緒に更新する。

## 非目標

- visual style の最終決定
- auth flow の実装
- backend contract の実装
