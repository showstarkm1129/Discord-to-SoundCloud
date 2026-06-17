# 手順書① Discord Developer Portal の準備（ユーザー作業）

> フェーズ1 Step 1。アカウント操作のため、ここはあなた自身が画面に従って操作してください。
> 所要時間: 約5〜10分。

---

## 1. アプリケーションを作成する

1. ブラウザで <https://discord.com/developers/applications> を開く
2. 右上の **「New Application」** をクリック
3. 名前を入力（例: `SoundCloud Status`）→ 規約に同意 → **「Create」**

> この名前が、Discordのプロフィールに **「〜をプレイ中」** の「〜」部分として表示されます。
> 例: アプリ名を `SoundCloud` にすると「SoundCloudをプレイ中」と出ます。

## 2. Client ID を取得する

1. 左メニューの **「General Information」** を開く
2. **「APPLICATION ID」**（= Client ID）の **Copy** を押してコピー
3. これを `bridge/config.json` の `discord.clientId` に貼り付ける（手順は[メインのREADME](../README.md)参照）

> APPLICATION ID は公開されても問題ない値です（パスワードではありません）。

## 3. Rich Presence 用アセット（画像）をアップロードする

再生中／一時停止のアイコンや、SoundCloudロゴを表示するために画像を登録します。

1. 左メニューの **「Rich Presence」 → 「Art Assets」** を開く
2. **「Add Image(s)」** をクリックして、以下の画像をアップロードする

| アセット名（Name）   | 用途                          | 推奨画像                         |
| -------------------- | ----------------------------- | -------------------------------- |
| `soundcloud_logo`    | 大きい画像（アートワーク無し時の代替） | SoundCloudロゴ等、512×512px以上 |
| `play`               | 小さいアイコン（再生中）       | 再生（▶）アイコン                |
| `pause`              | 小さいアイコン（一時停止中）   | 一時停止（⏸）アイコン            |

> **重要:** ここで入力する **Name（アセットキー）は上の表のとおり**にしてください。
> `config.json` の `discord.assets` の値と一致している必要があります（変更する場合は両方を合わせる）。
>
> - 画像は最低 512×512px 推奨。アップロード後、反映に **最大10分ほど**かかることがあります。
> - 曲のアートワークは拡張機能が自動取得してURLで表示するため、`soundcloud_logo` は
>   アートワークが取れなかったときの予備です（`useArtworkAsLargeImage: true` の場合）。

## 4. （任意）アイコン画像が手元にない場合

- 再生／一時停止アイコンはフリー素材（例: [Google Material Icons](https://fonts.google.com/icons) の
  `play_arrow` / `pause` をPNG書き出し）でOKです。
- SoundCloudロゴは公式ブランドアセットを利用してください。

---

## ✅ このステップの完了条件

- [ ] APPLICATION ID（Client ID）をコピーした
- [ ] `soundcloud_logo` / `play` / `pause` の3つのアセットをアップロードした

完了したら、Client ID を `bridge/config.json` に設定し、
[README](../README.md) の「フェーズ1 Step 2: RPC接続テスト」へ進んでください。
