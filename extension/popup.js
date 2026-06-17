// popup.js — ブリッジとの接続状態を表示する。
chrome.runtime.sendMessage({ type: 'getStatus' }, (res) => {
  const dot = document.getElementById('dot');
  const status = document.getElementById('status');
  const hint = document.getElementById('hint');

  if (chrome.runtime.lastError || !res) {
    status.textContent = '不明';
    hint.textContent = 'background が応答しません。拡張機能を再読み込みしてください。';
    return;
  }

  if (res.connected) {
    dot.classList.add('on');
    status.textContent = 'ブリッジに接続中';
    hint.textContent = res.ownerTabId
      ? 'SoundCloud の再生情報を送信しています。'
      : 'SoundCloud のタブで再生を開始してください。';
  } else {
    status.textContent = 'ブリッジ未接続';
    hint.textContent =
      'ローカルブリッジ（npm start）が起動しているか確認してください。ws://127.0.0.1:6472';
  }
});
