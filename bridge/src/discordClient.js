'use strict';

const RPC = require('discord-rpc');

/**
 * Discord クライアント（デスクトップアプリ）への RPC 接続を管理する薄いラッパー。
 * - 接続/再接続
 * - 再生情報から Activity を組み立てて setActivity
 * - clearActivity
 */
class DiscordPresence {
  constructor(config) {
    this.config = config;
    this.clientId = config.discord.clientId;
    this.assets = config.discord.assets;
    this.client = null;
    this.ready = false;
    this._reconnectTimer = null;
    this._lastActivity = null;
  }

  async connect() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (_) {
        /* ignore */
      }
    }

    this.client = new RPC.Client({ transport: 'ipc' });

    this.client.on('ready', () => {
      this.ready = true;
      const user = this.client.user;
      console.log(
        `[discord] 接続しました${user ? `（${user.username}）` : ''}。clientId=${this.clientId}`
      );
      // 接続前に積まれていた Activity があれば反映
      if (this._lastActivity) {
        this._apply(this._lastActivity).catch(() => {});
      }
    });

    this.client.on('disconnected', () => {
      this.ready = false;
      console.warn('[discord] 切断されました。再接続を試みます…');
      this._scheduleReconnect();
    });

    try {
      await this.client.login({ clientId: this.clientId });
    } catch (err) {
      this.ready = false;
      console.warn(
        '[discord] 接続に失敗しました（Discordデスクトップアプリは起動していますか？）:',
        err.message
      );
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect().catch(() => {});
    }, 5000);
  }

  /**
   * 再生情報 track を Discord Activity に変換して送信する。
   * track: { title, artist, artwork, url, isPlaying, startTimestamp }
   */
  async setNowPlaying(track) {
    const a = this.assets;

    const largeImageKey =
      a.useArtworkAsLargeImage && track.artwork ? track.artwork : a.largeImageKey;

    const activity = {
      details: truncate(track.title || 'Unknown track', 128),
      state: truncate(track.artist || 'SoundCloud', 128),
      largeImageKey,
      largeImageText: truncate(track.title || 'SoundCloud', 128),
      smallImageKey: track.isPlaying ? a.playSmallImageKey : a.pauseSmallImageKey,
      smallImageText: track.isPlaying ? 'Playing' : 'Paused',
      instance: false,
    };

    // 再生中のみ経過時間を表示する。
    // 実際の再生位置(position)と曲尺(duration)があれば、本物のプログレスバーにする。
    // 一時停止中はタイムスタンプを一切付けない＝時間が進まない。
    if (track.isPlaying) {
      const now = Date.now();
      if (Number.isFinite(track.position)) {
        const start = now - track.position * 1000;
        activity.startTimestamp = Math.floor(start / 1000) * 1000;
        if (Number.isFinite(track.duration) && track.duration > track.position) {
          activity.endTimestamp =
            Math.floor((start + track.duration * 1000) / 1000) * 1000;
        }
      } else if (track.startTimestamp) {
        // 位置が取れない場合のフォールバック（検出時からの経過）
        activity.startTimestamp = Math.floor(track.startTimestamp / 1000) * 1000;
      }
    }

    // クリックで飛べるボタン（Discordの仕様上、リンクにできるのはボタンのみ）
    if (track.url && /^https?:\/\//.test(track.url)) {
      activity.buttons = [{ label: '▶ SoundCloudで聴く', url: track.url }];
    }

    this._lastActivity = activity;
    if (!this.ready) {
      // 未接続なら接続後に _apply される
      return;
    }
    await this._apply(activity);
  }

  async _apply(activity) {
    try {
      await this.client.setActivity(activity);
    } catch (err) {
      console.warn('[discord] setActivity に失敗:', err.message);
    }
  }

  async clear() {
    this._lastActivity = null;
    if (!this.ready || !this.client) return;
    try {
      await this.client.clearActivity();
      console.log('[discord] Activity をクリアしました。');
    } catch (err) {
      console.warn('[discord] clearActivity に失敗:', err.message);
    }
  }

  async destroy() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

function truncate(str, max) {
  if (typeof str !== 'string') return str;
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

module.exports = { DiscordPresence };
