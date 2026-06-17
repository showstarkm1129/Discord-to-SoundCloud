'use strict';

/**
 * フェーズ1 Step 2 の単独検証スクリプト。
 * 固定のダミー曲データで Discord の Rich Presence を表示する。
 *
 * 使い方:
 *   1. Discord デスクトップアプリを起動しておく
 *   2. bridge/config.json に discord.clientId を設定
 *   3. npm run test:rpc
 *   → 自分の Discord プロフィールに「再生中」が表示されれば成功
 *   Ctrl+C で終了（Activity はクリアされる）
 */

const { loadConfig } = require('../src/config');
const { DiscordPresence } = require('../src/discordClient');

async function main() {
  const { config } = loadConfig();
  const discord = new DiscordPresence(config);

  await discord.connect();

  // 接続が確立するまで少し待つ
  await wait(2000);

  const dummy = {
    title: 'Test Track — ダミー曲',
    artist: 'Test Artist',
    artwork: 'https://i1.sndcdn.com/artworks-000000000000-000000-t500x500.jpg',
    url: 'https://soundcloud.com/discover',
    isPlaying: true,
    startTimestamp: Date.now(),
  };

  console.log('[test] ダミーの Activity を送信します:', dummy.title);
  await discord.setNowPlaying(dummy);
  console.log('[test] Discord のプロフィールを確認してください。');
  console.log('[test] 10秒後に「一時停止」状態へ切り替えます…');

  await wait(10000);
  dummy.isPlaying = false;
  await discord.setNowPlaying(dummy);
  console.log('[test] 一時停止状態に切り替えました（小アイコンが pause になります）。');
  console.log('[test] Ctrl+C で終了します。');

  process.on('SIGINT', async () => {
    await discord.clear();
    await discord.destroy();
    process.exit(0);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('[test] エラー:', err);
  process.exit(1);
});
