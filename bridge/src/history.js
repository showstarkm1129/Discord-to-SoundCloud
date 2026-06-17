'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 再生履歴と「現在再生中」を管理し、GitHub Pages 用の data.json と同じ形を保持する。
 *
 * 保存形式（data.json）:
 *   {
 *     "nowPlaying": { title, artist, artwork, url, isPlaying, startedAt } | null,
 *     "history": [ { title, artist, artwork, url, playedAt }, ... ],
 *     "updatedAt": "ISO8601"
 *   }
 */
class HistoryStore {
  constructor(config, root) {
    this.maxItems = config.history.maxItems || 100;
    this.filePath = path.isAbsolute(config.history.file)
      ? config.history.file
      : path.join(root, config.history.file);
    this.data = { nowPlaying: null, history: [], updatedAt: null };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        this.data.history = Array.isArray(parsed.history) ? parsed.history : [];
        this.data.nowPlaying = parsed.nowPlaying || null;
      }
    } catch (err) {
      console.warn('[history] 既存履歴の読み込みに失敗（新規作成します）:', err.message);
    }
  }

  /** 現在再生中をセット。曲が変わっていれば true を返す。 */
  setNowPlaying(track) {
    const prev = this.data.nowPlaying;
    const changed = !prev || prev.title !== track.title || prev.artist !== track.artist;

    this.data.nowPlaying = {
      title: track.title,
      artist: track.artist,
      artwork: track.artwork || null,
      url: track.url || null,
      isPlaying: !!track.isPlaying,
      startedAt: track.startTimestamp ? new Date(track.startTimestamp).toISOString() : null,
    };

    if (changed && track.title) {
      this._pushHistory(track);
    }
    this.data.updatedAt = new Date().toISOString();
    this._save();
    return changed;
  }

  _pushHistory(track) {
    // 直近と同一なら重複追加しない
    const last = this.data.history[0];
    if (last && last.title === track.title && last.artist === track.artist) return;

    this.data.history.unshift({
      title: track.title,
      artist: track.artist,
      artwork: track.artwork || null,
      url: track.url || null,
      playedAt: new Date().toISOString(),
    });

    if (this.data.history.length > this.maxItems) {
      this.data.history.length = this.maxItems;
    }
  }

  clearNowPlaying() {
    this.data.nowPlaying = null;
    this.data.updatedAt = new Date().toISOString();
    this._save();
  }

  toJSON() {
    return this.data;
  }

  serialize() {
    return JSON.stringify(this.data, null, 2);
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, this.serialize(), 'utf8');
    } catch (err) {
      console.warn('[history] 保存に失敗:', err.message);
    }
  }
}

module.exports = { HistoryStore };
