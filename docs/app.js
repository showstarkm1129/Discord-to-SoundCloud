// app.js — data.json を読み込み「現在再生中」と「履歴一覧」を描画する。
// GitHub Pages のキャッシュ対策としてクエリにタイムスタンプを付けて取得し、定期的に更新する。

const REFRESH_MS = 30000; // 30秒ごとに再取得

async function loadData() {
  try {
    const res = await fetch(`data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
  } catch (err) {
    renderError(err);
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function artworkHtml(url, cls, placeholderChar) {
  if (url) {
    return `<img class="${cls}" src="${escapeHtml(url)}" alt="" loading="lazy"
      onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} placeholder',textContent:'♪'}))" />`;
  }
  return `<div class="${cls} placeholder">${placeholderChar}</div>`;
}

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  return `${day}日前`;
}

function render(data) {
  renderNowPlaying(data.nowPlaying);
  renderHistory(data.history || []);

  const updated = document.getElementById('updated-at');
  if (updated) {
    updated.textContent = data.updatedAt
      ? `最終更新: ${relativeTime(data.updatedAt)}`
      : '';
  }
}

function renderNowPlaying(np) {
  const card = document.getElementById('np-card');
  if (!np || !np.title) {
    card.innerHTML = '<div class="np-empty">いまは何も再生していません</div>';
    return;
  }

  const titleInner = np.url
    ? `<a href="${escapeHtml(np.url)}" target="_blank" rel="noopener">${escapeHtml(np.title)}</a>`
    : escapeHtml(np.title);

  const statusCls = np.isPlaying ? '' : 'paused';
  const statusText = np.isPlaying ? '再生中' : '一時停止';

  card.innerHTML = `
    ${artworkHtml(np.artwork, 'np-art', '♪')}
    <div class="np-info">
      <div class="np-status ${statusCls}"><span class="pulse"></span>${statusText}</div>
      <p class="np-title">${titleInner}</p>
      <p class="np-artist">${escapeHtml(np.artist || '')}</p>
    </div>
  `;
}

function renderHistory(history) {
  const list = document.getElementById('history-list');
  if (!history.length) {
    list.innerHTML = '<li class="np-empty">履歴はまだありません</li>';
    return;
  }

  list.innerHTML = history
    .map((item) => {
      const titleInner = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>`
        : escapeHtml(item.title);
      return `
        <li class="history-item">
          ${artworkHtml(item.artwork, 'hi-art', '♪')}
          <div class="hi-main">
            <div class="hi-title">${titleInner}</div>
            <div class="hi-artist">${escapeHtml(item.artist || '')}</div>
          </div>
          <div class="hi-time">${relativeTime(item.playedAt)}</div>
        </li>
      `;
    })
    .join('');
}

function renderError(err) {
  const card = document.getElementById('np-card');
  card.innerHTML = `<div class="np-empty">data.json を読み込めませんでした<br><small>${escapeHtml(
    err.message
  )}</small></div>`;
}

loadData();
setInterval(loadData, REFRESH_MS);
