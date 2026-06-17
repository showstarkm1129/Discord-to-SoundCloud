// background.js (MV3 service worker)
// content.js から受け取った再生情報を、ローカルブリッジへ WebSocket で中継する。
// SoundCloud タブが閉じられた／再生が止まった場合は clear を送る。

const WS_PORT = 6472; // bridge/config.json の websocket.port と合わせる
const WS_URL = `ws://127.0.0.1:${WS_PORT}`;
const RECONNECT_MS = 5000;

let socket = null;
let connected = false;
let reconnectTimer = null;
let ownerTabId = null; // 現在再生情報を送っているタブ

// --- WebSocket 管理 ---
function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  try {
    socket = new WebSocket(WS_URL);
  } catch (err) {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    connected = true;
    console.log('[bg] ブリッジに接続しました:', WS_URL);
    setBadge('on');
  };

  socket.onclose = () => {
    connected = false;
    setBadge('off');
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose も呼ばれるのでここでは再接続予約のみ
    connected = false;
  };

  socket.onmessage = () => {
    // ブリッジからの応答は今は使用しない
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_MS);
}

function sendToBridge(obj) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(obj));
    } catch (err) {
      console.warn('[bg] 送信失敗:', err.message);
    }
  } else {
    connect();
  }
}

function setBadge(state) {
  try {
    if (state === 'on') {
      chrome.action.setBadgeText({ text: '●' });
      chrome.action.setBadgeBackgroundColor({ color: '#1db954' });
    } else {
      chrome.action.setBadgeText({ text: '○' });
      chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    }
  } catch (_) {
    /* action 未対応時は無視 */
  }
}

// --- content script からのメッセージ ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;

  if (msg.type === 'now_playing') {
    ownerTabId = tabId;
    sendToBridge(msg);
  } else if (msg.type === 'idle') {
    // このタブが再生主だったなら clear
    if (tabId === ownerTabId) {
      ownerTabId = null;
      sendToBridge({ type: 'clear' });
    }
  } else if (msg.type === 'getStatus') {
    sendResponse({ connected, ownerTabId });
    return true;
  }
});

// --- タブが閉じられたら clear ---
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === ownerTabId) {
    ownerTabId = null;
    sendToBridge({ type: 'clear' });
  }
});

// --- service worker のキープアライブ（MV3 は数十秒でスリープするため） ---
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    if (!connected) connect();
    else sendToBridge({ type: 'ping' });
  }
});

chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(connect);

connect();
