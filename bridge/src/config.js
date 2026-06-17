'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * config.json を読み込む。存在しなければ config.example.json を案内して終了する。
 * 環境変数による上書きにも対応:
 *   - DISCORD_CLIENT_ID
 *   - GITHUB_TOKEN
 */
function loadConfig() {
  const configPath = path.join(ROOT, 'config.json');
  const examplePath = path.join(ROOT, 'config.example.json');

  if (!fs.existsSync(configPath)) {
    console.error('[config] config.json が見つかりません。');
    console.error(`[config] ${examplePath} をコピーして config.json を作成し、`);
    console.error('[config] Discord の clientId などを設定してください。');
    process.exit(1);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('[config] config.json の JSON 解析に失敗しました:', err.message);
    process.exit(1);
  }

  // 環境変数による上書き（CI やトークンを設定ファイルに置きたくない場合用）
  if (process.env.DISCORD_CLIENT_ID) {
    raw.discord = raw.discord || {};
    raw.discord.clientId = process.env.DISCORD_CLIENT_ID;
  }
  if (process.env.GITHUB_TOKEN) {
    raw.github = raw.github || {};
    raw.github.token = process.env.GITHUB_TOKEN;
  }

  // 既定値で補完
  raw.websocket = Object.assign({ port: 6472 }, raw.websocket);
  raw.history = Object.assign(
    { enabled: true, maxItems: 100, file: 'history.json' },
    raw.history
  );
  raw.github = Object.assign(
    {
      enabled: false,
      branch: 'main',
      path: 'docs/data.json',
      minCommitIntervalMs: 60000,
    },
    raw.github
  );
  raw.discord = raw.discord || {};
  raw.discord.assets = Object.assign(
    {
      largeImageKey: 'soundcloud_logo',
      playSmallImageKey: 'play',
      pauseSmallImageKey: 'pause',
      useArtworkAsLargeImage: true,
    },
    raw.discord.assets
  );

  if (!raw.discord.clientId || raw.discord.clientId.startsWith('ここに')) {
    console.error('[config] discord.clientId が未設定です。config.json を編集してください。');
    process.exit(1);
  }

  return { config: raw, root: ROOT };
}

module.exports = { loadConfig, ROOT };
