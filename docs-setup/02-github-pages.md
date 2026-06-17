# 手順書② GitHub リポジトリ・Pages・トークンの準備（ユーザー作業）

> フェーズ2 Step 1。アカウント・トークン発行はあなた自身の操作が必要です。
> 所要時間: 約10分。

---

## 1. リポジトリを用意する

すでにこのプロジェクトを置いているリポジトリをそのまま使えます。
新規に作る場合は <https://github.com/new> から作成してください（Public/Privateどちらでも可。
ただし **GitHub Pages を無料で使うなら Public 推奨**）。

このリポジトリには公開ページ用の `docs/` フォルダが含まれています。

## 2. GitHub Pages を有効化する

1. リポジトリの **「Settings」 → 左メニュー「Pages」** を開く
2. **「Build and deployment」** の **Source** で **「Deploy from a branch」** を選択
3. **Branch** を `main`、フォルダを **`/docs`** に設定して **Save**
4. 数十秒〜数分後、ページ上部に公開URLが表示される
   （例: `https://<ユーザー名>.github.io/<リポジトリ名>/`）

> 公開URLにアクセスして、ダミーの `docs/data.json` の内容（「サンプル曲（ダミー）」）が
> 表示されれば成功です。表示はキャッシュの影響で **数十秒〜数分遅れる**ことがあります。

## 3. Personal Access Token を発行する（最小権限）

ローカルアプリが `docs/data.json` を更新（コミット）するために使います。

### 推奨: Fine-grained personal access token（対象リポジトリ限定）

1. <https://github.com/settings/personal-access-tokens/new> を開く
2. **Token name**: 任意（例: `soundcloud-bridge`）
3. **Expiration**: 任意（90日など）
4. **Repository access**: **「Only select repositories」** → このリポジトリだけを選択
5. **Permissions** → **Repository permissions** → **「Contents」** を **「Read and write」** に設定
   （他の権限は付けないでください）
6. **「Generate token」** をクリックし、表示されたトークンを **コピー**
   （この画面を閉じると二度と表示されません）

> **セキュリティ重要:**
>
> - トークンは `bridge/config.json` の `github.token` に設定します。
> - `bridge/config.json` は `.gitignore` 済みで **リポジトリにコミットされません**。
>   絶対にトークンをコミット・共有しないでください。
> - 万一漏洩した場合は GitHub の設定画面からそのトークンを **Revoke（失効）** してください。

## 4. config.json の github 設定

`bridge/config.json` の `github` を次のように設定します（例）:

```json
"github": {
  "enabled": true,
  "token": "github_pat_xxxxxxxx...",
  "owner": "あなたのGitHubユーザー名",
  "repo": "リポジトリ名",
  "branch": "main",
  "path": "docs/data.json",
  "minCommitIntervalMs": 60000
}
```

設定後、接続テスト:

```bash
cd bridge
npm run test:github
```

→ リポジトリの `docs/data.json` が「GitHub連携テスト」の内容に更新されれば成功です。

---

## ✅ このステップの完了条件

- [ ] GitHub Pages を `main` / `/docs` で有効化し、公開URLでダミーページが表示された
- [ ] Contents: Read and write のみの Fine-grained トークンを発行した
- [ ] `bridge/config.json` の `github` を設定し、`npm run test:github` が成功した

完了したら [README](../README.md) の「フェーズ2 Step 4: 統合」へ進んでください。
