# YouTube Shorts Auto Controller

簡単な概要

- YouTube の Shorts（/shorts/）の視聴回数と視聴時間を制限し、画面右下に残り時間／回数をオーバーレイ表示します。
- ホーム（`/`）に戻るとカウントがリセットされます。
- ストレージ更新はバックグラウンドスクリプト経由で行い、拡張コンテキストの無効化による例外を回避するための安全処理が入っています。

インストール（開発者モード）

1. Chrome/Brave を開く。
2. `chrome://extensions/` を開く。
3. 右上の「デベロッパーモード」を ON にする。
4. 「パッケージ化されていない拡張機能を読み込む」から、このフォルダ（`shorts-controller`）を選択する。

使い方 / テスト手順

1. 拡張を読み込んだら YouTube を開く（https://www.youtube.com/）。
2. Shorts（例: https://www.youtube.com/shorts/xxxxx）を数本視聴し、右下のオーバーレイで `Shorts X/Y` と残り時間が増えることを確認する。
3. YouTube のホーム（https://www.youtube.com/）に移動すると、`shortsCount` と `watchSeconds` が 0 にリセットされる。

主な仕様

- 制限値は `content.js` の `DEFAULTS` で設定（`maxShortsCount`, `maxWatchSeconds`）。
- 制限超過時はコンテントからメッセージを送り、`background.js` がタブをホームに戻します（`LIMIT_REACHED`）。
- ストレージ書き込みは `safeStorageSet()` で行い、まず `chrome.runtime.sendMessage({type:'STORE_SET', data})` を送ってバックグラウンドで `chrome.storage.local.set` を実行させます。送信失敗時はフォールバックで直接 `chrome.storage.local.set` を試みます。

トラブルシューティング

- コンソールに `Extension context invalidated` や `safeSendMessage` / `safeStorageSet` の警告が出る場合は、拡張を一度リロードしてください（`chrome://extensions/` -> リロード）。
- 動作しない場合は DevTools のコンソール出力をコピーして教えてください（エラーメッセージ全文とスタックトレース）。
- `manifest.json` に `storage` と `tabs` の権限が必要です（既に設定済み）。

今後の改善案（任意）

- 設定 UI を追加して `maxShortsCount` / `maxWatchSeconds` を変更可能にする。
- リセット対象ページ（ホーム以外）の追加オプション（サブスクライブや履歴など）。
- すべてのストレージアクセスをバックグラウンド経由に統一して、さらに堅牢化。

ファイル

- `content.js` - コンテントスクリプト（主要ロジック）
- `background.js` - SERVICE_WORKER（ストレージ更新受け取り、LIMIT_REACHED でホームへ遷移）
- `manifest.json` - 拡張定義

作業メモ

- ホームに戻ったらリセットする仕様へ変更済み。
- `safeStorageSet` / `safeSendMessage` を導入して拡張コンテキスト無効化時の例外を抑制しています。

質問や追加の希望（例えば設定 UI やリセット対象の拡張）を教えてください。
