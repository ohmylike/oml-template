# ビジネスパターン概観

> ADR 0001–0003 の上位にあたる概念整理ドキュメント。
> 技術決定ではなく、ビジネス視点からプラットフォームの対応範囲を俯瞰する地図。

## 既存の技術モデルとの関係

ohmylike プラットフォームは **5 軸モデル** でサービスの UI 構成を決定する（[ADR 0003](adr/0003-catalog-driven-ui-composition.md)）。

```
Audience × Surface × Preset × StyleFlavor × Feature
```

本ドキュメントは、ビジネス側の概念（ビジネスモデル、エンドユーザー、画面用途など）が
この 5 軸にどう射影されるかを整理する。

---

## 1. ビジネスモデルと Audience の対応

### ビジネスモデルの分類

| ビジネスモデル | 説明 | 例 |
|---|---|---|
| **B2B** | 企業が企業に提供するサービス | SaaS 管理ツール、業務システム |
| **B2C** | 企業が個人に提供するサービス | 会員アプリ、予約サービス |
| **B2B2C** | 企業→パートナー企業→エンドユーザーの構造 | プラットフォーム型サービス |
| **社内ツール** | 自社内で使う業務ツール | 社内 CRM、管理ダッシュボード |

### Audience への射影

ビジネスモデルは 5 軸の `Audience`（`internal` / `b2b` / `b2c`）の **組み合わせ** に対応する。
B2B2C のような複合モデルは、複数の Audience を持つ構成として表現する。

| ビジネスモデル | 必要な Audience | 構成パターン |
|---|---|---|
| 社内ツール | `internal` | 単一 Audience |
| B2B | `b2b` | 単一 Audience（+ 任意で `public_site`） |
| B2C | `b2c` | 単一 Audience |
| B2B2C | `b2b` + `b2c` | 複数 Audience：パートナー管理（b2b）とエンドユーザー向け（b2c）を別 Surface で構成 |

> **設計判断**: ビジネスモデルは独立した軸として `ui-matrix.ts` に追加しない。
> 既存の `AudienceId` の組み合わせで表現できるため、ドキュメント上の上位概念として扱う。

---

## 2. エンドユーザーとデバイス戦略

### エンドユーザーの分類

| エンドユーザー | Audience | 典型的な利用シーン |
|---|---|---|
| **社内メンバー** | `internal` | 業務時間中、PC メイン |
| **企業担当者（B）** | `b2b` | 業務利用、PC メインだがモバイルも |
| **個人ユーザー（C）** | `b2c` | 日常利用、スマホメイン |

### デバイス戦略

エンドユーザーの利用環境に応じて、3 つのデバイス戦略がある。
これは独立した軸ではなく、各 **Preset が暗黙的に持つ属性** として扱う。

| デバイス戦略 | 説明 | 対応する Preset |
|---|---|---|
| **デスクトップファースト** | PC 画面を前提に設計。サイドバー・複雑なテーブル等 | `admin_sidebar` |
| **アダプティブ** | PC・タブレット・スマホすべてに対応 | `simple_dashboard` |
| **モバイルファースト** | スマホ画面を前提に設計。PC でも最大幅がスマホ幅程度 | `consumer_app` |

### Preset × デバイス × Audience の対応

| Preset | デバイス戦略 | 主な Audience | 画面特性 |
|---|---|---|---|
| `admin_sidebar` | デスクトップファースト | `internal` | サイドバーナビ、データテーブル中心 |
| `simple_dashboard` | アダプティブ | `b2b` | シンプルなダッシュボード、レスポンシブ |
| `consumer_app` | モバイルファースト | `b2c` | ボトムナビ、カード UI、タッチ最適化 |

---

## 3. 画面の用途と Surface × Preset の対応

### 画面用途の分類

ビジネス上の「画面の用途」は、技術モデルの **Surface × Preset** の組み合わせに対応する。

| 画面用途 | Surface | Preset | 認証 |
|---|---|---|---|
| **社内管理画面** | `web_app` | `admin_sidebar` | `cloudflare_access` |
| **B 向け管理画面** | `web_app` | `simple_dashboard` | `enterprise_sso` |
| **C 向け会員画面** | `web_app` | `consumer_app` | `consumer_simple` |
| **ホームページ（HP）** | `public_site` | `service_homepage` | `none` |
| **ランディングページ（LP）** | `public_site` | `b2b_lp` / `b2c_lp` | `none` |

### Surface の役割

| Surface | apps ディレクトリ | 用途 |
|---|---|---|
| `web_app` | `apps/web` | ログイン後の業務・会員画面 |
| `public_site` | `apps/www` | 認証不要の公開ページ（HP, LP） |

---

## 4. ソリューションパターン

ソリューションパターンは、5 軸モデルの **よくある組み合わせをバンドル** したもの。
「CRM を作りたい」と言えば、適切な軸の値が決まるイメージ。

### 代表的なパターン

| パターン名 | Audience | Surface | Preset | Feature | StyleFlavor 推奨 |
|---|---|---|---|---|---|
| **顧客管理（CRM）** | `b2b` | `web_app` + `public_site` | `admin_sidebar` + `b2b_lp` | `user-auth`, `tracking` | `neutral` |
| **営業管理** | `internal` | `web_app` | `admin_sidebar` | `user-auth` | `neutral` |
| **C 向け会員サービス** | `b2c` | `public_site` + `web_app` | `b2c_lp` + `consumer_app` | `user-auth`, `tracking` | `terra` / `vivid` |
| **コーポレートサイト** | — | `public_site` | `service_homepage` | `tracking` | `neutral` |
| **カスタム** | 任意 | 任意 | 任意 | 任意 | 任意 |

> **今後の方針**: ソリューションパターンは将来 `oml-catalogs` の `SolutionTemplateId` として
> 正式化し、catalog UI で選択 → 5 軸値の自動展開 → bootstrap という流れを実現する。

---

## 5. 画面セクションパターン

### LP / HP セクションパターン

LP・HP は複数のセクションを組み合わせて構成する。
各セクションは独立したコンポーネントとして実装される。

| セクション | 説明 | 実装状況 |
|---|---|---|
| **Hero** | キャッチコピー + CTA ボタン | `lp-hero.tsx` 実装済み |
| **Feature Grid** | 機能・特徴の一覧（2〜3 カラム） | `lp-feature-grid.tsx` 実装済み |
| **CTA** | アクション誘導セクション | `lp-cta-section.tsx` 実装済み |
| **Footer** | ナビリンク + コピーライト | `lp-footer.tsx` 実装済み |
| **Section Heading** | セクション見出し（eyebrow + badge + title） | `section-heading.tsx` 実装済み |
| Pricing | 料金プラン比較 | 未実装 |
| Testimonial | 導入事例・お客様の声 | 未実装 |
| FAQ | よくある質問 | 未実装 |
| Steps / How it works | 利用ステップ | 未実装 |
| Trust / Logo bar | 導入企業ロゴ・実績 | B2B LP で部分実装 |
| Stats / Numbers | 数値実績 | 未実装 |
| Comparison | 競合比較表 | 未実装 |

> LP/HP は今後 **数十パターン** のセクションを揃える方針。
> 上記は代表的なパターンで、ビジネス要件に応じて拡充する。

### 管理画面のページパターン

`web_app` 側のページもパターン化できる。

| ページパターン | 説明 | 典型的な用途 |
|---|---|---|
| **Dashboard** | KPI カード + グラフ + 最新アクティビティ | ホーム画面 |
| **List + Detail** | テーブル一覧 → 詳細パネル / ページ | 顧客一覧、注文管理 |
| **Form** | 入力フォーム（作成 / 編集） | 顧客登録、設定変更 |
| **Settings** | 設定項目のグルーピング | アカウント設定、通知設定 |
| **Empty State** | データ未登録時の案内画面 | 初回利用時 |
| **Kanban** | カード型のドラッグ＆ドロップボード | タスク管理、案件管理 |
| **Calendar** | カレンダー表示 | 予約管理、スケジュール |

---

## 6. スタイルフレーバーとビジネス文脈

### 既存フレーバー（[ADR 0002](adr/0002-design-style-flavors.md)）

| フレーバー | 特徴 | トーン |
|---|---|---|
| `terra` | OKLCh warm earthy カラー、強めの丸み、柔らかいグラデーション | 温かみ・親しみ |
| `neutral` | Zinc ベース、最小限のシャドウ、0.625rem radius | 実用的・プロフェッショナル |
| `vivid` | 高コントラスト、強いアクセントカラー | 鮮やか・モダン |

### ビジネス文脈での使い分け指針

| 文脈 | 推奨フレーバー | 理由 |
|---|---|---|
| B2B SaaS / 業務ツール | `neutral` | 長時間利用に適した落ち着いた UI |
| C 向けサービス | `terra` / `vivid` | ブランド感・楽しさの演出 |
| 社内ツール | `neutral` | 機能性重視、装飾は最小限 |
| LP / HP | `terra` / `vivid` | 訴求力の高いビジュアル |
| コーポレートサイト | `neutral` | 信頼感・プロフェッショナルな印象 |

> **原則**: Preset（構造）と StyleFlavor（見た目）は直交する。
> どの Preset にもどの StyleFlavor も適用できる。

---

## 7. 全体マッピング（具体例）

ビジネスモデルから 5 軸への射影を、具体的なシナリオで示す。

| シナリオ | ビジネスモデル | Audience | Surface | Preset | StyleFlavor | Feature |
|---|---|---|---|---|---|---|
| 飲食店向け予約管理 SaaS | B2B | `b2b` | `web_app` + `public_site` | `simple_dashboard` + `b2b_lp` | `neutral` | `user-auth`, `tracking` |
| フィットネス会員アプリ | B2C | `b2c` | `public_site` + `web_app` | `b2c_lp` + `consumer_app` | `vivid` | `user-auth`, `tracking` |
| 社内営業ダッシュボード | 社内ツール | `internal` | `web_app` | `admin_sidebar` | `neutral` | `user-auth` |
| EC プラットフォーム | B2B2C | `b2b` + `b2c` | `web_app`×2 + `public_site` | `simple_dashboard` + `consumer_app` + `b2c_lp` | `terra` | `user-auth`, `tracking` |
| コーポレートサイト | — | — | `public_site` | `service_homepage` | `neutral` | `tracking` |

---

## 8. 今後の拡張方針

### 短期（Phase 1–2）

- LP セクションパターンの拡充（Pricing, FAQ, Testimonial 等）
- 管理画面ページパターンの共通コンポーネント化

### 中期（Phase 3–4）

- ソリューションパターンを `oml-catalogs` の `SolutionTemplateId` として正式化
- デバイス戦略を Preset メタデータ（`responsiveStrategy`）として `ui-matrix.ts` に明示化
- セクションパターンカタログの registry 化（showcase で一覧・プレビュー可能に）

### 長期（Phase 5）

- catalog UI でソリューションパターン選択 → 5 軸値の自動展開 → repo 生成 → deploy
- セクションパターンのドラッグ＆ドロップ構成 UI

---

## リポジトリ間の責務

| リポジトリ | 役割 |
|---|---|
| **oml-sandbox** | 実験・検証。本ドキュメントの初期作成場所 |
| **oml-template** | 汎化されたスキャフォールド。sandbox で検証後に backport |
| **oml-catalogs** | 選択 UI、manifest スキーマ、ソリューションパターンの正式定義 |

> 開発フロー: sandbox で開発 → template に汎化 → catalogs から生成
