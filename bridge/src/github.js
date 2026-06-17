'use strict';

/**
 * GitHub Contents API を使って data.json を取得→更新（コミット）する。
 * Node 24 のグローバル fetch を使用（追加依存なし）。
 *
 * 仕様上の注意:
 *   - 更新には対象ファイルの現在の sha が必要。初回は取得して 404 なら新規作成。
 *   - コミット頻度を抑えるため minCommitIntervalMs でデバウンスする。
 */
class GitHubPublisher {
  constructor(config) {
    const g = config.github;
    this.enabled = !!g.enabled;
    this.token = g.token;
    this.owner = g.owner;
    this.repo = g.repo;
    this.branch = g.branch || 'main';
    this.path = g.path || 'docs/data.json';
    this.commitName = g.commitName || 'soundcloud-bridge';
    this.commitEmail = g.commitEmail || 'bot@example.com';
    this.minIntervalMs = g.minCommitIntervalMs || 60000;

    this._sha = null;
    this._lastCommitAt = 0;
    this._pending = null;
    this._timer = null;

    if (this.enabled) {
      if (!this.token || this.token.startsWith('ここに')) {
        console.warn('[github] token が未設定のため GitHub 連携を無効化します。');
        this.enabled = false;
      }
      if (!this.owner || !this.repo) {
        console.warn('[github] owner/repo が未設定のため GitHub 連携を無効化します。');
        this.enabled = false;
      }
    }
  }

  get _apiBase() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}`;
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'soundcloud-discord-bridge',
    };
  }

  /**
   * content（文字列）をコミット予約する。間引き間隔内なら遅延実行にまとめる。
   */
  publish(content) {
    if (!this.enabled) return;
    this._pending = content;

    const now = Date.now();
    const elapsed = now - this._lastCommitAt;

    if (elapsed >= this.minIntervalMs) {
      this._flush();
    } else if (!this._timer) {
      const wait = this.minIntervalMs - elapsed;
      this._timer = setTimeout(() => {
        this._timer = null;
        this._flush();
      }, wait);
    }
  }

  async _flush() {
    if (!this._pending) return;
    const content = this._pending;
    this._pending = null;
    this._lastCommitAt = Date.now();

    try {
      if (this._sha === null) {
        await this._fetchSha();
      }
      await this._put(content);
    } catch (err) {
      console.warn('[github] data.json の更新に失敗:', err.message);
      // 次回 sha を取り直す
      this._sha = null;
    }
  }

  async _fetchSha() {
    const url = `${this._apiBase}?ref=${encodeURIComponent(this.branch)}`;
    const res = await fetch(url, { headers: this._headers() });
    if (res.status === 200) {
      const json = await res.json();
      this._sha = json.sha;
    } else if (res.status === 404) {
      this._sha = undefined; // 新規作成（sha なし）
    } else {
      throw new Error(`sha 取得失敗: HTTP ${res.status} ${await safeText(res)}`);
    }
  }

  async _put(content) {
    const body = {
      message: `chore: update now playing (${new Date().toISOString()})`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: this.branch,
      committer: { name: this.commitName, email: this.commitEmail },
    };
    if (this._sha) body.sha = this._sha;

    const res = await fetch(this._apiBase, {
      method: 'PUT',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 200 || res.status === 201) {
      const json = await res.json();
      this._sha = json.content && json.content.sha;
      console.log('[github] data.json を更新しました。');
    } else if (res.status === 409 || res.status === 422) {
      // sha 競合 → 取り直して次回再試行
      this._sha = null;
      throw new Error(`コミット競合: HTTP ${res.status}`);
    } else {
      throw new Error(`HTTP ${res.status} ${await safeText(res)}`);
    }
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch (_) {
    return '';
  }
}

module.exports = { GitHubPublisher };
