# Discord-to-SoundCloud

SoundCloud で再生中の曲を **Discord の Rich Presence（現在再生中の表示）** に反映し、
再生履歴を **GitHub Pages** で公開するためのツール一式です。

```
SoundCloud (ブラウザ)
   └─ Chrome拡張 content script … 曲名/アーティスト/再生状態/アートワークを抽出
        └─ 拡張 background (WebSocket) ──▶ ローカルブリッジ (Node.js)
                                              ├─ discord-rpc ─▶ Discordプロフィール
                                              └─ GitHub Contents API ─▶ docs/data.json ─▶ GitHub Pages
```

## ディレクトリ構成

| パス            | 内容                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `bridge/`       | ローカルブリッジ（Discord RPC + WebSocketサーバー + GitHub連携）      |
| `extension/`    | Chrome拡張（Manifest V3）。SoundCloudから再生情報を抽出して中継       |
| `docs/`         | GitHub Pages 用の公開ページ（`index.html` / `app.js` / `data.json`）  |
| `docs-setup/`   | ユーザー作業の手順書（Discord Portal / GitHub）                      |

---

## 実装状況

**コードはすべて実装済みです。** 残るのはアカウント操作（ユーザー作業）と、
実機（Discordアプリ・実際のSoundCloudページ）での動作確認だけです。

### ✅ 実装済み（コード）

- [x] フェーズ1 Step 2: ブリッジの Discord RPC 接続（`bridge/src/discordClient.js`）＋単独テスト（`bridge/test/testRpc.js`）
- [x] フェーズ1 Step 3: 拡張機能（`extension/manifest.json` / `content.js`）。セレクタ抽出＋コンソール出力
- [x] フェーズ1 Step 4: WebSocket 連携（`bridge/src/wsServer.js` ↔ `extension/background.js`）
- [x] フェーズ1 Step 5: setActivity 更新、タイムスタンプ、一時停止アイコン切替、タブを閉じた際の clearActivity（`bridge/src/index.js`）
- [x] フェーズ2 Step 2: 公開ページ（`docs/`）＋ダミー `data.json`
- [x] フェーズ2 Step 3: GitHub Contents API 連携（`bridge/src/github.js`）＋単独テスト（`bridge/test/testGithub.js`）
- [x] フェーズ2 Step 4: 履歴追記・上限管理（`bridge/src/history.js`）
- [x] フェーズ2 Step 5: コミット間引き（`minCommitIntervalMs`）

### 👤 ユーザー作業（手順書あり）

- [ ] フェーズ1 Step 1: Discord アプリ作成・Client ID取得・アセット登録 → [`docs-setup/01-discord-portal.md`](docs-setup/01-discord-portal.md)
- [ ] フェーズ2 Step 1: リポジトリ・GitHub Pages 有効化・トークン発行 → [`docs-setup/02-github-pages.md`](docs-setup/02-github-pages.md)

---

## セットアップ手順

### 0. 前提

- Node.js 18 以上（推奨: 20/24）
- Discord **デスクトップアプリ**（RPCはデスクトップアプリ経由で動作します。ブラウザ版では不可）
- Google Chrome（または Chromium系）

### フェーズ1: SoundCloud → Discord RPC

#### Step 1（ユーザー作業）Discord Developer Portal

[`docs-setup/01-discord-portal.md`](docs-setup/01-discord-portal.md) に従い、
Client ID を取得し `soundcloud_logo` / `play` / `pause` アセットを登録します。

#### Step 2: ブリッジの設定とRPC接続テスト

```bash
cd bridge
npm install
cp config.example.json config.json   # Windows: copy config.example.json config.json
# config.json を編集し discord.clientId に取得した Client ID を貼り付け

# Discordデスクトップアプリを起動した状態で:
npm run test:rpc
```

→ 自分の Discord プロフィールにダミー曲「Test Track — ダミー曲」が表示されれば成功。
10秒後に一時停止アイコンへ切り替わります。`Ctrl+C` で終了（表示はクリアされます）。

#### Step 3: 拡張機能の読み込みとセレクタ確認

1. Chrome で `chrome://extensions` を開く
2. 右上の **「デベロッパーモード」** をON
3. **「パッケージ化されていない拡張機能を読み込む」** で `extension/` フォルダを選択
4. <https://soundcloud.com> を開いて任意の曲を再生
5. ページで **F12 → Console** を開くと `[SC→Discord] 検出: 曲名 / アーティスト ▶ 再生中` のように出力される

→ ここでセレクタが現在も有効か確認できます。出力されない場合は
   `extension/content.js` の `SELECTORS` を実際のDOMに合わせて調整してください。

#### Step 4 & 5: 統合（拡張 ↔ ブリッジ）

```bash
cd bridge
npm start
```

ブリッジを起動したまま SoundCloud で再生すると、background が WebSocket
（`ws://127.0.0.1:6472`）でブリッジへ中継し、Discord に「現在再生中」が表示されます。

- 曲を変えると経過時間（タイムスタンプ）がリセットされます
- 一時停止すると小アイコンが pause に切り替わります
- SoundCloud のタブを閉じる／別ページに移動すると Activity がクリアされます
- 拡張アイコンのポップアップで接続状態を確認できます

### フェーズ2: 履歴保存 + GitHub Pages 公開

#### Step 1（ユーザー作業）GitHub 準備

[`docs-setup/02-github-pages.md`](docs-setup/02-github-pages.md) に従い、
GitHub Pages を `main` / `/docs` で有効化し、Contents=Read and write のみの
Fine-grained トークンを発行します。

#### Step 2: 公開ページの確認

`docs/` には最初からダミーの `data.json` が入っています。Pages の公開URLで
「サンプル曲（ダミー）」と履歴が表示されれば、ページ側は正常です。

#### Step 3〜5: GitHub連携の有効化

`bridge/config.json` の `github` を設定（`enabled: true`, `token`, `owner`, `repo`）し、

```bash
cd bridge
npm run test:github   # docs/data.json が1回更新されれば成功
npm start             # 以降、曲が変わるたびに data.json を自動更新（間引きあり）
```

- 履歴は `history.maxItems`（既定100件）で上限管理
- コミット頻度は `github.minCommitIntervalMs`（既定60秒）で間引き
- 反映はキャッシュにより数十秒〜数分遅れることがあります

---

## 設定リファレンス（`bridge/config.json`）

| キー                          | 既定値          | 説明                                               |
| ----------------------------- | --------------- | -------------------------------------------------- |
| `discord.clientId`            | —               | Discord APPLICATION ID（必須）                     |
| `discord.assets.largeImageKey`| `soundcloud_logo` | アートワーク取得失敗時の大画像アセット名         |
| `discord.assets.useArtworkAsLargeImage` | `true` | trueなら曲のアートワークURLを大画像に使用       |
| `websocket.port`              | `6472`          | 拡張↔ブリッジのWebSocketポート（拡張側と一致必須） |
| `history.maxItems`            | `100`           | 履歴の最大保持件数                                 |
| `github.enabled`              | `false`         | GitHub連携の有効/無効                              |
| `github.minCommitIntervalMs`  | `60000`         | コミット間引き間隔（ms）                           |

> WebSocketポートを変えた場合は `extension/background.js` の `WS_PORT` も合わせてください。

## セキュリティ・プライバシー

- `config.json` / `history.json` は `.gitignore` 済み。トークンはコミットされません。
- WebSocketサーバーは `127.0.0.1`（ローカルホスト）のみで待ち受けます。
- GitHubトークンは対象リポジトリ・Contents書き込みのみの最小権限を推奨。
- 公開ページ（GitHub Pages）には再生中の曲名・アーティスト・履歴が公開されます。
  公開したくない情報がある場合は private リポジトリ＋別の公開手段を検討してください。

## トラブルシュート

| 症状                                   | 対処                                                            |
| -------------------------------------- | --------------------------------------------------------------- |
| RPCに繋がらない                        | Discordデスクトップアプリが起動しているか確認                    |
| 曲が検出されない                       | F12 Console を確認。`content.js` の `SELECTORS` を調整           |
| Discordに表示されない                  | `clientId` が正しいか、ブリッジ(`npm start`)が起動中か確認       |
| ポップアップが「未接続」               | `npm start` が起動中か、`WS_PORT` が一致しているか確認           |
| GitHubに反映されない                   | `npm run test:github` でエラー内容を確認。トークン権限を確認     |
