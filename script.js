/* script.js — full file
   Features:
   - Load projects list & info.json
   - Render project cards with logos, version badge, buttons
   - Modal for release notes with Prev/Next navigation
   - Aggregated downloads (Modrinth + Spigot/Spiget + Hangar) with breakdown tooltip
   - Caching (localStorage) with TTLs to reduce API calls
   - Minimalist refresh button (top-left) that clears our cache and reloads
   - Dark/light theme toggle with robust card theming via .card-inner.light-mode
   - Keyboard navigation (/, Esc, ArrowLeft/ArrowRight)
*/

const toggleBtn = document.getElementById('toggleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const banner = document.getElementById('banner');
const searchBox = document.getElementById('searchBox');
const container = document.getElementById('projectsContainer');

const releaseModal = document.getElementById('releaseModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const releaseBody = document.getElementById('releaseBody');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');

// Modal state
let modalReleases = [];
let modalReleaseIndex = 0;
let modalCurrentRepo = null;

// Tooltip element (reused)
let tooltipEl = null;
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
    tooltipEl.classList.remove('visible');
    tooltipEl.addEventListener('transitionend', () => {
        if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
        tooltipEl = null;
    }, { once: true });
    setTimeout(() => {
        if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
        tooltipEl = null;
    }, 400);
}

// Caching utilities (localStorage)
const CACHE_PREFIX = 'zplugins:cache:';
function setCached(key, value, ttlSeconds) {
    try {
        const payload = { ts: Date.now(), ttl: ttlSeconds * 1000, v: value };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
    } catch (e) {
        console.warn('Could not write cache', e);
    }
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
    } catch (e) {
        console.warn('Could not read cache', e);
        return null;
    }
}
function clearAllZPluginsCache() {
    try {
        const keys = Object.keys(localStorage);
        for (let k of keys) if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    } catch (e) { console.warn('Could not clear cache', e); }
}

// TTLs (seconds)
const TTL = {
    GH_STATS: 60 * 60,         // 1 hour
    GH_RELEASES: 6 * 60 * 60,  // 6 hours
    MODRINTH: 6 * 60 * 60,     // 6 hours
    SPIGET: 6 * 60 * 60,
    HANGAR: 6 * 60 * 60
};

// Ensure banner paths
if (banner) {
    banner.dataset.dark = 'sources/darkmode/banner.png';
    banner.dataset.light = 'sources/lightmode/banner.png';
    banner.src = document.body.classList.contains('light') ? banner.dataset.light : banner.dataset.dark;
}

// Skeleton placeholders
for (let i = 0; i < 6; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    container.appendChild(skeleton);
}

// Helper: parse owner/repo from GitHub URL
function parseGitHubRepo(url) {
    try {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        const m = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/i);
        if (m) return { owner: m[1], repo: m[2].replace(/\/$/, '') };
    } catch (e) { /* ignore */ }
    return null;
}

// ------------------ GitHub helpers (cached) ------------------
async function fetchGitHubStats(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return { stars: null, forks: null };
    const cacheKey = `gh:stats:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    try {
        const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`);
        if (!res.ok) {
            console.warn('GitHub stats fetch not ok', res.status, repo.owner + '/' + repo.repo);
            return { stars: null, forks: null };
        }
        const data = await res.json();
        const result = {
            stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
            forks: typeof data.forks_count === 'number' ? data.forks_count : null
        };
        setCached(cacheKey, result, TTL.GH_STATS);
        return result;
    } catch (err) {
        console.warn('fetchGitHubStats error', err);
        return { stars: null, forks: null };
    }
}

async function fetchReleasesList(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    const cacheKey = `gh:releases:${repo.owner}/${repo.repo}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    try {
        const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=100`);
        if (!res.ok) {
            console.warn('fetchReleasesList not ok', res.status, repo.owner + '/' + repo.repo);
            return null;
        }
        const list = await res.json();
        if (!Array.isArray(list)) return null;
        const slim = list.map(r => ({
            id: r.id,
            tag_name: r.tag_name,
            name: r.name,
            published_at: r.published_at,
            body: r.body || '',
            draft: !!r.draft,
            prerelease: !!r.prerelease
        }));
        setCached(cacheKey, slim, TTL.GH_RELEASES);
        return slim;
    } catch (err) { console.warn('fetchReleasesList error', err); return null; }
}

// minimal fallback
async function fetchLatestReleaseObject(githubUrl) {
    const repo = parseGitHubRepo(githubUrl);
    if (!repo) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`);
        if (!res.ok) {
            const listRes = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases`);
            if (!listRes.ok) return null;
            const list = await listRes.json();
            if (Array.isArray(list) && list.length) return list[0];
            return null;
        }
        return await res.json();
    } catch (err) { console.warn('fetchLatestReleaseObject error', err); return null; }
}
// -------------------------------------------------------------

// ------------------ Modrinth helper (cached) ------------------
async function fetchModrinthDownloadsById(modrinthId) {
    if (!modrinthId) return null;
    const cacheKey = `modrinth:downloads:${modrinthId}`;
    const cached = getCached(cacheKey);
    if (cached !== null) return cached;
    try {
        const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(modrinthId)}`);
        if (!res.ok) return null;
        const data = await res.json();
        const downloads = typeof data.downloads === 'number' ? data.downloads : (data.downloadCount || null);
        if (typeof downloads === 'number') setCached(cacheKey, downloads, TTL.MODRINTH);
        return downloads;
    } catch (err) { console.warn('fetchModrinthDownloadsById error', err); return null; }
}

// ------------------ Spiget (Spigot) helper (cached) ------------------
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
    if (cached !== null) return cached;
    try {
        const res = await fetch(`https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/stats`);
        if (!res.ok) {
            const res2 = await fetch(`https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}/downloads`);
            if (!res2.ok) return null;
            const maybeNum = await res2.json();
            const numeric = typeof maybeNum === 'number' ? maybeNum : null;
            if (numeric !== null) setCached(cacheKey, numeric, TTL.SPIGET);
            return numeric;
        }
        const data = await res.json();
        const downloads = (data && (data.downloads || data.downloadAmount || null));
        if (typeof downloads === 'number') setCached(cacheKey, downloads, TTL.SPIGET);
        return downloads;
    } catch (err) { console.warn('fetchSpigetDownloads error', err); return null; }
}

// ------------------ Hangar helper (cached) ------------------
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
    if (cached !== null) return cached;
    const tries = [
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/statistics`,
        `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/stats`
    ];
    for (const endpoint of tries) {
        try {
            const res = await fetch(endpoint);
            if (!res.ok) continue;
            const data = await res.json();
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
    return null;
}

// Render a single project card
function renderProject(folderName, info, index) {
    const card = document.createElement('div');
    card.className = 'card';

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Ensure card-inner respects current theme immediately
    if (document.body.classList.contains('light')) inner.classList.add('light-mode');

    // Logo
    const img = document.createElement('img');
    img.className = 'card-logo';
    img.alt = `${info.name || folderName} logo`;
    const darkLogo = `${folderName}/sources/darkmode/logo.png`;
    const lightLogo = `${folderName}/sources/lightmode/logo.png`;
    img.dataset.dark = darkLogo;
    img.dataset.light = lightLogo;
    img.src = document.body.classList.contains('light') ? lightLogo : darkLogo;
    inner.appendChild(img);

    // Title + version
    const titleRow = document.createElement('h3');
    const titleText = document.createElement('span');
    titleText.className = 'project-name';
    titleText.textContent = info.name || folderName;
    titleRow.appendChild(titleText);

    const versionBadge = document.createElement('span');
    versionBadge.className = 'version badge-link';
    versionBadge.textContent = 'loading...';
    versionBadge.dataset.version = '';
    titleRow.appendChild(versionBadge);

    inner.appendChild(titleRow);

    // Stats row - downloads only when modrinth key exists
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

    // Buttons container
    const btns = document.createElement('div');
    btns.className = 'btns';

    function addBtn(href, label, opts = {}) {
        if (!href) return;
        const a = document.createElement('a');
        const isGhost = opts.ghost !== false;
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
    addBtn(javadocUrl, 'Javadocs', { iconText: '📚' });

    inner.appendChild(btns);
    card.appendChild(inner);
    container.appendChild(card);

    // Animate show
    setTimeout(() => card.classList.add('show'), index * 120);

    // Version + GH stats
    if (info.url) {
        (async () => {
            const repo = parseGitHubRepo(info.url);
            if (!repo) {
                versionBadge.textContent = 'n/a';
            } else {
                const cachedReleases = getCached(`gh:releases:${repo.owner}/${repo.repo}`);
                if (cachedReleases && Array.isArray(cachedReleases) && cachedReleases.length) {
                    const v = cachedReleases[0].tag_name || cachedReleases[0].name || null;
                    versionBadge.textContent = v ? `v${v.replace(/^v/i, '')}` : 'n/a';
                    if (v) versionBadge.dataset.version = v;
                } else {
                    try {
                        const latest = await fetchLatestReleaseObject(info.url);
                        const v = latest ? (latest.tag_name || latest.name || null) : null;
                        versionBadge.textContent = v ? `v${v.replace(/^v/i, '')}` : 'n/a';
                        if (v) versionBadge.dataset.version = v;
                    } catch {
                        versionBadge.textContent = 'n/a';
                    }
                }
            }
        })();

        fetchGitHubStats(info.url).then(({ stars, forks }) => {
            const starsSpanVal = statsRow.querySelector('.github-stars .stat-value');
            const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
            if (starsSpanVal) starsSpanVal.textContent = (typeof stars === 'number') ? stars.toLocaleString() : '—';
            if (forksSpanVal) forksSpanVal.textContent = (typeof forks === 'number') ? forks.toLocaleString() : '—';
        }).catch(err => {
            console.warn('Error retrieving GH stats for', info.url, err);
            const starsSpanVal = statsRow.querySelector('.github-stars .stat-value');
            const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
            if (starsSpanVal) starsSpanVal.textContent = '—';
            if (forksSpanVal) forksSpanVal.textContent = '—';
        });
    } else {
        versionBadge.textContent = '—';
    }

    // Downloads aggregation + tooltip (only if modrinth key exists)
    if (hasModrinthKey && downloadsSpan) {
        (async () => {
            let total = 0;
            let anyFound = false;
            const breakdown = { modrinth: null, spigot: null, hangar: null };

            // Modrinth
            const modId = info['modrinth-id'] || info.modrinth;
            const modDownloads = await fetchModrinthDownloadsById(modId);
            if (typeof modDownloads === 'number') { breakdown.modrinth = modDownloads; total += modDownloads; anyFound = true; }

            // Spigot (Spiget)
            if (info.spigot) {
                const spigotId = parseSpigotResourceId(info.spigot);
                if (spigotId) {
                    const spigotDownloads = await fetchSpigetDownloads(spigotId);
                    if (typeof spigotDownloads === 'number') { breakdown.spigot = spigotDownloads; total += spigotDownloads; anyFound = true; }
                }
            }

            // Hangar
            if (info.hangar) {
                const hs = parseHangarOwnerSlug(info.hangar);
                if (hs && hs.owner && hs.slug) {
                    const hangarDownloads = await fetchHangarDownloads(hs.owner, hs.slug);
                    if (typeof hangarDownloads === 'number') { breakdown.hangar = hangarDownloads; total += hangarDownloads; anyFound = true; }
                }
            }

            const dSpan = downloadsSpan.querySelector('.stat-value');
            if (dSpan) dSpan.textContent = anyFound ? total.toLocaleString() : '—';

            // Save breakdown to dataset for tooltip usage
            downloadsSpan.dataset.breakdown = JSON.stringify(breakdown);
            downloadsSpan.title = `Modrinth: ${breakdown.modrinth ?? 'n/a'} • Spigot: ${breakdown.spigot ?? 'n/a'} • Hangar: ${breakdown.hangar ?? 'n/a'}`;

            // attach tooltip events
            downloadsSpan.addEventListener('mouseenter', () => {
                const bd = downloadsSpan.dataset.breakdown ? JSON.parse(downloadsSpan.dataset.breakdown) : null;
                if (!bd) return;
                const lines = [
                    `<strong>Downloads breakdown</strong>`,
                    `Modrinth: ${bd.modrinth !== null ? bd.modrinth.toLocaleString() : 'n/a'}`,
                    `Spigot: ${bd.spigot !== null ? bd.spigot.toLocaleString() : 'n/a'}`,
                    `Hangar: ${bd.hangar !== null ? bd.hangar.toLocaleString() : 'n/a'}`
                ];
                showTooltip(downloadsSpan, lines.map(l => `<div>${l}</div>`).join(''));
            });
            downloadsSpan.addEventListener('mouseleave', hideTooltip);
            downloadsSpan.addEventListener('click', () => {
                const bd = downloadsSpan.dataset.breakdown ? JSON.parse(downloadsSpan.dataset.breakdown) : null;
                if (!bd) return;
                const lines = [
                    `<strong>Downloads breakdown</strong>`,
                    `Modrinth: ${bd.modrinth !== null ? bd.modrinth.toLocaleString() : 'n/a'}`,
                    `Spigot: ${bd.spigot !== null ? bd.spigot.toLocaleString() : 'n/a'}`,
                    `Hangar: ${bd.hangar !== null ? bd.hangar.toLocaleString() : 'n/a'}`
                ];
                showTooltip(downloadsSpan, lines.map(l => `<div>${l}</div>`).join(''));
                setTimeout(hideTooltip, 2600);
            });
        })();
    }

    // Version badge click -> modal
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
        if (!list || list.length === 0) {
            releaseBody.innerHTML = `<div style="color:#ff6b6b">No releases found for <b>${escapeHtml(modalCurrentRepo)}</b>.</div>`;
            updateModalNavButtons();
            return;
        }

        modalReleases = list;
        modalReleaseIndex = 0; // newest first
        renderModalReleaseAt(modalReleaseIndex);
    });
}

// Render a release by index into the modal
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

    releaseBody.innerHTML = `
        <div class="release-title" id="releaseTitle">${escapeHtml(title)}</div>
        <div class="release-meta">${escapeHtml(tag)} ${published ? '• Published ' + escapeHtml(published) : ''}</div>
        <div class="release-body">${marked.parse(body)}</div>
    `;

    updateModalNavButtons();
}

// Update Prev/Next button states
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

// Open/close modal
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
}
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// Escape HTML helper
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Keyboard handlers
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !releaseModal.classList.contains('hidden')) closeModal();
    if (!releaseModal.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') { if (!modalPrev.disabled) modalPrev.click(); }
        else if (e.key === 'ArrowRight') { if (!modalNext.disabled) modalNext.click(); }
    }
    if (e.key === '/' && document.activeElement !== searchBox) {
        e.preventDefault();
        searchBox.focus();
    }
});

// Refresh button: clear cache and reload
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('rotating');
    clearAllZPluginsCache();
    setTimeout(() => { location.reload(); }, 260);
});

// Update logos + card theme
function updateLogos() {
    document.querySelectorAll('.card-logo').forEach(img => {
        const light = img.dataset.light;
        const dark = img.dataset.dark;
        img.src = document.body.classList.contains('light') ? (light || dark) : (dark || light);
    });
    if (banner) {
        const lightB = banner.dataset.light;
        const darkB = banner.dataset.dark;
        banner.src = document.body.classList.contains('light') ? (lightB || darkB) : (darkB || lightB);
    }
    updateCardTheme();
}

// Ensure card backgrounds/colors update reliably by toggling .light-mode on .card-inner
function updateCardTheme() {
    const isLight = document.body.classList.contains('light');
    document.querySelectorAll('.card-inner').forEach(el => {
        if (isLight) el.classList.add('light-mode');
        else el.classList.remove('light-mode');
    });
}

// Load projects list and info.json (preserve order)
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
        }).catch(err => {
            console.error('Error while loading project infos', err);
            folders.forEach((folderName, idx) => renderProject(folderName, { name: folderName, description: '' }, idx));
        });
    }).catch(err => {
        console.error('Could not read projects.json', err);
    });

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Search filtering + highlight
searchBox.addEventListener('input', () => {
    const filter = searchBox.value.trim().toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const nameEl = card.querySelector('.project-name');
        const descEl = card.querySelector('.card-desc');
        const verEl = card.querySelector('.version');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        const desc = descEl ? descEl.textContent.toLowerCase() : '';
        const ver = verEl ? verEl.dataset.version && verEl.dataset.version.toLowerCase() || verEl.textContent.toLowerCase() : '';
        const matches = !filter || name.includes(filter) || desc.includes(filter) || ver.includes(filter);
        if (matches) { card.classList.remove('hidden'); card.style.animation = 'none'; void card.offsetHeight; card.style.animation = ''; }
        else card.classList.add('hidden');

        if (nameEl) {
            const raw = nameEl.textContent;
            if (filter) { const regex = new RegExp(`(${escapeRegExp(filter)})`, 'gi'); nameEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
            else nameEl.textContent = raw;
        }
        if (descEl) {
            const raw = descEl.textContent;
            if (filter) { const regex = new RegExp(`(${escapeRegExp(filter)})`, 'gi'); descEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
            else descEl.textContent = raw;
        }
    });
});
function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Dark mode initialization
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