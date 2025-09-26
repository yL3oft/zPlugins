/* script.js — fixes + added:
   - Fuse.js fuzzy search & typo-tolerance
   - Autocomplete suggestions with keyboard navigation and TAB-complete
   - Compare menu in release modal: "Compare with previous release" and "Compare with other tag" (input)
*/

/* ------------------ Basic elements & initial state ------------------ */
const toggleBtn = document.getElementById('toggleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const banner = document.getElementById('banner');
const searchBox = document.getElementById('searchBox');
const container = document.getElementById('projectsContainer');

const suggestionsEl = document.getElementById('searchSuggestions');

const releaseModal = document.getElementById('releaseModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const releaseBody = document.getElementById('releaseBody');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
// Restored copy button
const modalCopy = document.getElementById('modalCopy');

// Modal state
let modalReleases = [];
let modalReleaseIndex = 0;
let modalCurrentRepo = null;

// Tooltip element (reused)
let tooltipEl = null;
let tooltipRemovalTimer = null;

// Contrib / platform popover state
let currentContribPopover = null;
let currentPlatformPopover = null;

/* ------------------ Search / Fuse state ------------------ */
let fuse = null;
let searchItems = []; // { folder, name, description, index }
let selectedSuggestionIndex = -1;

/* ------------------ Caching helpers (unchanged) ------------------ */
const CACHE_PREFIX = 'zplugins:cache:';
function setCached(key, value, ttlSeconds) {
    try {
        const payload = { ts: Date.now(), ttl: ttlSeconds * 1000, v: value };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
    } catch (e) { console.warn('Could not write cache', e); }
}
function getCached(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || !payload.ts) return null;
        if (Date.now() - payload.ts > (payload.ttl || 0)) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return payload.v;
    } catch (e) { console.warn('Could not read cache', e); return null; }
}
function getCachedMeta(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || !payload.ts) return null;
        if (Date.now() - payload.ts > (payload.ttl || 0)) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return payload;
    } catch (e) { return null; }
}
function clearAllZPluginsCache() {
    try {
        const keys = Object.keys(localStorage);
        for (let k of keys) if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    } catch (e) { console.warn('Could not clear cache', e); }
}

/* TTLs */
const TTL = {
    GH_STATS: 60 * 60,
    GH_RELEASES: 6 * 60 * 60,
    GH_CONTRIB: 60 * 60,
    GH_COMMITS: 6 * 60 * 60,
    MODRINTH: 6 * 60 * 60,
    SPIGET: 6 * 60 * 60,
    HANGAR: 6 * 60 * 60,
    GH_LICENSE: 24 * 60 * 60,
    GH_STARS_SERIES: 24 * 60 * 60,
    GH_COMPARE: 60 * 60
};

/* ------------------ Utilities ------------------ */
function showTooltip(target, html) {
    hideTooltip();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'stat-tooltip';
    tooltipEl.innerHTML = html;
    document.body.appendChild(tooltipEl);
    const r = target.getBoundingClientRect();
    const ttRect = tooltipEl.getBoundingClientRect();
    let top = r.top - ttRect.height - 8;
    let left = r.left + (r.width / 2) - (ttRect.width / 2);
    if (top < 8) top = r.bottom + 8;
    if (left < 8) left = 8;
    if (left + ttRect.width > window.innerWidth - 8) left = window.innerWidth - ttRect.width - 8;
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    requestAnimationFrame(() => tooltipEl.classList.add('visible'));
}
function hideTooltip() {
    if (!tooltipEl) return;
    const elToRemove = tooltipEl;
    elToRemove.classList.remove('visible');
    if (tooltipRemovalTimer) {
        clearTimeout(tooltipRemovalTimer);
        tooltipRemovalTimer = null;
    }
    const cleanup = () => {
        try {
            if (elToRemove && elToRemove.parentNode) elToRemove.parentNode.removeChild(elToRemove);
        } catch (e) { /* ignore */ }
        if (tooltipEl === elToRemove) tooltipEl = null;
    };
    elToRemove.addEventListener('transitionend', cleanup, { once: true });
    tooltipRemovalTimer = setTimeout(() => {
        cleanup();
        tooltipRemovalTimer = null;
    }, 420);
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
async function safeFetchJson(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (res.status === 403) {
            const resetRaw = res.headers ? (res.headers.get('x-ratelimit-reset') || res.headers.get('x-rate-limit-reset')) : null;
            const remaining = res.headers ? res.headers.get('x-ratelimit-remaining') || res.headers.get('x-rate-limit-remaining') : null;
            const reset = resetRaw ? parseInt(resetRaw, 10) : null;
            return { ok: false, status: 403, reason: 'rate_limit', reset, remaining };
        }
        if (!res.ok) {
            return { ok: false, status: res.status, reason: 'http' };
        }
        const j = await res.json();
        return { ok: true, status: res.status, data: j, headers: res.headers };
    } catch (err) {
        return { ok: false, reason: 'network', error: err };
    }
}

/* ------------------ GitHub helpers ------------------ */
function parseGitHubRepo(url) {
    try {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        const m = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/i);
        if (m) return { owner: m[1], repo: m[2].replace(/\/$/, '') };
    } catch (e) {}
    return null;
}

async function fetchGitHubStats(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return { stars: null, forks: null };
    const cacheKey = `gh:stats:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { stars: null, forks: null, __error: 'rate_limit', __reset: res.reset || null };
            const ttl = res.reset ? Math.max(30, Math.min(3600, Math.ceil((res.reset * 1000 - Date.now()) / 1000))) : 60;
            setCached(cacheKey, obj, ttl);
            return obj;
        } else {
            const obj = { stars: null, forks: null, __error: res.reason || 'unknown' };
            setCached(cacheKey, obj, 30);
            return obj;
        }
    }
    const data = res.data;
    const result = {
        stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
        forks: typeof data.forks_count === 'number' ? data.forks_count : null
    };
    setCached(cacheKey, result, TTL.GH_STATS);
    return result;
}

async function fetchGitHubLicense(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:license:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/license`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { __error: 'rate_limit', __reset: res.reset || null };
            setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset * 1000 - Date.now())/1000)) : 60);
            return obj;
        } else {
            const obj = { __error: res.reason || 'http' };
            setCached(cacheKey, obj, 60);
            return obj;
        }
    }
    const data = res.data;
    const licenseName = (data && data.license && (data.license.spdx_id || data.license.name)) ? (data.license.spdx_id || data.license.name) : (data.name || null);
    if (licenseName) setCached(cacheKey, licenseName, TTL.GH_LICENSE);
    return licenseName;
}

/* Fetch releases list with assets — fixed asset url fallback to browser_download_url || url */
async function fetchReleasesList(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:releases:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=100`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { __error: 'rate_limit', __reset: res.reset || null };
            setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset * 1000 - Date.now())/1000)) : 60);
            return obj;
        } else {
            const obj = { __error: res.reason || 'http', status: res.status || null };
            setCached(cacheKey, obj, 60);
            return obj;
        }
    }
    const list = res.data;
    if (!Array.isArray(list)) return null;
    const slim = list.map(r => ({
        id: r.id,
        tag_name: r.tag_name,
        name: r.name,
        published_at: r.published_at,
        body: r.body || '',
        draft: !!r.draft,
        prerelease: !!r.prerelease,
        assets: Array.isArray(r.assets) ? r.assets.map(a => ({
            id: a.id,
            name: a.name,
            // Fallback: use browser_download_url first, then url (API self-link)
            url: a.browser_download_url || a.url || null,
            size: a.size,
            downloads: typeof a.download_count === 'number' ? a.download_count : null
        })) : []
    }));
    setCached(cacheKey, slim, TTL.GH_RELEASES);
    return slim;
}

/* New helper: fetch latest release object (rate-friendly — uses releases cache when possible) */
async function fetchLatestReleaseObject(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    // Prefer cached releases (cheaper)
    const cacheKey = `gh:releases:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && Array.isArray(cached) && cached.length) {
        return cached[0];
    }
    // Try /releases/latest endpoint (may 404 if no releases)
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`);
    if (res.ok && res.data) return res.data;
    // Fallback to the full list (which will populate cache)
    const list = await fetchReleasesList(githubUrl);
    if (list && Array.isArray(list) && list.length) return list[0];
    return null;
}

/* other helpers (modrinth/spiget/hangar, contributors, commit activity) kept as before */
async function fetchModrinthDownloadsById(modrinthId) {
    if (!modrinthId) return null;
    const cacheKey = `modrinth:downloads:${modrinthId}`;
    const cached = getCached(cacheKey);
    if (cached !== null && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.modrinth.com/v2/project/${encodeURIComponent(modrinthId)}`);
    if (!res.ok) {
        const obj = { __error: res.reason || 'error' };
        setCached(cacheKey, obj, 60);
        return null;
    }
    const data = res.data;
    const downloads = typeof data.downloads === 'number' ? data.downloads : (data.downloadCount || null);
    if (typeof downloads === 'number') setCached(cacheKey, downloads, TTL.MODRINTH);
    return downloads;
}
function parseSpigotResourceId(url) {
    try {
        if (!url) return null;
        let m = url.match(/resources\/(?:[^\/]+?\.)?(\d+)(?:\/|$)/i);
        if (m) return m[1];
        m = url.match(/resources\/(\d+)(?:\/|$)/i);
        if (m) return m[1];
    } catch (e) {}
    return null;
}
async function fetchSpigetDownloads(resourceId) {
    if (!resourceId) return null;
    const cacheKey = `spiget:downloads:${resourceId}`;
    const cached = getCached(cacheKey);
    if (cached !== null && !(cached && cached.__error)) return cached;
    try {
        const res = await safeFetchJson(`https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/stats`);
        if (!res.ok) {
            const res2 = await safeFetchJson(`https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/downloads`);
            if (!res2.ok) {
                setCached(cacheKey, { __error: res.reason || 'error' }, 60);
                return null;
            }
            const maybeNum = res2.data;
            const numeric = typeof maybeNum === 'number' ? maybeNum : null;
            if (numeric !== null) setCached(cacheKey, numeric, TTL.SPIGET);
            return numeric;
        }
        const data = res.data;
        const downloads = (data && (data.downloads || data.downloadAmount || null));
        if (typeof downloads === 'number') setCached(cacheKey, downloads, TTL.SPIGET);
        return downloads;
    } catch (err) { console.warn('fetchSpigetDownloads error', err); setCached(cacheKey, { __error: 'network' }, 30); return null; }
}
function parseHangarOwnerSlug(url) {
    try {
        if (!url) return null;
        let m = url.match(/hangar(?:\.[^\/]+)?\/project\/([^\/]+)\/([^\/\/#?]+)/i);
        if (m) return { owner: m[1], slug: m[2] };
        m = url.match(/hangar(?:\.[^\/]+)?\/projects\/([^\/]+)\/([^\/\/#?]+)/i);
        if (m) return { owner: m[1], slug: m[2] };
    } catch (e) {}
    return null;
}
async function fetchHangarDownloads(owner, slug) {
    if (!owner || !slug) return null;
    const cacheKey = `hangar:downloads:${owner}/${slug}`;
    const cached = getCached(cacheKey);
    if (cached !== null && !(cached && cached.__error)) return cached;
    const tries = [
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/statistics`,
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/stats`
    ];
    for (const endpoint of tries) {
        try {
            const res = await safeFetchJson(endpoint);
            if (!res.ok) continue;
            const data = res.data;
            let downloads = null;
            if (typeof data.downloads === 'number') downloads = data.downloads;
            if (!downloads && data.statistics && typeof data.statistics.downloads === 'number') downloads = data.statistics.downloads;
            if (!downloads && typeof data.total_downloads === 'number') downloads = data.total_downloads;
            if (downloads !== null) { setCached(cacheKey, downloads, TTL.HANGAR); return downloads; }
            if (Array.isArray(data.versions)) {
                let sum = 0; let found = false;
                for (const v of data.versions) {
                    if (typeof v.downloads === 'number') { sum += v.downloads; found = true; }
                }
                if (found) { setCached(cacheKey, sum, TTL.HANGAR); return sum; }
            }
        } catch (err) { /* try next */ }
    }
    setCached(cacheKey, { __error: 'not_found' }, 60);
    return null;
}

/* ------------------ Contributors & commit activity ------------------ */
async function fetchContributors(githubUrl, limit = 10) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:contributors:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contributors?per_page=${limit}`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { __error: 'rate_limit', __reset: res.reset || null };
            setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset * 1000 - Date.now())/1000)) : 60);
            return obj;
        } else {
            const obj = { __error: res.reason || 'http', status: res.status || null };
            setCached(cacheKey, obj, 60);
            return obj;
        }
    }
    const data = res.data;
    if (!Array.isArray(data)) return null;
    const mapped = data.slice(0, limit).map(u => ({
        login: u.login,
        avatar: u.avatar_url,
        html_url: u.html_url,
        contributions: u.contributions
    }));
    setCached(cacheKey, mapped, TTL.GH_CONTRIB);
    return mapped;
}
async function fetchCommitActivity(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:commit_activity:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;
    const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/stats/commit_activity`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            setCached(cacheKey, { __error: 'rate_limit', __reset: res.reset || null }, 60);
            return { __error: 'rate_limit' };
        } else {
            setCached(cacheKey, { __error: 'http' }, 60);
            return { __error: 'http' };
        }
    }
    const data = res.data;
    if (!Array.isArray(data)) return null;
    setCached(cacheKey, data, TTL.GH_COMMITS);
    return data;
}
async function computeActivityFromCommits(githubUrl, weeks = 12) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    try {
        const res = await safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=100`);
        if (!res.ok) return null;
        const commits = res.data;
        if (!Array.isArray(commits)) return null;
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const counts = new Array(weeks).fill(0);
        for (const c of commits) {
            const dateStr = c && c.commit && (c.commit.author && c.commit.author.date || c.commit.committer && c.commit.committer.date);
            if (!dateStr) continue;
            const dt = new Date(dateStr).getTime();
            const deltaWeeks = Math.floor((now - dt) / weekMs);
            if (deltaWeeks >= 0 && deltaWeeks < weeks) {
                counts[weeks - 1 - deltaWeeks] += 1;
            }
        }
        return counts;
    } catch (e) {
        console.warn('computeActivityFromCommits error', e);
        return null;
    }
}

/* ------------------ Small UI helpers ------------------ */
function buildSparkline(values, width = 120, height = 28, color = '#4ea3ff') {
    if (!values || !values.length) return '';
    const max = Math.max(...values) || 1;
    const step = (values.length === 1) ? width : width / (values.length - 1);
    let path = '';
    values.forEach((v, i) => {
        const x = i * step;
        const y = height - (v / max) * (height - 4) - 2;
        path += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline" aria-hidden="true">
        <path d="${path.trim()}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    </svg>`;
}
function formatBytes(n) {
    if (n === null || typeof n === 'undefined') return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    if (n < 1024*1024*1024) return `${(n/(1024*1024)).toFixed(1)} MB`;
    return `${(n/(1024*1024*1024)).toFixed(2)} GB`;
}
function createStatusSpan(parent) {
    const span = document.createElement('span');
    span.className = 'fetch-status';
    span.innerHTML = `<span class="spinner" aria-hidden="true"></span><span class="msg">loading…</span>`;
    parent.appendChild(span);
    return span;
}
function setStatusLoading(span, text = 'loading…') {
    if (!span) return;
    span.className = 'fetch-status';
    span.innerHTML = `<span class="spinner" aria-hidden="true"></span><span class="msg">${escapeHtml(text)}</span>`;
}
function setStatusError(span, text = 'failed', retryCb) {
    if (!span) return;
    span.className = 'fetch-status error';
    span.innerHTML = `<span class="msg">${escapeHtml(text)}</span>`;
    if (retryCb) {
        const btn = document.createElement('button');
        btn.className = 'fetch-retry';
        btn.textContent = 'Retry';
        btn.addEventListener('click', retryCb);
        span.appendChild(btn);
    }
}
function setStatusRateLimited(span, resetTs, retryCb) {
    if (!span) return;
    span.className = 'fetch-status rate';
    let msg = 'rate limited';
    if (resetTs) {
        const when = new Date(resetTs * 1000);
        msg = `rate limited — reset ${when.toLocaleTimeString()}`;
    }
    span.innerHTML = `<span class="msg">${escapeHtml(msg)}</span>`;
    if (retryCb) {
        const btn = document.createElement('button');
        btn.className = 'fetch-retry';
        btn.textContent = 'Retry';
        btn.addEventListener('click', retryCb);
        span.appendChild(btn);
    }
}

/* time-ago helper for the info tooltip */
function timeAgo(tsMs) {
    if (!tsMs) return 'never';
    const now = Date.now();
    const diff = Math.max(0, now - tsMs);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

/* ------------------ Stars series & compare (kept) ------------------ */
async function fetchStargazerSeries(githubUrl, months = 6) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:stars_series:${repo.owner}/${repo.repo}:${months}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;

    const endpoint = `https://api.github.com/repos/${repo.owner}/${repo.repo}/stargazers?per_page=100`;
    const res = await safeFetchJson(endpoint, { headers: { Accept: 'application/vnd.github.v3.star+json' } });
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { __error: 'rate_limit', __reset: res.reset || null };
            setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset * 1000 - Date.now())/1000)) : 60);
            return obj;
        } else {
            setCached(cacheKey, { __error: res.reason || 'http' }, 60);
            return null;
        }
    }
    const data = res.data;
    if (!Array.isArray(data)) return null;

    const now = new Date();
    const buckets = [];
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push(d);
    }
    const counts = new Array(months).fill(0);
    for (const entry of data) {
        const t = entry.starred_at || (entry && entry.starred_at);
        if (!t) continue;
        const dt = new Date(t);
        for (let i = 0; i < buckets.length; i++) {
            const start = buckets[i];
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
            if (dt >= start && dt < end) {
                counts[i]++;
                break;
            }
        }
    }
    setCached(cacheKey, counts, TTL.GH_STARS_SERIES);
    return counts;
}
async function fetchReleaseCompare(githubRepo, baseTag, headTag) {
    if (!githubRepo || !baseTag || !headTag) return null;
    const cacheKey = `gh:compare:${githubRepo}:${baseTag}...${headTag}`;
    const cached = getCached(cacheKey);
    if (cached && !(cached && cached.__error)) return cached;

    const res = await safeFetchJson(`https://api.github.com/repos/${githubRepo}/compare/${encodeURIComponent(baseTag)}...${encodeURIComponent(headTag)}`);
    if (!res.ok) {
        if (res.reason === 'rate_limit') {
            const obj = { __error: 'rate_limit', __reset: res.reset || null };
            setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset * 1000 - Date.now())/1000)) : 60);
            return obj;
        } else {
            const obj = { __error: 'http', status: res.status || null };
            setCached(cacheKey, obj, 60);
            return obj;
        }
    }
    const data = res.data;
    const files = Array.isArray(data.files) ? data.files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch || null
    })) : [];
    const out = { files, ahead_by: data.ahead_by || 0, behind_by: data.behind_by || 0 };
    setCached(cacheKey, out, TTL.GH_COMPARE);
    return out;
}

/* ------------------ Render a single project card ------------------ */
function renderProject(folderName, info, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.position = 'relative';
    const inner = document.createElement('div');
    inner.className = 'card-inner';
    if (document.body.classList.contains('light')) inner.classList.add('light-mode');

    const isOnDev = info && (info.on_dev === true || info['on_dev'] === true);

    // Logo
    const img = document.createElement('img');
    img.className = 'card-logo';
    img.alt = `${info.name || folderName} logo`;
    const darkCandidates = [
        `${folderName}/sources/darkmode/logo.svg`,
        `${folderName}/sources/darkmode/logo.png`
    ];
    const lightCandidates = [
        `${folderName}/sources/lightmode/logo.svg`,
        `${folderName}/sources/lightmode/logo.png`
    ];
    img.dataset.darkOptions = JSON.stringify(darkCandidates);
    img.dataset.lightOptions = JSON.stringify(lightCandidates);
    const initialOpts = document.body.classList.contains('light') ? lightCandidates : darkCandidates;
    setElementSrcFromOptions(img, initialOpts);
    inner.appendChild(img);

    // Title + version + license pill
    const titleRow = document.createElement('h3');
    const titleText = document.createElement('span');
    titleText.className = 'project-name';
    titleText.textContent = info.name || folderName;
    titleRow.appendChild(titleText);

    const rightGroup = document.createElement('span');
    rightGroup.style.display = 'inline-flex';
    rightGroup.style.alignItems = 'center';
    rightGroup.style.gap = '6px';

    const versionBadge = document.createElement('span');
    versionBadge.className = 'version badge-link';
    versionBadge.dataset.version = '';
    if (isOnDev) {
        versionBadge.textContent = 'On development';
        versionBadge.classList.add('dev-badge');
        versionBadge.dataset.version = '';
        versionBadge.title = 'This project is in active development';
    } else {
        // loading placeholder; we'll populate tag proactively below
        versionBadge.textContent = 'loading...';
        versionBadge.title = 'Release version';
    }
    rightGroup.appendChild(versionBadge);

    const licensePill = document.createElement('span');
    licensePill.className = 'license-pill';
    licensePill.style.display = 'none';
    licensePill.setAttribute('aria-hidden', 'true');
    rightGroup.appendChild(licensePill);

    titleRow.appendChild(rightGroup);
    inner.appendChild(titleRow);

    // Stats row
    const hasModrinthKey = (typeof info['modrinth-id'] !== 'undefined' && info['modrinth-id'] !== null && info['modrinth-id'] !== '') || (typeof info.modrinth !== 'undefined' && info.modrinth !== null && info.modrinth !== '');
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';

    const starsSpan = document.createElement('span');
    starsSpan.className = 'stat github-stars';
    starsSpan.title = 'Stars';
    starsSpan.innerHTML = `<img src="sources/global/star.svg" alt="Stars" class="stat-icon"> <span class="stat-value">—</span>`;
    statsRow.appendChild(starsSpan);

    const forksSpan = document.createElement('span');
    forksSpan.className = 'stat github-forks';
    forksSpan.title = 'Forks';
    forksSpan.innerHTML = `<img src="sources/global/fork.svg" alt="Forks" class="stat-icon"> <span class="stat-value">—</span>`;
    statsRow.appendChild(forksSpan);

    let downloadsSpan = null;
    if (hasModrinthKey) {
        downloadsSpan = document.createElement('span');
        downloadsSpan.className = 'stat modrinth-downloads';
        downloadsSpan.title = 'Downloads (aggregated)';
        downloadsSpan.innerHTML = `<img src="sources/global/download.svg" alt="Downloads" class="stat-icon"> <span class="stat-value">—</span>`;
        statsRow.appendChild(downloadsSpan);
    }

    inner.appendChild(statsRow);

    // Description
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = info.description || '';
    inner.appendChild(desc);

    // subtle dot (info)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'check-info';
    infoBtn.type = 'button';
    infoBtn.setAttribute('aria-label', 'Last checked info');
    infoBtn.innerHTML = `<span class="dot" aria-hidden="true"></span>`;
    // Tooltip behavior for the info dot — show last-checked times
    function showInfoTooltip() {
        const ghTs = infoBtn.dataset.ghChecked ? parseInt(infoBtn.dataset.ghChecked, 10) : null;
        const dlTs = infoBtn.dataset.dlChecked ? parseInt(infoBtn.dataset.dlChecked, 10) : null;
        const ghStr = ghTs ? `GH stats: ${timeAgo(ghTs)}` : 'GH stats: not checked';
        const dlStr = dlTs ? `Downloads: ${timeAgo(dlTs)}` : 'Downloads: not checked';
        showTooltip(infoBtn, `<div style="font-weight:700">Last checked</div><div style="margin-top:6px">${escapeHtml(ghStr)}<br>${escapeHtml(dlStr)}</div>`);
    }
    infoBtn.addEventListener('mouseenter', showInfoTooltip);
    infoBtn.addEventListener('focus', showInfoTooltip);
    infoBtn.addEventListener('mouseleave', hideTooltip);
    infoBtn.addEventListener('blur', hideTooltip);

    inner.appendChild(infoBtn);

    // Buttons container
    const btns = document.createElement('div');
    btns.className = 'btns';

    const ON_DEV_CLICKABLE = new Set(['github', 'jenkins', 'javadocs', 'wiki']);

    function addBtn(href, label, opts = {}) {
        if (!href) return;

        const isGhost = opts.ghost !== false;
        const btnType = opts.btnClass || (label.toLowerCase().includes('javadoc') ? 'javadocs' : label.toLowerCase());
        const isAllowedWhileDev = ON_DEV_CLICKABLE.has(btnType);

        if (isOnDev && !isAllowedWhileDev) {
            const a = document.createElement('a');
            a.className = 'btn' + (isGhost ? ' ghost' : ' primary');
            a.classList.add('dev-disabled');
            if (opts.btnClass) a.classList.add(opts.btnClass);

            a.setAttribute('aria-disabled', 'true');
            a.setAttribute('role', 'button');
            a.tabIndex = 0;
            a.title = `${label} (disabled while project is in development)`;

            if (opts.iconSrc) {
                const iconImg = document.createElement('img');
                iconImg.className = 'btn-icon';
                if (opts.iconClass) iconImg.classList.add(opts.iconClass);
                iconImg.src = opts.iconSrc;
                iconImg.alt = `${label} icon`;
                a.appendChild(iconImg);
            } else if (opts.iconText) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'btn-icon-text';
                iconSpan.textContent = opts.iconText;
                a.appendChild(iconSpan);
            }

            const span = document.createElement('span');
            span.textContent = label;
            a.appendChild(span);

            const tooltipHtml = `<div><strong>${label}</strong></div><div>Disabled while project is in active development.</div>`;
            a.addEventListener('mouseenter', () => showTooltip(a, tooltipHtml));
            a.addEventListener('mouseleave', hideTooltip);
            a.addEventListener('focus', () => showTooltip(a, tooltipHtml));
            a.addEventListener('blur', hideTooltip);
            a.addEventListener('click', (e) => {
                e.preventDefault();
                showTooltip(a, tooltipHtml);
                setTimeout(hideTooltip, 1800);
            });
            a.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showTooltip(a, tooltipHtml);
                    setTimeout(hideTooltip, 1800);
                }
            });

            btns.appendChild(a);
            return;
        }

        const a = document.createElement('a');
        a.className = 'btn' + (isGhost ? ' ghost' : ' primary');
        if (opts.btnClass) a.classList.add(opts.btnClass);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.title = label;
        if (opts.iconSrc) {
            const iconImg = document.createElement('img');
            iconImg.className = 'btn-icon';
            if (opts.iconClass) iconImg.classList.add(opts.iconClass);
            iconImg.src = opts.iconSrc;
            iconImg.alt = `${label} icon`;
            a.appendChild(iconImg);
        } else if (opts.iconText) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'btn-icon-text';
            iconSpan.textContent = opts.iconText;
            a.appendChild(iconSpan);
        }
        const span = document.createElement('span');
        span.textContent = label;
        a.appendChild(span);
        btns.appendChild(a);
    }

    addBtn(info.modrinth, 'Modrinth', { iconSrc: 'sources/global/modrinth.svg', btnClass: 'modrinth' });
    addBtn(info.spigot, 'Spigot', { iconSrc: 'sources/global/spigot.png', btnClass: 'spigot' });
    addBtn(info.hangar, 'Hangar', { iconSrc: 'sources/global/hangar.svg', btnClass: 'hangar' });
    addBtn(info.wiki, 'Wiki', { iconSrc: 'sources/global/wiki.svg', btnClass: 'wiki' });
    addBtn(info.url, 'GitHub', { iconSrc: 'sources/global/github.svg', btnClass: 'github' });
    addBtn(info.jenkins, 'Jenkins', { iconSrc: 'sources/global/jenkins.svg', btnClass: 'jenkins' });
    if (info['bstats-id']) {
        const id = info['bstats-id'];
        if (id !== "" && id !== null) {
            const nameSlug = info.name ? encodeURIComponent(info.name) : encodeURIComponent(folderName);
            const bstatsLink = `https://bstats.org/plugin/bukkit/${nameSlug}/${id}`;
            addBtn(bstatsLink, 'bStats', { iconSrc: 'sources/global/bstats.png', btnClass: 'bstats' });
        }
    }
    const javadocUrl = `${folderName}/javadocs/`;
    addBtn(javadocUrl, 'Javadocs', { iconText: '📚', btnClass: 'javadocs' });

    inner.appendChild(btns);
    card.appendChild(inner);
    container.appendChild(card);

    // platform toggle
    if (Array.isArray(info.platforms) && info.platforms.length > 0) {
        const platformToggle = document.createElement('button');
        platformToggle.className = 'platform-toggle';
        platformToggle.title = 'Show platform compatibility';
        platformToggle.type = 'button';
        platformToggle.setAttribute('aria-expanded', 'false');
        platformToggle.innerHTML = `<img class="platform-icon" src="sources/global/compatibility.svg" alt="Compatibility" />`;
        card.appendChild(platformToggle);
        platformToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = platformToggle.getAttribute('aria-expanded') === 'true';
            if (expanded) hidePlatformPopover();
            else showPlatformPopover(platformToggle, info.platforms, { name: info.name || folderName });
        });
    }

    // contrib toggle
    const contribToggle = document.createElement('button');
    contribToggle.className = 'contrib-toggle';
    contribToggle.title = 'Show contributors & activity';
    contribToggle.type = 'button';
    contribToggle.setAttribute('aria-expanded', 'false');
    contribToggle.innerHTML = `<span class="contrib-icon" aria-hidden="true">👥</span>`;
    card.appendChild(contribToggle);

    setTimeout(() => card.classList.add('show'), index * 120);

    // Version + license + GH stats
    // Ensure the version badge is filled proactively (load from cache or call lightweight endpoint)
    if (!isOnDev && info.url) {
        (async () => {
            const repo = parseGitHubRepo(info.url);
            if (!repo) {
                versionBadge.textContent = 'n/a';
                return;
            }

            // Prefer cached releases (avoids extra API calls)
            const cachedReleases = getCached(`gh:releases:${repo.owner}/${repo.repo}`);
            if (cachedReleases && Array.isArray(cachedReleases) && cachedReleases.length) {
                const v = cachedReleases[0].tag_name || cachedReleases[0].name || null;
                versionBadge.textContent = v ? `v${v.replace(/^v/i, '')}` : 'n/a';
                if (v) versionBadge.dataset.version = v;
                return;
            }

            // Try the /releases/latest endpoint or fallback to list (this will populate cache).
            try {
                const latest = await fetchLatestReleaseObject(info.url);
                const v = latest ? (latest.tag_name || latest.name || null) : null;
                versionBadge.textContent = v ? `v${v.replace(/^v/i, '')}` : 'n/a';
                if (v) versionBadge.dataset.version = v;
            } catch (err) {
                console.warn('Could not load latest release for', info.url, err);
                versionBadge.textContent = 'n/a';
            }
        })();
    } else if (!info.url && !isOnDev) versionBadge.textContent = '—';

    // fetch and show license
    if (info.url) {
        (async () => {
            const lic = await fetchGitHubLicense(info.url);
            if (lic && typeof lic === 'string') {
                licensePill.style.display = 'inline-block';
                licensePill.textContent = lic;
                licensePill.title = `License: ${lic}`;
            } else if (lic && lic.__error === 'rate_limit') {
                licensePill.style.display = 'inline-block';
                licensePill.textContent = 'license?';
                licensePill.title = 'License lookup rate limited';
            }
        })();
    }

    // GH stats
    const ghStatusSpan = createStatusSpan(statsRow);
    async function loadGHStats() {
        setStatusLoading(ghStatusSpan, 'loading GH stats…');
        if (!info.url) {
            setStatusError(ghStatusSpan, 'no repo');
            return;
        }
        try {
            const repo = parseGitHubRepo(info.url);
            if (!repo) {
                setStatusError(ghStatusSpan, 'invalid repo');
                return;
            }
            const cacheKey = `gh:stats:${repo.owner}/${repo.repo}`;
            const result = await fetchGitHubStats(info.url);
            if (result && result.__error === 'rate_limit') {
                setStatusRateLimited(ghStatusSpan, result.__reset, () => loadGHStats());
                const starsSpanVal = statsRow.querySelector('.github-stars .stat-value');
                const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
                if (starsSpanVal) starsSpanVal.textContent = '—';
                if (forksSpanVal) forksSpanVal.textContent = '—';
                const cachedMeta = getCachedMeta(cacheKey);
                if (cachedMeta && cachedMeta.ts) infoBtn.dataset.ghChecked = cachedMeta.ts;
                return;
            } else if (result && result.__error) {
                setStatusError(ghStatusSpan, 'failed', () => loadGHStats());
                const starsSpanVal = statsRow.querySelector('.github-stars .stat-value');
                const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
                if (starsSpanVal) starsSpanVal.textContent = '—';
                if (forksSpanVal) forksSpanVal.textContent = '—';
                return;
            }
            const starsSpanVal = statsRow.querySelector('.github-stars .stat-value');
            const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
            if (starsSpanVal) starsSpanVal.textContent = (typeof result.stars === 'number') ? result.stars.toLocaleString() : '—';
            if (forksSpanVal) forksSpanVal.textContent = (typeof result.forks === 'number') ? result.forks.toLocaleString() : '—';
            ghStatusSpan.parentNode && ghStatusSpan.parentNode.removeChild(ghStatusSpan);
            const cachedMeta = getCachedMeta(cacheKey);
            if (cachedMeta && cachedMeta.ts) infoBtn.dataset.ghChecked = cachedMeta.ts;
            else infoBtn.dataset.ghChecked = Date.now();

            // stars tooltip with series
            starsSpan.dataset.repo = `${repo.owner}/${repo.repo}`;
            starsSpan.addEventListener('mouseenter', async () => {
                const repoStr = starsSpan.dataset.repo;
                showTooltip(starsSpan, `<div>Loading stars timeline…</div>`);
                const series = await fetchStargazerSeries(`https://github.com/${repoStr}`, 6).catch(() => null);
                if (!series) {
                    hideTooltip();
                    showTooltip(starsSpan, `<div>Stars: ${escapeHtml((result.stars || '—').toString())}</div><div style="opacity:0.8;font-size:12px">Timeline unavailable</div>`);
                    setTimeout(hideTooltip, 2600);
                    return;
                }
                const spark = buildSparkline(series, 200, 36, '#ffd89b');
                hideTooltip();
                showTooltip(starsSpan, `<div style="font-weight:700">Stars — recent months</div><div style="margin-top:6px">${spark}</div>`);
            });
            starsSpan.addEventListener('mouseleave', hideTooltip);

        } catch (err) {
            console.warn('Error retrieving GH stats for', info.url, err);
            setStatusError(ghStatusSpan, 'error', () => loadGHStats());
        }
    }
    loadGHStats();

    // Downloads aggregation + tooltip
    if (hasModrinthKey && downloadsSpan) {
        const dlStatusSpan = createStatusSpan(statsRow);
        async function loadDownloads() {
            setStatusLoading(dlStatusSpan, 'loading downloads…');
            let total = 0;
            let anyFound = false;
            const breakdown = { modrinth: null, spigot: null, hangar: null };

            const modId = info['modrinth-id'] || info.modrinth;
            const modDownloads = await fetchModrinthDownloadsById(modId);
            if (typeof modDownloads === 'number') { breakdown.modrinth = modDownloads; total += modDownloads; anyFound = true; }

            if (info.spigot) {
                const spigotId = parseSpigotResourceId(info.spigot);
                if (spigotId) {
                    const spigotDownloads = await fetchSpigetDownloads(spigotId);
                    if (typeof spigotDownloads === 'number') { breakdown.spigot = spigotDownloads; total += spigotDownloads; anyFound = true; }
                }
            }

            if (info.hangar) {
                const hs = parseHangarOwnerSlug(info.hangar);
                if (hs && hs.owner && hs.slug) {
                    const hangarDownloads = await fetchHangarDownloads(hs.owner, hs.slug);
                    if (typeof hangarDownloads === 'number') { breakdown.hangar = hangarDownloads; total += hangarDownloads; anyFound = true; }
                }
            }

            const dSpan = downloadsSpan.querySelector('.stat-value');
            if (dSpan) dSpan.textContent = anyFound ? total.toLocaleString() : '—';
            downloadsSpan.dataset.breakdown = JSON.stringify(breakdown);
            downloadsSpan.title = `Modrinth: ${breakdown.modrinth ?? 'n/a'} • Spigot: ${breakdown.spigot ?? 'n/a'} • Hangar: ${breakdown.hangar ?? 'n/a'}`;

            downloadsSpan.addEventListener('mouseenter', async () => {
                const bd = downloadsSpan.dataset.breakdown ? JSON.parse(downloadsSpan.dataset.breakdown) : null;
                // Removed the downloads graph. Show only the breakdown as escaped text (no raw HTML tags).
                const lines = [
                    'Downloads breakdown',
                    `Modrinth: ${bd && bd.modrinth !== null ? bd.modrinth.toLocaleString() : 'n/a'}`,
                    `Spigot: ${bd && bd.spigot !== null ? bd.spigot.toLocaleString() : 'n/a'}`,
                    `Hangar: ${bd && bd.hangar !== null ? bd.hangar.toLocaleString() : 'n/a'}`
                ];
                const html = `<div style="font-weight:700">Downloads</div><div style="margin-top:6px">${lines.map(l => escapeHtml(l)).join('<br>')}</div>`;
                showTooltip(downloadsSpan, html);
            });
            downloadsSpan.addEventListener('mouseleave', hideTooltip);

            if (dlStatusSpan && dlStatusSpan.parentNode) dlStatusSpan.parentNode.removeChild(dlStatusSpan);
            const cacheKey = `modrinth:downloads:${modId}`;
            const cachedMeta = getCachedMeta(cacheKey);
            if (cachedMeta && cachedMeta.ts) infoBtn.dataset.dlChecked = cachedMeta.ts;
            else infoBtn.dataset.dlChecked = Date.now();
        }
        loadDownloads();
    }

    // Version badge click -> modal
    if (!isOnDev) {
        versionBadge.style.cursor = 'pointer';
        versionBadge.addEventListener('click', async () => {
            if (!info.url) return;
            const repo = parseGitHubRepo(info.url);
            if (!repo) return;

            openModal();
            releaseBody.innerHTML = `<div style="opacity:0.75">Loading release notes…</div>`;

            modalCurrentRepo = `${repo.owner}/${repo.repo}`;
            modalReleases = [];
            modalReleaseIndex = 0;

            const list = await fetchReleasesList(info.url);
            if (!list || (list && list.__error)) {
                if (list && list.__error === 'rate_limit') {
                    releaseBody.innerHTML = `<div style="color:#ffd89b">GitHub API rate limited. Please try again later or use the refresh button.</div>`;
                } else {
                    releaseBody.innerHTML = `<div style="color:#ff6b6b">No releases found for <b>${escapeHtml(modalCurrentRepo)}</b>.</div>`;
                }
                updateModalNavButtons();
                return;
            }

            modalReleases = list;
            modalReleaseIndex = 0;

            const activeRel = modalReleases[modalReleaseIndex];
            const activeTag = activeRel ? (activeRel.tag_name || activeRel.name || '') : '';
            if (activeTag) {
                const encoded = encodeURIComponent(activeTag);
                const newPath = `${location.pathname}${location.search}#release:${modalCurrentRepo}:${encoded}`;
                history.replaceState(null, '', newPath);
            }

            renderModalReleaseAt(modalReleaseIndex);
        });
    } else {
        versionBadge.style.cursor = 'default';
        const vHtml = `<div><strong>In development</strong></div><div>This project is currently under active development — no release badge shown.</div>`;
        versionBadge.addEventListener('mouseenter', () => showTooltip(versionBadge, vHtml));
        versionBadge.addEventListener('mouseleave', hideTooltip);
    }

    // Contributors toggle handler
    contribToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!info.url) {
            showTooltip(contribToggle, `<div><strong>No repository</strong></div><div>Contributors unavailable</div>`);
            setTimeout(hideTooltip, 1400);
            return;
        }
        const repoUrl = info.url;
        const expanded = contribToggle.getAttribute('aria-expanded') === 'true';
        if (expanded) hideContribPopover();
        else showContribPopover(contribToggle, repoUrl, { name: info.name || folderName });
    });
}

/* ------------------ Render release into modal (with assets and compare) ------------------ */
function renderModalReleaseAt(index) {
    if (!modalReleases || !modalReleases.length) {
        releaseBody.innerHTML = `<div style="color:#ff6b6b">No releases available.</div>`;
        updateModalNavButtons();
        return;
    }
    const rel = modalReleases[index];
    if (!rel) {
        releaseBody.innerHTML = `<div style="color:#ff6b6b">Release not found.</div>`;
        updateModalNavButtons();
        return;
    }
    const title = rel.name || rel.tag_name || 'Release';
    const tag = rel.tag_name || '';
    const published = rel.published_at ? new Date(rel.published_at).toLocaleString() : '';
    const body = rel.body || '_No release note provided._';

    // Build assets HTML (fixed: use url field from mapping; if empty show message)
    let assetsHtml = '';
    if (Array.isArray(rel.assets) && rel.assets.length) {
        // check for at least one asset url present
        const hasAnyUrl = rel.assets.some(a => a && a.url);
        if (hasAnyUrl) {
            assetsHtml = '<div class="modal-assets-list">';
            for (const a of rel.assets) {
                const assetUrl = a.url || null;
                assetsHtml += `<div class="asset-row">
                    <div class="asset-meta">
                        <div style="min-width:0">
                            <div class="asset-name">${escapeHtml(a.name || '(unnamed)')}</div>
                            <div class="asset-size">${a.downloads !== null ? `${a.downloads.toLocaleString()} downloads • `: ''}${formatBytes(a.size)}</div>
                        </div>
                    </div>
                    <div class="asset-actions">` +
                    (assetUrl ? `<a class="asset-link" href="${escapeHtml(assetUrl)}" target="_blank" rel="noopener">Download</a>` : `<span style="opacity:0.65">No direct link</span>`)
                    + `</div>
                </div>`;
            }
            assetsHtml += '</div>';
        } else {
            assetsHtml = '<div style="opacity:0.75">Assets present but no downloadable URL available.</div>';
        }
    } else {
        assetsHtml = '<div style="opacity:0.7">No release assets</div>';
    }

    releaseBody.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;">
            <div>
                <div class="release-title" id="releaseTitle">${escapeHtml(title)}</div>
                <div class="release-meta">${escapeHtml(tag)} ${published ? '• Published ' + escapeHtml(published) : ''}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="toggleCompareBtn" class="modal-copy-btn" title="Toggle release diff">Compare</button>
            </div>
        </div>
        <div class="release-body">${marked.parse(body)}</div>
        <div id="releaseAssets">${assetsHtml}</div>
        <div id="releaseCompare" style="display:none;"></div>
        <div id="releaseInsights" class="release-insights"></div>
    `;

    // Set modalCopy dataset so user can copy deep link quickly
    if (modalCopy) {
        modalCopy.dataset.tag = tag || '';
        modalCopy.dataset.repo = modalCurrentRepo || '';
        modalCopy.disabled = !tag;
    }

    // update address bar
    if (modalCurrentRepo && tag) {
        const encoded = encodeURIComponent(tag);
        const newPath = `${location.pathname}${location.search}#release:${modalCurrentRepo}:${encoded}`;
        history.replaceState(null, '', newPath);
    }

    updateModalNavButtons();
    buildReleaseInsights(tag);

    // Compare toggle — replaced with contextual menu to offer 2 options:
    //  - Compare with previous release
    //  - Compare with other tag (shows an input to enter a tag)
    const toggleCompareBtn = document.getElementById('toggleCompareBtn');
    const compareContainer = document.getElementById('releaseCompare');

    // prefer to only create one menu at a time
    let compareMenuEl = null;
    function removeCompareMenu() {
        if (compareMenuEl && compareMenuEl.parentNode) {
            compareMenuEl.parentNode.removeChild(compareMenuEl);
            compareMenuEl = null;
            document.removeEventListener('click', onDocClickForCompareMenu);
            document.removeEventListener('keydown', onKeyDownForCompareMenu);
        }
    }
    function onDocClickForCompareMenu(e) {
        if (!compareMenuEl) return;
        if (!compareMenuEl.contains(e.target) && e.target !== toggleCompareBtn) removeCompareMenu();
    }
    function onKeyDownForCompareMenu(e) {
        if (e.key === 'Escape') removeCompareMenu();
    }

    toggleCompareBtn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        // toggle: if already open, close
        if (compareMenuEl) { removeCompareMenu(); return; }

        // create menu
        compareMenuEl = document.createElement('div');
        compareMenuEl.className = 'compare-menu';
        compareMenuEl.innerHTML = `
            <div class="compare-menu-inner">
                <button class="compare-option" data-type="previous">Compare with previous release</button>
                <button class="compare-option" data-type="other">Compare with other tag…</button>
                <div class="compare-other" style="display:none; margin-top:8px;">
                    <input class="compare-other-input" placeholder="Enter base tag (e.g. v1.2.3)" />
                    <button class="compare-other-go">Compare</button>
                    <div class="compare-other-hint" style="margin-top:6px;font-size:12px;opacity:0.8">Press Enter to compare</div>
                </div>
            </div>
        `;
        document.body.appendChild(compareMenuEl);

        // position menu near button
        const r = toggleCompareBtn.getBoundingClientRect();
        const menuW = 300;
        const menuH = 150;
        let left = r.left;
        let top = r.bottom + 8;
        if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
        if (top + menuH > window.innerHeight - 8) top = r.top - menuH - 8;
        compareMenuEl.style.left = `${Math.max(8, left)}px`;
        compareMenuEl.style.top = `${Math.max(8, top)}px`;

        document.addEventListener('click', onDocClickForCompareMenu);
        document.addEventListener('keydown', onKeyDownForCompareMenu);

        // handlers
        const prevBtn = compareMenuEl.querySelector('.compare-option[data-type="previous"]');
        const otherBtn = compareMenuEl.querySelector('.compare-option[data-type="other"]');
        const otherWrap = compareMenuEl.querySelector('.compare-other');
        const otherInput = compareMenuEl.querySelector('.compare-other-input');
        const otherGo = compareMenuEl.querySelector('.compare-other-go');

        prevBtn.addEventListener('click', async () => {
            removeCompareMenu();
            if (!modalCurrentRepo) {
                showTooltip(toggleCompareBtn, `<div><strong>No repo</strong></div>`);
                setTimeout(hideTooltip, 1200);
                return;
            }
            const currentIdx = modalReleaseIndex;
            const older = modalReleases[currentIdx + 1];
            if (!older || !older.tag_name) {
                showTooltip(toggleCompareBtn, `<div><strong>No previous release</strong></div><div>Cannot compute compare</div>`);
                setTimeout(hideTooltip, 1500);
                return;
            }
            compareContainer.style.display = 'block';
            compareContainer.innerHTML = `<div style="opacity:0.8">Loading compare…</div>`;
            const cmp = await fetchReleaseCompare(modalCurrentRepo, older.tag_name, tag);
            if (!cmp) {
                compareContainer.innerHTML = `<div style="color:#ff6b6b">Compare failed or unavailable.</div>`;
                return;
            }
            if (cmp.__error === 'rate_limit') {
                compareContainer.innerHTML = `<div style="color:#ffd89b">GitHub rate limited. Try again later.</div>`;
                return;
            }
            if (!cmp.files || !cmp.files.length) {
                compareContainer.innerHTML = `<div style="opacity:0.8">No changed files between ${escapeHtml(older.tag_name)} and ${escapeHtml(tag)}</div>`;
                return;
            }
            const filesHtml = cmp.files.map(f => `<div class="compare-file ${escapeHtml(f.status || '')}">
                <div class="filename">${escapeHtml(f.filename)}</div>
                <div class="meta">${escapeHtml(f.status)} • +${f.additions} / -${f.deletions}</div>
            </div>`).join('');
            compareContainer.innerHTML = `<div class="compare-section">
                <div style="font-weight:700;margin-bottom:6px">Changed files (${cmp.files.length})</div>
                ${filesHtml}
            </div>`;
        });

        otherBtn.addEventListener('click', () => {
            otherWrap.style.display = otherWrap.style.display === 'none' ? 'block' : 'none';
            if (otherWrap.style.display === 'block') {
                otherInput.focus();
            }
        });

        async function doOtherCompare() {
            const baseTagRaw = otherInput.value && otherInput.value.trim();
            if (!baseTagRaw) {
                otherInput.focus();
                return;
            }
            removeCompareMenu();
            compareContainer.style.display = 'block';
            compareContainer.innerHTML = `<div style="opacity:0.8">Loading compare…</div>`;
            const cmp = await fetchReleaseCompare(modalCurrentRepo, baseTagRaw, tag);
            if (!cmp) {
                compareContainer.innerHTML = `<div style="color:#ff6b6b">Compare failed or unavailable.</div>`;
                return;
            }
            if (cmp.__error === 'rate_limit') {
                compareContainer.innerHTML = `<div style="color:#ffd89b">GitHub rate limited. Try again later.</div>`;
                return;
            }
            if (!cmp.files || !cmp.files.length) {
                compareContainer.innerHTML = `<div style="opacity:0.8">No changed files between ${escapeHtml(baseTagRaw)} and ${escapeHtml(tag)}</div>`;
                return;
            }
            const filesHtml = cmp.files.map(f => `<div class="compare-file ${escapeHtml(f.status || '')}">
                <div class="filename">${escapeHtml(f.filename)}</div>
                <div class="meta">${escapeHtml(f.status)} • +${f.additions} / -${f.deletions}</div>
            </div>`).join('');
            compareContainer.innerHTML = `<div class="compare-section">
                <div style="font-weight:700;margin-bottom:6px">Changed files (${cmp.files.length})</div>
                ${filesHtml}
            </div>`;
        }

        otherGo.addEventListener('click', () => doOtherCompare());
        otherInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doOtherCompare();
            } else if (e.key === 'Escape') {
                removeCompareMenu();
            }
        });
    });
}

/* ------------------ Modal nav + copy button behavior ------------------ */
function updateModalNavButtons() {
    const atNewest = modalReleaseIndex === 0;
    const atOldest = modalReleases && (modalReleaseIndex >= (modalReleases.length - 1));
    setNavButtonState(modalNext, !atNewest);
    setNavButtonState(modalPrev, !atOldest);
}
function setNavButtonState(buttonEl, enabled) {
    if (!buttonEl) return;
    if (enabled) {
        buttonEl.classList.remove('nav-disabled');
        buttonEl.setAttribute('aria-disabled', 'false');
        buttonEl.disabled = false;
    } else {
        buttonEl.classList.add('nav-disabled');
        buttonEl.setAttribute('aria-disabled', 'true');
        buttonEl.disabled = true;
    }
}
modalPrev.addEventListener('click', () => {
    if (!modalReleases || modalReleases.length === 0) return;
    if (modalReleaseIndex >= modalReleases.length - 1) return;
    modalReleaseIndex++;
    renderModalReleaseAt(modalReleaseIndex);
});
modalNext.addEventListener('click', () => {
    if (!modalReleases || modalReleases.length === 0) return;
    if (modalReleaseIndex <= 0) return;
    modalReleaseIndex--;
    renderModalReleaseAt(modalReleaseIndex);
});

// modalCopy behavior: copy deep link to current release
if (modalCopy) {
    modalCopy.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tag = modalCopy.dataset.tag || '';
        const repoStr = modalCopy.dataset.repo || modalCurrentRepo || '';
        if (!tag || !repoStr) {
            showTooltip(modalCopy, `<div><strong>No release</strong></div><div>Nothing to copy</div>`);
            setTimeout(hideTooltip, 1200);
            return;
        }
        try {
            const base = `${location.origin}${location.pathname}`;
            const deepHash = `#release:${repoStr}:${encodeURIComponent(tag)}`;
            const full = `${base}${deepHash}`;
            await navigator.clipboard.writeText(full);
            const prev = modalCopy.textContent;
            modalCopy.textContent = '✓ Copied';
            setTimeout(() => { modalCopy.textContent = prev; }, 1200);
        } catch {
            const prev = modalCopy.textContent;
            modalCopy.textContent = 'Failed';
            setTimeout(() => { modalCopy.textContent = prev; }, 1200);
        }
    });
}

/* Modal open / close */
function openModal() {
    releaseModal.classList.remove('hidden');
    releaseModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
}
function closeModal() {
    releaseModal.classList.add('hidden');
    releaseModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalReleases = [];
    modalReleaseIndex = 0;
    modalCurrentRepo = null;
    releaseBody.innerHTML = '';
    setNavButtonState(modalPrev, false);
    setNavButtonState(modalNext, false);
    if (modalCopy) { modalCopy.dataset.tag = ''; modalCopy.dataset.repo = ''; modalCopy.disabled = true; }
    try {
        if (location.hash && location.hash.startsWith('#release:')) {
            const newUrl = location.pathname + location.search;
            history.replaceState(null, '', newUrl);
        }
    } catch (e) {}
}
modalClose.addEventListener('click', () => closeModal());
modalBackdrop.addEventListener('click', closeModal);

/* ------------------ Keyboard handlers ------------------ */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !releaseModal.classList.contains('hidden')) closeModal();
    if (e.key === 'Escape' && currentContribPopover) hideContribPopover();
    if (e.key === 'Escape' && currentPlatformPopover) hidePlatformPopover();
    if (!releaseModal.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') { if (!modalPrev.disabled) modalPrev.click(); }
        else if (e.key === 'ArrowRight') { if (!modalNext.disabled) modalNext.click(); }
    }
    if (e.key === '/' && document.activeElement !== searchBox) {
        e.preventDefault();
        searchBox.focus();
    }
});

/* ------------------ Refresh button ------------------ */
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('rotating');
    clearAllZPluginsCache();
    setTimeout(() => { location.reload(); }, 260);
});

/* Logos and theme update */
function setElementSrcFromOptions(el, options) {
    if (!el || !Array.isArray(options) || options.length === 0) return;
    el.dataset._logoIndex = '0';
    const tryIndex = (i) => {
        if (i >= options.length) {
            el.onerror = null;
            el.onload = null;
            return;
        }
        el.onerror = () => { tryIndex(i + 1); };
        el.onload = () => { el.onerror = null; el.onload = null; };
        try {
            el.src = options[i];
        } catch (e) {
            tryIndex(i + 1);
        }
    };
    tryIndex(0);
}
function updateLogos() {
    document.querySelectorAll('.card-logo').forEach(img => {
        const lightOpts = img.dataset.lightOptions ? JSON.parse(img.dataset.lightOptions) : [];
        const darkOpts = img.dataset.darkOptions ? JSON.parse(img.dataset.darkOptions) : [];
        const opts = document.body.classList.contains('light') ? lightOpts : darkOpts;
        if (opts && opts.length) setElementSrcFromOptions(img, opts);
    });
    if (banner) {
        const lightRaw = banner.dataset.lightOptions || banner.getAttribute('data-light-options');
        const darkRaw = banner.dataset.darkOptions || banner.getAttribute('data-dark-options');
        const lightB = lightRaw ? JSON.parse(lightRaw) : [];
        const darkB = darkRaw ? JSON.parse(darkRaw) : [];
        const opts = document.body.classList.contains('light') ? lightB : darkB;
        if (opts && opts.length) setElementSrcFromOptions(banner, opts);
    }
    updateCardTheme();
}
function updateCardTheme() {
    const isLight = document.body.classList.contains('light');
    document.querySelectorAll('.card-inner').forEach(el => {
        if (isLight) el.classList.add('light-mode');
        else el.classList.remove('light-mode');
    });
}

/* ------------------ Load projects list and info.json ------------------ */
fetch('projects.json')
    .then(res => res.json())
    .then(list => {
        document.querySelectorAll('.skeleton').forEach(s => s.remove());
        const folders = Array.isArray(list) ? list.filter(folderName => folderName !== 'sources') : [];
        const infoPromises = folders.map(folderName => {
            return fetch(`${folderName}/info.json`).then(r => {
                if (!r.ok) throw new Error('missing info.json');
                return r.json();
            }).then(infoDoc => Array.isArray(infoDoc) ? infoDoc[0] : infoDoc)
            .catch(err => { console.warn('Could not load info for', folderName, err); return { name: folderName, description: '' }; });
        });
        Promise.all(infoPromises).then(allInfos => {
            allInfos.forEach((info, idx) => renderProject(folders[idx], info, idx));

            // Build Fuse index for fuzzy search & autocomplete suggestions
            searchItems = allInfos.map((info, idx) => ({
                folder: folders[idx],
                name: (info && info.name) ? info.name : folders[idx],
                description: info && info.description ? info.description : '',
                idx
            }));
            try {
                fuse = new Fuse(searchItems, {
                    keys: [
                        { name: 'name', weight: 0.8 },
                        { name: 'description', weight: 0.3 },
                        { name: 'folder', weight: 0.2 }
                    ],
                    threshold: 0.38,
                    ignoreLocation: true,
                    includeScore: true,
                    useExtendedSearch: false,
                    minMatchCharLength: 1
                });
            } catch (e) {
                console.warn('Could not init Fuse.js', e);
                fuse = null;
            }

            processReleaseHash();
        }).catch(err => {
            console.error('Error while loading project infos', err);
            folders.forEach((folderName, idx) => renderProject(folderName, { name: folderName, description: '' }, idx));
            processReleaseHash();
        });
    }).catch(err => {
        console.error('Could not read projects.json', err);
        processReleaseHash();
    });

/* Footer year */
document.getElementById('year').textContent = new Date().getFullYear();

/* ------------------ Autocomplete suggestions + keyboard nav ------------------ */
function clearSuggestions() {
    suggestionsEl.innerHTML = '';
    suggestionsEl.hidden = true;
    selectedSuggestionIndex = -1;
    searchBox.setAttribute('aria-expanded', 'false');
}
function renderSuggestions(results) {
    suggestionsEl.innerHTML = '';
    if (!results || !results.length) { clearSuggestions(); return; }
    suggestionsEl.hidden = false;
    searchBox.setAttribute('aria-expanded', 'true');
    const max = Math.min(8, results.length);
    for (let i = 0; i < max; i++) {
        const item = results[i].item ? results[i].item : results[i];
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.setAttribute('role', 'option');
        li.setAttribute('data-idx', item.idx);
        li.innerHTML = `<div style="flex:1;min-width:0">
            <strong>${escapeHtml(item.name)}</strong><div style="font-size:12px;opacity:0.85">${escapeHtml((item.description || '').slice(0,120))}</div>
        </div>`;
        li.addEventListener('mousedown', (ev) => {
            // mousedown to prevent blurring before click; we'll complete value
            ev.preventDefault();
            completeWithSuggestion(item);
        });
        li.addEventListener('mouseenter', () => {
            setSuggestionActive(i);
        });
        suggestionsEl.appendChild(li);
    }
    selectedSuggestionIndex = -1;
}

function setSuggestionActive(relativeIndex) {
    const children = Array.from(suggestionsEl.querySelectorAll('.suggestion-item'));
    children.forEach((c, idx) => {
        if (idx === relativeIndex) c.classList.add('active');
        else c.classList.remove('active');
    });
    selectedSuggestionIndex = relativeIndex;
}

function completeWithSuggestion(item) {
    if (!item) return;
    searchBox.value = item.name;
    // fire input event so existing filtering logic runs
    const ev = new Event('input', { bubbles: true });
    searchBox.dispatchEvent(ev);
    clearSuggestions();
    // blur not necessary; keep focus on searchBox so user can continue navigation if needed
}

/* Integrate with existing filtering behavior — we keep the original filter logic, but
   our suggestions help to quickly fill the input. */
searchBox.addEventListener('input', () => {
    const filter = searchBox.value.trim();
    if (fuse && filter.length > 0) {
        const res = fuse.search(filter, { limit: 12 });
        renderSuggestions(res);
    } else {
        clearSuggestions();
    }

    // existing filtering (kept) — use lowercase compare as before
    const low = searchBox.value.trim().toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const nameEl = card.querySelector('.project-name');
        const descEl = card.querySelector('.card-desc');
        const verEl = card.querySelector('.version');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        const desc = descEl ? descEl.textContent.toLowerCase() : '';
        const ver = verEl ? verEl.dataset.version && verEl.dataset.version.toLowerCase() || verEl.textContent.toLowerCase() : '';
        const matches = !low || name.includes(low) || desc.includes(low) || ver.includes(low);
        if (matches) { card.classList.remove('hidden'); card.style.animation = 'none'; void card.offsetHeight; card.style.animation = ''; }
        else card.classList.add('hidden');

        if (nameEl) {
            const raw = nameEl.textContent;
            if (low) { const regex = new RegExp(`(${escapeRegExp(low)})`, 'gi'); nameEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
            else nameEl.textContent = raw;
        }
        if (descEl) {
            const raw = descEl.textContent;
            if (low) { const regex = new RegExp(`(${escapeRegExp(low)})`, 'gi'); descEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
            else descEl.textContent = raw;
        }
    });
});

searchBox.addEventListener('keydown', (e) => {
    const children = Array.from(suggestionsEl.querySelectorAll('.suggestion-item'));
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!children.length) return;
        const next = (selectedSuggestionIndex + 1) >= children.length ? 0 : selectedSuggestionIndex + 1;
        setSuggestionActive(next);
        children[next].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!children.length) return;
        const prev = (selectedSuggestionIndex - 1) < 0 ? (children.length - 1) : selectedSuggestionIndex - 1;
        setSuggestionActive(prev);
        children[prev].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (selectedSuggestionIndex >= 0 && children[selectedSuggestionIndex]) {
            e.preventDefault();
            const itemIdx = parseInt(children[selectedSuggestionIndex].getAttribute('data-idx'), 10);
            const item = searchItems.find(si => si.idx === itemIdx);
            completeWithSuggestion(item);
        }
        // else allow Enter to behave normally (e.g., submit form if any)
    } else if (e.key === 'Tab') {
        if (selectedSuggestionIndex >= 0 && children[selectedSuggestionIndex]) {
            e.preventDefault();
            const itemIdx = parseInt(children[selectedSuggestionIndex].getAttribute('data-idx'), 10);
            const item = searchItems.find(si => si.idx === itemIdx);
            completeWithSuggestion(item);
        } else if (children.length === 1) {
            // If there's only one suggestion, TAB will complete it
            e.preventDefault();
            const itemIdx = parseInt(children[0].getAttribute('data-idx'), 10);
            const item = searchItems.find(si => si.idx === itemIdx);
            completeWithSuggestion(item);
        }
    } else if (e.key === 'Escape') {
        clearSuggestions();
    }
});

document.addEventListener('click', (e) => {
    if (!suggestionsEl.contains(e.target) && e.target !== searchBox) {
        clearSuggestions();
    }
});

/* reuse function defined earlier */
function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* Dark mode initialization */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') { document.body.classList.add('light'); toggleBtn.textContent = '🌞'; }
else { document.body.classList.remove('light'); toggleBtn.textContent = '🌙'; }
updateLogos();

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    if (document.body.classList.contains('light')) { toggleBtn.textContent = '🌞'; localStorage.setItem('theme', 'light'); }
    else { toggleBtn.textContent = '🌙'; localStorage.setItem('theme', 'dark'); }
    updateLogos();
});

/* Release insights builder (kept) */
function buildReleaseInsights(activeTag) {
    const el = document.getElementById('releaseInsights');
    if (!el || !modalReleases || !modalReleases.length) return;

    const timeline = modalReleases
        .filter(r => !r.draft)
        .map((r, idx) => {
            const isActive = r.tag_name === activeTag;
            const date = r.published_at ? new Date(r.published_at).toLocaleDateString() : '';
            return `<button class="timeline-pill ${isActive ? 'active':''}" data-idx="${idx}" title="${date}">
                ${escapeHtml(r.tag_name || r.name || '')}
            </button>`;
        }).join('');

    const now = new Date();
    const months = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d);
    }
    const releaseDates = modalReleases
        .filter(r => !r.draft && r.published_at)
        .map(r => new Date(r.published_at));

    function buildMonthCalendar(baseDate) {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let cells = [];
        for (let i = 0; i < startWeekday; i++) cells.push('<div class="cal-cell empty"></div>');
        for (let day = 1; day <= daysInMonth; day++) {
            const cur = new Date(year, month, day);
            const hasRelease = releaseDates.some(rd =>
                rd.getFullYear() === cur.getFullYear() &&
                rd.getMonth() === cur.getMonth() &&
                rd.getDate() === cur.getDate()
            );
            cells.push(`<div class="cal-cell${hasRelease ? ' rel':''}" aria-label="${cur.toDateString()}">${day}</div>`);
        }
        return `<div class="month-block">
            <div class="month-label">${baseDate.toLocaleString(undefined,{month:'short'})}</div>
            <div class="month-grid">${cells.join('')}</div>
        </div>`;
    }
    const calendarHTML = months.map(m => buildMonthCalendar(m)).join('');

    el.innerHTML = `
        <div class="ins-section">
            <div class="ins-title">Release Timeline</div>
            <div class="timeline-pills">${timeline}</div>
        </div>
        <div class="ins-section">
            <div class="ins-title">Recent Release Calendar</div>
            <div class="calendar-wrap">${calendarHTML}</div>
        </div>
    `;

    el.querySelectorAll('.timeline-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx, 10);
            if (!isNaN(i)) {
                modalReleaseIndex = i;
                renderModalReleaseAt(i);
            }
        });
    });
}

/* ------------------ Contributors / Platforms popovers (kept) ------------------ */
function hideContribPopover() {
    if (!currentContribPopover) return;
    try { currentContribPopover.el.parentNode.removeChild(currentContribPopover.el); } catch (e) {}
    if (currentContribPopover.button) currentContribPopover.button.setAttribute('aria-expanded', 'false');
    currentContribPopover = null;
    document.removeEventListener('click', handleDocClickForPopover);
    window.removeEventListener('scroll', hideContribPopover, true);
    window.removeEventListener('resize', hideContribPopover);
}
function handleDocClickForPopover(evt) {
    if (!currentContribPopover) return;
    const root = currentContribPopover.el;
    if (!root.contains(evt.target) && evt.target !== currentContribPopover.button) {
        hideContribPopover();
    }
}
async function showContribPopover(buttonEl, repoUrl, opts = {}) {
    hideContribPopover();
    buttonEl.setAttribute('aria-expanded', 'true');

    const popup = document.createElement('div');
    popup.className = 'contrib-popover';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', `Contributors for ${opts.name || repoUrl}`);
    popup.innerHTML = `<div class="contrib-popover-inner">
        <div class="contrib-popover-header">
            <strong>${escapeHtml(opts.name || repoUrl)}</strong>
            <button class="contrib-popover-close" title="Close" aria-label="Close">✕</button>
        </div>
        <div class="contrib-popover-body">
            <div class="contrib-loading">Loading contributors & activity…</div>
        </div>
    </div>`;

    document.body.appendChild(popup);

    const r = buttonEl.getBoundingClientRect();
    const pw = 340, ph = 160;
    let left = r.right - pw;
    let top = r.bottom + 8;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 8;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    currentContribPopover = { el: popup, button: buttonEl };
    popup.querySelector('.contrib-popover-close').addEventListener('click', () => hideContribPopover());
    setTimeout(() => document.addEventListener('click', handleDocClickForPopover), 20);
    window.addEventListener('scroll', hideContribPopover, true);
    window.addEventListener('resize', hideContribPopover);

    const body = popup.querySelector('.contrib-popover-body');
    body.innerHTML = `<div class="contrib-loading">Loading contributors & activity…</div>`;

    let contribs = await fetchContributors(repoUrl, 12).catch(() => null);
    let activity = await fetchCommitActivity(repoUrl).catch(() => null);

    if (contribs && contribs.__error === 'rate_limit') {
        body.innerHTML = `<div style="color:#ffd89b">GitHub API rate limited. Try again later or press Retry.</div>
            <div style="margin-top:8px;"><button class="fetch-retry">Retry</button></div>`;
        body.querySelector('.fetch-retry').addEventListener('click', async () => {
            body.innerHTML = `<div class="contrib-loading">Retrying…</div>`;
            const reContribs = await fetchContributors(repoUrl, 12).catch(() => null);
            if (reContribs && !reContribs.__error) {
                contribs = reContribs;
            } else {
                body.innerHTML = `<div style="color:#ffd89b">Still rate limited — try later.</div>`;
                return;
            }
        });
        return;
    }

    if ((!activity || !Array.isArray(activity) || activity.length === 0) || (activity && activity.__error)) {
        const fallback = await computeActivityFromCommits(repoUrl, 12).catch(() => null);
        if (Array.isArray(fallback)) activity = fallback.map(n => ({ total: n }));
    }

    const contribHtml = (contribs && contribs.length && !contribs.__error) ? contribs.slice(0,8).map(c => {
        return `<a class="contrib-avatar" href="${escapeHtml(c.html_url)}" target="_blank" rel="noopener" title="${escapeHtml(c.login)} — ${c.contributions} commits">
            <img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.login)}" />
        </a>`;
    }).join('') : `<div class="ins-no-contrib">No contributors data</div>`;

    let sparkHtml = `<div class="ins-activity-placeholder">No activity</div>`;
    if (Array.isArray(activity) && activity.length) {
        let last;
        if (typeof activity[0] === 'number') last = activity.slice(-12);
        else last = activity.slice(-12).map(w => w.total || 0);
        sparkHtml = `<div class="ins-activity-spark">${buildSparkline(last, 220, 36)}</div>`;
    }

    body.innerHTML = `
        <div class="contrib-row">
            <div class="contrib-avatars">${contribHtml}</div>
            <div class="contrib-activity">${sparkHtml}</div>
        </div>
        <div class="contrib-meta"><small>Click avatar to view profile. Activity shows commits/week (≈last 12w).</small></div>
    `;
}

/* Platform popover */
function hidePlatformPopover() {
    if (!currentPlatformPopover) return;
    try { currentPlatformPopover.el.parentNode.removeChild(currentPlatformPopover.el); } catch (e) {}
    if (currentPlatformPopover.button) currentPlatformPopover.button.setAttribute('aria-expanded', 'false');
    currentPlatformPopover = null;
    document.removeEventListener('click', handleDocClickForPlatformPopover);
    window.removeEventListener('scroll', hidePlatformPopover, true);
    window.removeEventListener('resize', hidePlatformPopover);
}
function handleDocClickForPlatformPopover(evt) {
    if (!currentPlatformPopover) return;
    const root = currentPlatformPopover.el;
    if (!root.contains(evt.target) && evt.target !== currentPlatformPopover.button) {
        hidePlatformPopover();
    }
}
function normalizePlatformEntry(entry) {
    if (!entry) return null;
    const logos = Array.isArray(entry.logos) ? entry.logos.slice() : (entry.logo ? [entry.logo] : []);
    const versions = Array.isArray(entry.versions) ? entry.versions.slice() : [];
    return { logos, versions };
}
function buildPlatformsHTML(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) return '<div class="ins-no-contrib">No platforms provided</div>';
    return platforms.map(pRaw => {
        const p = normalizePlatformEntry(pRaw);
        if (!p) return '';
        const logosHtml = (p.logos && p.logos.length) ? p.logos.map(src => `<img class="platform-logo" src="${escapeHtml(src)}" alt="platform logo">`).join('') : '';
        const versionsHtml = (p.versions && p.versions.length) ? p.versions.map(v => `<span class="platform-version-pill">${escapeHtml(v)}</span>`).join('') : '';
        return `<div class="platform-row">
            <div class="platform-logos" aria-hidden="true">${logosHtml}</div>
            <div class="platform-versions">${versionsHtml}</div>
        </div>`;
    }).join('');
}
function showPlatformPopover(buttonEl, platforms, opts = {}) {
    hideContribPopover();
    hidePlatformPopover();
    buttonEl.setAttribute('aria-expanded', 'true');

    const popup = document.createElement('div');
    popup.className = 'platform-popover';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', `Platform compatibility for ${opts.name || ''}`);
    popup.innerHTML = `<div class="platform-popover-inner">
        <div class="platform-popover-header">
            <strong>${escapeHtml(opts.name || '')}</strong>
            <button class="platform-popover-close" title="Close" aria-label="Close">✕</button>
        </div>
        <div class="platform-popover-body">
            <div class="platform-loading">Loading platforms…</div>
        </div>
    </div>`;

    document.body.appendChild(popup);

    const r = buttonEl.getBoundingClientRect();
    const pw = 360, ph = 180;
    let left = r.left;
    let top = r.bottom + 8;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 8;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    currentPlatformPopover = { el: popup, button: buttonEl };

    popup.querySelector('.platform-popover-close').addEventListener('click', () => hidePlatformPopover());
    setTimeout(() => document.addEventListener('click', handleDocClickForPlatformPopover), 20);

    window.addEventListener('scroll', hidePlatformPopover, true);
    window.addEventListener('resize', hidePlatformPopover);

    const body = popup.querySelector('.platform-popover-body');
    const html = buildPlatformsHTML(platforms);
    body.innerHTML = html;
}

/* ------------------ Deep-link handling ------------------ */
function parseReleaseHash(hash) {
    if (!hash) return null;
    const h = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    const m = h.match(/^release:([^:]+\/[^:]+):(.+)$/);
    if (!m) return null;
    try {
        const repo = m[1];
        const rawTag = decodeURIComponent(m[2]);
        return { repo, tag: rawTag };
    } catch (e) {
        return { repo: m[1], tag: m[2] };
    }
}
async function processReleaseHash() {
    const parsed = parseReleaseHash(location.hash);
    if (!parsed) return;
    const ghUrl = `https://github.com/${parsed.repo}`;
    const list = await fetchReleasesList(ghUrl);
    if (!list || !list.length) {
        openModal();
        if (list && list.__error === 'rate_limit') {
            releaseBody.innerHTML = `<div style="color:#ffd89b">GitHub API rate limited. Please try again later.</div>`;
        } else {
            releaseBody.innerHTML = `<div style="color:#ff6b6b">No releases found for <b>${escapeHtml(parsed.repo)}</b>.</div>`;
        }
        return;
    }
    modalCurrentRepo = parsed.repo;
    modalReleases = list;

    const reqTag = parsed.tag || '';
    const norm = t => (t || '').toString().toLowerCase().replace(/^v/, '');
    let foundIdx = -1;
    for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const candidates = [r.tag_name || '', r.name || ''];
        for (const c of candidates) {
            if (!c) continue;
            if (c === reqTag) { foundIdx = i; break; }
            if (norm(c) === norm(reqTag)) { foundIdx = i; break; }
        }
        if (foundIdx !== -1) break;
    }
    openModal();
    if (foundIdx === -1) {
        modalReleaseIndex = 0;
        renderModalReleaseAt(modalReleaseIndex);
        releaseBody.insertAdjacentHTML('afterbegin', `<div style="color:#ffb86b">Requested release <b>${escapeHtml(reqTag)}</b> not found; showing latest.</div>`);
    } else {
        modalReleaseIndex = foundIdx;
        renderModalReleaseAt(modalReleaseIndex);
    }
}
window.addEventListener('hashchange', () => {
    processReleaseHash();
});

/* ------------------ Existing helper used by modal insights (kept) ------------------ */
async function renderContributorsAndActivity() {
    const wrap = document.getElementById('insContribs');
    if (!wrap) return;
    if (!modalCurrentRepo) {
        wrap.innerHTML = `<div class="ins-contribs-empty">Repository unknown.</div>`;
        return;
    }
    wrap.innerHTML = `<div class="ins-contribs-loading">Loading contributors & activity…</div>`;
    const ghUrl = `https://github.com/${modalCurrentRepo}`;
    const [contribs, activity] = await Promise.all([
        fetchContributors(ghUrl, 10).catch(() => null),
        fetchCommitActivity(ghUrl).catch(() => null)
    ]);
    const contribHtml = (contribs && contribs.length && !contribs.__error) ? contribs.slice(0,6).map(c => {
        return `<a href="${escapeHtml(c.html_url)}" target="_blank" rel="noopener" class="ins-avatar" title="${escapeHtml(c.login)}: ${c.contributions} commits">
            <img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.login)}" />
        </a>`;
    }).join('') : `<div class="ins-no-contrib">No contributors data</div>`;

    let sparkHtml = `<div class="ins-activity-placeholder">No activity</div>`;
    if (Array.isArray(activity) && activity.length && !activity.__error) {
        const last = activity.slice(-12).map(w => w.total || 0);
        sparkHtml = `<div class="ins-activity-spark">${buildSparkline(last, 140, 28)}</div>`;
    } else if (activity && activity.__error === 'rate_limit') {
        sparkHtml = `<div style="color:#ffd89b">Activity unavailable due to rate limit</div>`;
    }

    wrap.innerHTML = `
        <div class="ins-contrib-row">
            <div class="ins-contrib-avatars">${contribHtml}</div>
            <div class="ins-contrib-activity">${sparkHtml}</div>
        </div>
        <div class="ins-contrib-meta">
            <small>Click avatars to view profile. Activity shows commits per week (last ~12w).</small>
        </div>
    `;
}

/* ------------------ End of script ------------------ */