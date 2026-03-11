# ADR 0004: Template-Service Feedback Loop and Safe Migration

- Status: Draft
- Date: 2026-03-11

## 背景

- `oml-template` は `oml-sandbox` や各 `oml-*` service で検証された generic な成果を取り込みながら育てたい。
- 同時に、template 側で育った generic な機能やデザインを、既存の `oml-*` service に安全に戻せる経路も必要である。
- この反映を AI に補助させたいが、service 固有の copy、ドメイン、画面差分を自動で壊さない前提が必要である。

## 決定

### 1. template と service repo の同期は双方向とする

| 方向 | 主対象 | 条件 |
| --- | --- | --- |
| service / sandbox -> template | generic な改善、共有 UI、docs、bootstrap 改善、テスト | service 固有要素を含まない |
| template -> service | service が未保持の generic feature、shared design、contract 更新 | opt-in の migration として扱う |

`service -> service` の直接同期は原則行わず、generic 化できるものは一度 `oml-template` を経由させる。

### 2. template -> service の反映は migration unit 単位で扱う

1 回の migration では 1 つの目的だけを扱う。
たとえば「shared LP section を追加する」「`packages/ui` の style contract を更新する」
「generic feature scaffold を導入する」といった粒度に分ける。

各 migration unit は少なくとも次を持つ。

- 何を追加・変更するのか
- 影響する path / package / env
- 自動適用してよい箇所と review 必須箇所
- build / test / smoke などの検証方法
- rollback の方法

### 3. ファイルの所有権を分ける

| 種別 | 例 | 既定動作 |
| --- | --- | --- |
| template-owned | `bootstrap.sh`、shared docs、`packages/ui`、generic scaffold | template を正として同期候補にできる |
| service-owned | service 固有 copy、ドメインモデル、個別連携、サービス専用 route/page | 自動上書きしない |
| shared seam | app shell、env wiring、preset 入口、shared component の利用箇所 | AI が差分案を出し、人が承認する |

template から service への migration は、template-owned と shared seam を中心に扱う。
service-owned の変更は migration plan に含めない。

### 4. AI 協調 migration は review-first で進める

1. AI が template と対象 service の差分、未反映機能、依存差分を検出する
2. 差分を `template-owned` / `service-owned` / `shared seam` に分類する
3. AI が migration plan と patch 案を作る
4. 専用 branch で適用する
5. build / test / smoke / visual check を実行する
6. 人が差分と検証結果を確認して merge する

AI は patch 作成と検証補助までは担えるが、所有権が曖昧な差分や UX 判断は人が決める。

### 5. 安全装置を設ける

- template から service への反映は force sync ではなく、常に patch review ベースで行う
- service 固有の copy、秘密情報、ドメインロジック、暫定実験コードは自動削除しない
- rename / delete を伴う migration は、事前に rollback 手順を持つ
- docs、tests、showcase のいずれかで contract を確認できない変更は rollout しない
- AI が意図を説明できない差分は「止める」側に倒す

## 影響

- docs と tests は template の仕様書であるだけでなく、migration の安全柵にもなる
- template 側の generic 改善は、小さい migration unit に分割して持つほうが downstream に流しやすい
- 将来の `diff-check` / sync tooling は、sandbox -> template だけでなく template -> service の分類も扱う

## 非目標

- すべての service repo を常に完全同期すること
- service 固有のブランドや業務要件を template に吸い上げること
- AI による無承認の一括移行
