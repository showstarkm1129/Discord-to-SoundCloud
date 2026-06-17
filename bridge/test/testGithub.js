'use strict';

/**
 * フェーズ2 Step 3 の単独検証スクリプト。
 * config.json の github 設定を使い、テスト用の data.json を1回コミットする。
 *
 * 使い方:
 *   1. bridge/config.json の github を設定（enabled: true, token, owner, repo）
 *   2. npm run test:github
 *   → 対象リポジトリの docs/data.json が更新されれば成功
 */

const { loadConfig } = require('../src/config');
const { GitHubPublisher } = require('../src/github');

async function main() {
  const { config } = loadConfig();

  if (!config.github.enabled) {
    console.error('[test] config.json の github.enabled を true にしてください。');
    process.exit(1);
  }

  const github = new GitHubPublisher(config);
  if (!github.enabled) {
    console.error('[test] GitHub 設定が不完全です（token/owner/repo を確認）。');
    process.exit(1);
  }

  const sample = {
    nowPlaying: {
      title: 'GitHub連携テスト',
      artist: 'soundcloud-bridge',
      artwork: null,
      url: 'https://soundcloud.com/discover',
      isPlaying: true,
      startedAt: new Date().toISOString(),
    },
    history: [
      {
        title: 'GitHub連携テスト',
        artist: 'soundcloud-bridge',
        artwork: null,
        url: 'https://soundcloud.com/discover',
        playedAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  console.log('[test] data.json をコミットします…');
  // テストでは即時に1回だけ反映したいので内部の _flush を直接呼ぶ
  github.minIntervalMs = 0;
  github.publish(JSON.stringify(sample, null, 2));

  // publish は非同期で flush するため少し待つ
  await wait(8000);
  console.log('[test] 完了。GitHub 上の docs/data.json を確認してください。');
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('[test] エラー:', err);
  process.exit(1);
});
