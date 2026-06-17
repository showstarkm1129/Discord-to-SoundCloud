'use strict';

const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');

/**
 * 拡張機能の background script から接続される WebSocket サーバー。
 * 受信メッセージ（JSON）を 'track' / 'clear' イベントとして発火する。
 *
 * 受信メッセージ形式の例:
 *   { "type": "now_playing", "title": "...", "artist": "...",
 *     "artwork": "https://...", "url": "https://...", "isPlaying": true }
 *   { "type": "clear" }
 */
class BridgeWebSocketServer extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.wss = null;
  }

  start() {
    // localhost のみ受け付ける（外部からの接続を防ぐ）
    this.wss = new WebSocketServer({ port: this.port, host: '127.0.0.1' });

    this.wss.on('listening', () => {
      console.log(`[ws] WebSocket サーバーを起動しました: ws://127.0.0.1:${this.port}`);
    });

    this.wss.on('connection', (socket, req) => {
      console.log(`[ws] 拡張機能が接続しました（${req.socket.remoteAddress}）`);
      socket.on('message', (data) => this._onMessage(data));
      socket.on('close', () => {
        console.log('[ws] 拡張機能の接続が切れました。');
        // 接続が切れた＝ブラウザ/タブが閉じられた可能性が高いのでクリア
        this.emit('disconnected');
      });
      socket.on('error', (err) => {
        console.warn('[ws] ソケットエラー:', err.message);
      });
    });

    this.wss.on('error', (err) => {
      console.error('[ws] サーバーエラー:', err.message);
    });
  }

  _onMessage(data) {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.warn('[ws] 不正なJSONを受信:', err.message);
      return;
    }

    if (msg.type === 'clear') {
      this.emit('clear');
      return;
    }

    if (msg.type === 'now_playing' || msg.type === 'track') {
      this.emit('track', msg);
      return;
    }

    if (msg.type === 'ping') {
      return; // ハートビートは無視
    }

    console.warn('[ws] 未知のメッセージ種別:', msg.type);
  }

  close() {
    if (this.wss) this.wss.close();
  }
}

module.exports = { BridgeWebSocketServer };
