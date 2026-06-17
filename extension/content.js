// content.js — SoundCloud のページ下部プレイヤーから再生情報を抽出する。
// Step 3 の要件どおり、まずコンソールにも出力する（デバッグしやすいように）。
// 抽出したデータは background.js へ送信し、background が WebSocket でローカルアプリへ中継する。

(() => {
  'use strict';

  const DEBUG = true; // false にするとコンソール出力を抑制
  const POLL_INTERVAL_MS = 2000;

  function log(...args) {
    if (DEBUG) console.log('%c[SC→Discord]', 'color:#ff5500;font-weight:bold', ...args);
  }

  // --- セレクタ（複数候補でフォールバック） ---
  const SELECTORS = {
    titleLink: [
      '.playbackSoundBadge__titleLink',
      '.playControls__soundBadge a.sc-link-light',
    ],
    artistLink: [
      '.playbackSoundBadge__lightLink',
      '.playbackSoundBadge a.sc-link-light',
    ],
    artwork: [
      '.playbackSoundBadge span.sc-artwork',
      '.playControls__soundBadge span.sc-artwork',
      '.playbackSoundBadge__avatar span',
    ],
    playButton: ['.playControls__play', '.playControl'],
    timePassed: ['.playbackTimeline__timePassed'],
    duration: ['.playbackTimeline__duration'],
  };

  function pick(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function extractArtwork() {
    const el = pick(SELECTORS.artwork);
    if (!el) return null;
    const bg = el.style && el.style.backgroundImage;
    if (bg) {
      const m = bg.match(/url\(["']?(.*?)["']?\)/);
      if (m) {
        // 小さいサムネを大きいサイズに（あれば）
        return m[1].replace('t50x50', 't500x500').replace('t120x120', 't500x500');
      }
    }
    return null;
  }

  function extractPlaying() {
    const btn = pick(SELECTORS.playButton);
    if (!btn) return false;
    // 再生中はボタンに 'playing' クラスが付く
    if (btn.classList.contains('playing')) return true;
    // フォールバック: aria-label / title で判定
    const label = (btn.getAttribute('title') || btn.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('pause')) return true; // 「Pause」ボタン表示中＝再生中
    if (label.includes('play')) return false;
    return false;
  }

  // "1:23" や "1:02:03" を秒に変換する
  function parseClock(text) {
    if (!text) return null;
    const matches = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g);
    if (!matches || !matches.length) return null;
    const parts = matches[matches.length - 1].split(':').map(Number);
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  function extractTiming() {
    const passEl = pick(SELECTORS.timePassed);
    const durEl = pick(SELECTORS.duration);
    return {
      position: passEl ? parseClock(passEl.textContent) : null,
      duration: durEl ? parseClock(durEl.textContent) : null,
    };
  }

  function extract() {
    const titleEl = pick(SELECTORS.titleLink);
    if (!titleEl) return null; // プレイヤー未表示（まだ何も再生していない）

    const title =
      (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
    if (!title) return null;

    const artistEl = pick(SELECTORS.artistLink);
    const artist = artistEl ? (artistEl.getAttribute('title') || artistEl.textContent || '').trim() : '';

    let url = titleEl.getAttribute('href') || '';
    if (url && url.startsWith('/')) url = location.origin + url;

    const timing = extractTiming();

    return {
      type: 'now_playing',
      title,
      artist,
      artwork: extractArtwork(),
      url,
      isPlaying: extractPlaying(),
      position: timing.position, // 現在の再生位置（秒）
      duration: timing.duration, // 曲の長さ（秒）
      timestamp: Date.now(),
    };
  }

  // --- 変化検出して送信 ---
  let lastSignature = null;

  function signature(data) {
    if (!data) return 'none';
    return `${data.title}|${data.artist}|${data.isPlaying}`;
  }

  function tick() {
    let data;
    try {
      data = extract();
    } catch (err) {
      log('抽出エラー:', err);
      return;
    }

    const sig = signature(data);
    if (sig === lastSignature) return; // 変化なし
    lastSignature = sig;

    if (!data) {
      log('再生情報なし（プレイヤー未表示）');
      send({ type: 'idle' });
      return;
    }

    log('検出:', data.title, '/', data.artist, data.isPlaying ? '▶ 再生中' : '⏸ 一時停止');
    log('  アートワーク:', data.artwork);
    log('  URL:', data.url);
    send(data);
  }

  function send(message) {
    try {
      chrome.runtime.sendMessage(message, () => {
        // background 未起動などでの lastError は握りつぶす
        void chrome.runtime.lastError;
      });
    } catch (err) {
      log('送信失敗:', err.message);
    }
  }

  // ページ離脱時に idle を通知（タブを閉じた／別ページへ遷移）
  window.addEventListener('pagehide', () => send({ type: 'idle' }));

  // 定期ポーリング（SoundCloud は SPA なので DOM 監視＋ポーリングの併用が確実）
  setInterval(tick, POLL_INTERVAL_MS);

  // DOM 変化でも即時チェック
  const observer = new MutationObserver(() => tick());
  const startObserve = () => {
    const badge = document.querySelector('.playControls') || document.body;
    observer.observe(badge, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'title', 'style', 'href'] });
  };

  log('content script を読み込みました。再生を開始すると情報を検出します。');
  startObserve();
  tick();
})();
