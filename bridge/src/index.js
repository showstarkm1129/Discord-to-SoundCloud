'use strict';

const { loadConfig } = require('./config');
const { DiscordPresence } = require('./discordClient');
const { BridgeWebSocketServer } = require('./wsServer');
const { HistoryStore } = require('./history');
const { GitHubPublisher } = require('./github');

async function main() {
  const { config, root } = loadConfig();

  console.log('=== SoundCloud → Discord Bridge ===');

  const discord = new DiscordPresence(config);
  const history = config.history.enabled ? new HistoryStore(config, root) : null;
  const github = new GitHubPublisher(config);
  const ws = new BridgeWebSocketServer(config.websocket.port);

  await discord.connect();
  ws.start();

  // 同一曲の連続更新で startTimestamp が動かないよう、曲ごとの開始時刻を保持
  let currentKey = null;
  let currentStart = null;
  // タブを閉じた／一時停止のまま放置された場合に自動クリアするためのタイマー
  let idleTimer = null;

  const ARTWORK_IDLE_CLEAR_MS = 5 * 60 * 1000; // 一時停止のまま5分でクリア

  function resetIdleTimer(active) {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (!active) {
      idleTimer = setTimeout(() => {
        console.log('[bridge] 一定時間更新がないため Activity をクリアします。');
        doClear();
      }, ARTWORK_IDLE_CLEAR_MS);
    }
  }

  function trackKey(t) {
    return `${t.title}|||${t.artist}`;
  }

  async function doClear() {
    currentKey = null;
    currentStart = null;
    await discord.clear();
    if (history) {
      history.clearNowPlaying();
      if (github.enabled) github.publish(history.serialize());
    }
  }

  ws.on('track', async (msg) => {
    if (!msg.title) return;

    const key = trackKey(msg);
    if (key !== currentKey) {
      // 曲が変わった → 開始時刻を更新
      currentKey = key;
      currentStart = Date.now();
    }

    const track = {
      title: msg.title,
      artist: msg.artist || '',
      artwork: msg.artwork || null,
      url: msg.url || null,
      isPlaying: msg.isPlaying !== false,
      position: Number.isFinite(msg.position) ? msg.position : null,
      duration: Number.isFinite(msg.duration) ? msg.duration : null,
      startTimestamp: currentStart,
    };

    await discord.setNowPlaying(track);

    if (history) {
      history.setNowPlaying(track);
      if (github.enabled) github.publish(history.serialize());
    }

    // 再生中は idle クリアを止める。一時停止中は idle タイマーを動かす。
    resetIdleTimer(track.isPlaying);
  });

  ws.on('clear', async () => {
    console.log('[bridge] clear を受信。');
    await doClear();
  });

  ws.on('disconnected', async () => {
    // 拡張機能（ブラウザ）が落ちた。少し待って再接続が無ければクリア。
    resetIdleTimer(false);
  });

  // 終了処理
  const shutdown = async () => {
    console.log('\n[bridge] 終了します…');
    try {
      await discord.clear();
      await discord.destroy();
      ws.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[bridge] 準備完了。SoundCloud のタブで再生を開始してください。');
}

main().catch((err) => {
  console.error('[bridge] 致命的エラー:', err);
  process.exit(1);
});
