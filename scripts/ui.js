// ui.js — DOM helpers, logo/theme updates, and card renderer
window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;
    const api = ns.api;

    function showTooltip(target, html){
        hideTooltip();
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'stat-tooltip';
        tooltipEl.innerHTML = html;
        document.body.appendChild(tooltipEl);
        const r = target.getBoundingClientRect();
        const ttRect = tooltipEl.getBoundingClientRect();
        let top = r.top - ttRect.height - 8;
        let left = r.left + (r.width/2) - (ttRect.width/2);
        if(top < 8) top = r.bottom + 8;
        if(left < 8) left = 8;
        if(left + ttRect.width > window.innerWidth - 8) left = window.innerWidth - ttRect.width - 8;
        tooltipEl.style.left = `${left}px`; tooltipEl.style.top = `${top}px`;
        requestAnimationFrame(() => tooltipEl.classList.add('visible'));
        ns._tooltipEl = tooltipEl;
    }
    function hideTooltip(){
        const el = ns._tooltipEl; if(!el) return;
        el.classList.remove('visible');
        const cleanup = () => { try { if(el && el.parentNode) el.parentNode.removeChild(el); } catch(e){} if(ns._tooltipEl === el) ns._tooltipEl = null; };
        el.addEventListener('transitionend', cleanup, { once:true });
        setTimeout(cleanup, 420);
    }

    function setElementSrcFromOptions(el, options){
        if(!el || !Array.isArray(options) || options.length === 0) return;
        const tryIndex = (i) => {
            if(i >= options.length){ el.onerror = null; el.onload = null; return; }
            el.onerror = () => tryIndex(i+1);
            el.onload = () => { el.onerror = null; el.onload = null; };
            try { el.src = options[i]; } catch(e){ tryIndex(i+1); }
        };
        tryIndex(0);
    }

    function updateLogos(){
        document.querySelectorAll('.card-logo').forEach(img => {
            const lightOpts = img.dataset.lightOptions ? JSON.parse(img.dataset.lightOptions) : [];
            const darkOpts = img.dataset.darkOptions ? JSON.parse(img.dataset.darkOptions) : [];
            const opts = document.body.classList.contains('light') ? lightOpts : darkOpts;
            if(opts && opts.length) setElementSrcFromOptions(img, opts);
        });
        const banner = document.getElementById('banner');
        if(banner){
            const lightRaw = banner.dataset.lightOptions || banner.getAttribute('data-light-options');
            const darkRaw = banner.dataset.darkOptions || banner.getAttribute('data-dark-options');
            const lightB = lightRaw ? JSON.parse(lightRaw) : [];
            const darkB = darkRaw ? JSON.parse(darkRaw) : [];
            const opts = document.body.classList.contains('light') ? lightB : darkB;
            if(opts && opts.length) setElementSrcFromOptions(banner, opts);
        }
        updateCardTheme();
    }
    function updateCardTheme(){
        const isLight = document.body.classList.contains('light');
        document.querySelectorAll('.card-inner').forEach(el => {
            if(isLight) el.classList.add('light-mode'); else el.classList.remove('light-mode');
        });
    }

    function setNavButtonState(buttonEl, enabled){
        if(!buttonEl) return;
        if(enabled){ buttonEl.classList.remove('nav-disabled'); buttonEl.setAttribute('aria-disabled','false'); buttonEl.disabled = false; }
        else { buttonEl.classList.add('nav-disabled'); buttonEl.setAttribute('aria-disabled','true'); buttonEl.disabled = true; }
    }

    // renderProject kept as a single helper (it uses many api functions)
    function renderProject(folderName, info, index){
        const container = document.getElementById('projectsContainer');
        const card = document.createElement('div'); card.className = 'card'; card.style.position = 'relative';
        const inner = document.createElement('div'); inner.className = 'card-inner';
        if(document.body.classList.contains('light')) inner.classList.add('light-mode');

        const isOnDev = info && (info.on_dev === true || info['on_dev'] === true);

        const img = document.createElement('img'); img.className = 'card-logo'; img.alt = `${info.name || folderName} logo`;
        const darkCandidates = [`${folderName}/sources/darkmode/logo.svg`, `${folderName}/sources/darkmode/logo.png`];
        const lightCandidates = [`${folderName}/sources/lightmode/logo.svg`, `${folderName}/sources/lightmode/logo.png`];
        img.dataset.darkOptions = JSON.stringify(darkCandidates);
        img.dataset.lightOptions = JSON.stringify(lightCandidates);
        const initialOpts = document.body.classList.contains('light') ? lightCandidates : darkCandidates;
        setElementSrcFromOptions(img, initialOpts);
        inner.appendChild(img);

        const titleRow = document.createElement('h3');
        const titleText = document.createElement('span'); titleText.className = 'project-name'; titleText.textContent = info.name || folderName;
        titleRow.appendChild(titleText);

        const rightGroup = document.createElement('span'); rightGroup.style.display='inline-flex'; rightGroup.style.alignItems='center'; rightGroup.style.gap='6px';
        const versionBadge = document.createElement('span'); versionBadge.className='version badge-link'; versionBadge.dataset.version='';
        if(isOnDev){ versionBadge.textContent='On development'; versionBadge.classList.add('dev-badge'); versionBadge.dataset.version=''; versionBadge.title='This project is in active development'; }
        else { versionBadge.textContent='loading...'; versionBadge.title='Release version'; }
        rightGroup.appendChild(versionBadge);

        const licensePill = document.createElement('span'); licensePill.className='license-pill'; licensePill.style.display='none'; licensePill.setAttribute('aria-hidden','true');
        rightGroup.appendChild(licensePill);

        titleRow.appendChild(rightGroup);
        inner.appendChild(titleRow);

        const hasModrinthKey = (typeof info['modrinth-id'] !== 'undefined' && info['modrinth-id'] !== null && info['modrinth-id'] !== '') || (typeof info.modrinth !== 'undefined' && info.modrinth !== null && info.modrinth !== '');
        const statsRow = document.createElement('div'); statsRow.className='stats-row';

        const starsSpan = document.createElement('span'); starsSpan.className='stat github-stars'; starsSpan.title='Stars';
        starsSpan.innerHTML = `<img src="sources/global/star.svg" alt="Stars" class="stat-icon"> <span class="stat-value">—</span>`;
        statsRow.appendChild(starsSpan);

        const forksSpan = document.createElement('span'); forksSpan.className='stat github-forks'; forksSpan.title='Forks';
        forksSpan.innerHTML = `<img src="sources/global/fork.svg" alt="Forks" class="stat-icon"> <span class="stat-value">—</span>`;
        statsRow.appendChild(forksSpan);

        let downloadsSpan = null;
        if(hasModrinthKey){
            downloadsSpan = document.createElement('span'); downloadsSpan.className='stat modrinth-downloads'; downloadsSpan.title='Downloads (aggregated)';
            downloadsSpan.innerHTML = `<img src="sources/global/download.svg" alt="Downloads" class="stat-icon"> <span class="stat-value">—</span>`;
            statsRow.appendChild(downloadsSpan);
        }
        inner.appendChild(statsRow);

        const desc = document.createElement('p'); desc.className='card-desc'; desc.textContent = info.description || '';
        inner.appendChild(desc);

        const infoBtn = document.createElement('button'); infoBtn.className='check-info'; infoBtn.type='button'; infoBtn.setAttribute('aria-label','Last checked info');
        infoBtn.innerHTML = `<span class="dot" aria-hidden="true"></span>`;
        function showInfoTooltip(){
            const ghTs = infoBtn.dataset.ghChecked ? parseInt(infoBtn.dataset.ghChecked,10) : null;
            const dlTs = infoBtn.dataset.dlChecked ? parseInt(infoBtn.dataset.dlChecked,10) : null;
            const ghStr = ghTs ? `GH stats: ${u.timeAgo(ghTs)}` : 'GH stats: not checked';
            const dlStr = dlTs ? `Downloads: ${u.timeAgo(dlTs)}` : 'Downloads: not checked';
            showTooltip(infoBtn, `<div style="font-weight:700">Last checked</div><div style="margin-top:6px">${u.escapeHtml(ghStr)}<br>${u.escapeHtml(dlStr)}</div>`);
        }
        infoBtn.addEventListener('mouseenter', showInfoTooltip);
        infoBtn.addEventListener('focus', showInfoTooltip);
        infoBtn.addEventListener('mouseleave', hideTooltip);
        infoBtn.addEventListener('blur', hideTooltip);

        inner.appendChild(infoBtn);

        const btns = document.createElement('div'); btns.className='btns';
        const ON_DEV_CLICKABLE = new Set(['github','jenkins','javadocs','wiki']);
        function addBtn(href, label, opts = {}){
            if(!href) return;
            const isGhost = opts.ghost !== false;
            const btnType = opts.btnClass || (label.toLowerCase().includes('javadoc') ? 'javadocs' : label.toLowerCase());
            const isAllowedWhileDev = ON_DEV_CLICKABLE.has(btnType);
            if(isOnDev && !isAllowedWhileDev){
                const a = document.createElement('a'); a.className = 'btn' + (isGhost ? ' ghost' : ' primary'); a.classList.add('dev-disabled');
                if(opts.btnClass) a.classList.add(opts.btnClass);
                a.setAttribute('aria-disabled','true'); a.setAttribute('role','button'); a.tabIndex = 0; a.title = `${label} (disabled while project is in development)`;
                if(opts.iconSrc){
                    const iconImg = document.createElement('img'); iconImg.className='btn-icon'; if(opts.iconClass) iconImg.classList.add(opts.iconClass); iconImg.src = opts.iconSrc; iconImg.alt = `${label} icon`; a.appendChild(iconImg);
                } else if(opts.iconText){
                    const iconSpan = document.createElement('span'); iconSpan.className='btn-icon-text'; iconSpan.textContent = opts.iconText; a.appendChild(iconSpan);
                }
                const span = document.createElement('span'); span.textContent = label; a.appendChild(span);
                const tooltipHtml = `<div><strong>${label}</strong></div><div>Disabled while project is in active development.</div>`;
                a.addEventListener('mouseenter', () => showTooltip(a, tooltipHtml)); a.addEventListener('mouseleave', hideTooltip);
                a.addEventListener('focus', () => showTooltip(a, tooltipHtml)); a.addEventListener('blur', hideTooltip);
                a.addEventListener('click', (e) => { e.preventDefault(); showTooltip(a, tooltipHtml); setTimeout(hideTooltip, 1800); });
                a.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); showTooltip(a, tooltipHtml); setTimeout(hideTooltip, 1800); } });
                btns.appendChild(a); return;
            }
            const a = document.createElement('a'); a.className = 'btn' + (isGhost ? ' ghost' : ' primary'); if(opts.btnClass) a.classList.add(opts.btnClass);
            a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.title = label;
            if(opts.iconSrc){ const iconImg = document.createElement('img'); iconImg.className='btn-icon'; if(opts.iconClass) iconImg.classList.add(opts.iconClass); iconImg.src = opts.iconSrc; iconImg.alt = `${label} icon`; a.appendChild(iconImg); }
            else if(opts.iconText){ const iconSpan = document.createElement('span'); iconSpan.className='btn-icon-text'; iconSpan.textContent = opts.iconText; a.appendChild(iconSpan); }
            const span = document.createElement('span'); span.textContent = label; a.appendChild(span);
            btns.appendChild(a);
        }

        addBtn(info.modrinth, 'Modrinth', { iconSrc: 'sources/global/modrinth.svg', btnClass: 'modrinth' });
        addBtn(info.spigot, 'Spigot', { iconSrc: 'sources/global/spigot.png', btnClass: 'spigot' });
        addBtn(info.hangar, 'Hangar', { iconSrc: 'sources/global/hangar.svg', btnClass: 'hangar' });
        addBtn(info.wiki, 'Wiki', { iconSrc: 'sources/global/wiki.svg', btnClass: 'wiki' });
        addBtn(info.url, 'GitHub', { iconSrc: 'sources/global/github.svg', btnClass: 'github' });
        addBtn(info.jenkins, 'Jenkins', { iconSrc: 'sources/global/jenkins.svg', btnClass: 'jenkins' });
        if(info['bstats-id']){
            const id = info['bstats-id'];
            if(id !== "" && id !== null){
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

        if(Array.isArray(info.platforms) && info.platforms.length > 0){
            const platformToggle = document.createElement('button'); platformToggle.className='platform-toggle'; platformToggle.title='Show platform compatibility'; platformToggle.type='button'; platformToggle.setAttribute('aria-expanded','false');
            platformToggle.innerHTML = `<img class="platform-icon" src="sources/global/compatibility.svg" alt="Compatibility" />`;
            card.appendChild(platformToggle);
            platformToggle.addEventListener('click', (e) => { e.stopPropagation(); const expanded = platformToggle.getAttribute('aria-expanded') === 'true'; if(expanded) ns.popovers.hidePlatformPopover(); else ns.popovers.showPlatformPopover(platformToggle, info.platforms, { name: info.name || folderName }); });
        }

        const contribToggle = document.createElement('button'); contribToggle.className='contrib-toggle'; contribToggle.title='Show contributors & activity'; contribToggle.type='button'; contribToggle.setAttribute('aria-expanded','false');
        contribToggle.innerHTML = `<span class="contrib-icon" aria-hidden="true">👥</span>`;
        card.appendChild(contribToggle);

        setTimeout(() => card.classList.add('show'), index * 120);

        // version + license + GH stats
        if(!isOnDev && info.url){
            (async () => {
                const repo = u.parseGitHubRepo(info.url);
                if(!repo){ versionBadge.textContent = 'n/a'; return; }
                const cachedReleases = u.getCached(`gh:releases:${repo.owner}/${repo.repo}`);
                if(cachedReleases && Array.isArray(cachedReleases) && cachedReleases.length){
                    const v = cachedReleases[0].tag_name || cachedReleases[0].name || null;
                    versionBadge.textContent = v ? `v${v.replace(/^v/i,'')}` : 'n/a';
                    if(v) versionBadge.dataset.version = v;
                    return;
                }
                try {
                    const latest = await api.fetchLatestReleaseObject(info.url);
                    const v = latest ? (latest.tag_name || latest.name || null) : null;
                    versionBadge.textContent = v ? `v${v.replace(/^v/i,'')}` : 'n/a';
                    if(v) versionBadge.dataset.version = v;
                } catch(err){ console.warn('Could not load latest release for', info.url, err); versionBadge.textContent = 'n/a'; }
            })();
        } else if(!info.url && !isOnDev) versionBadge.textContent = '—';

        if(info.url){
            (async () => {
                const lic = await api.fetchGitHubLicense(info.url);
                if(lic && typeof lic === 'string'){ licensePill.style.display='inline-block'; licensePill.textContent = lic; licensePill.title = `License: ${lic}`; }
                else if(lic && lic.__error === 'rate_limit'){ licensePill.style.display='inline-block'; licensePill.textContent = 'license?'; licensePill.title = 'License lookup rate limited'; }
            })();
        }

        // GH stats
        const ghStatusSpan = u.createStatusSpan(statsRow);
        async function loadGHStats(){
            u.setStatusLoading(ghStatusSpan, 'loading GH stats…');
            if(!info.url){ u.setStatusError(ghStatusSpan, 'no repo'); return; }
            try {
                const repo = u.parseGitHubRepo(info.url);
                if(!repo){ u.setStatusError(ghStatusSpan, 'invalid repo'); return; }
                const cacheKey = `gh:stats:${repo.owner}/${repo.repo}`;
                const result = await api.fetchGitHubStats(info.url);
                if(result && result.__error === 'rate_limit'){
                    u.setStatusRateLimited(ghStatusSpan, result.__reset, () => loadGHStats());
                    const starsSpanVal = statsRow.querySelector('.github-stars .stat-value'); const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
                    if(starsSpanVal) starsSpanVal.textContent = '—'; if(forksSpanVal) forksSpanVal.textContent = '—';
                    const cachedMeta = u.getCachedMeta(cacheKey); if(cachedMeta && cachedMeta.ts) infoBtn.dataset.ghChecked = cachedMeta.ts;
                    return;
                } else if(result && result.__error){
                    u.setStatusError(ghStatusSpan, 'failed', () => loadGHStats());
                    const starsSpanVal = statsRow.querySelector('.github-stars .stat-value'); const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
                    if(starsSpanVal) starsSpanVal.textContent = '—'; if(forksSpanVal) forksSpanVal.textContent = '—';
                    return;
                }
                const starsSpanVal = statsRow.querySelector('.github-stars .stat-value'); const forksSpanVal = statsRow.querySelector('.github-forks .stat-value');
                if(starsSpanVal) starsSpanVal.textContent = (typeof result.stars === 'number') ? result.stars.toLocaleString() : '—';
                if(forksSpanVal) forksSpanVal.textContent = (typeof result.forks === 'number') ? result.forks.toLocaleString() : '—';
                ghStatusSpan.parentNode && ghStatusSpan.parentNode.removeChild(ghStatusSpan);
                const cachedMeta = u.getCachedMeta(cacheKey);
                if(cachedMeta && cachedMeta.ts) infoBtn.dataset.ghChecked = cachedMeta.ts; else infoBtn.dataset.ghChecked = Date.now();

                starsSpan.dataset.repo = `${repo.owner}/${repo.repo}`;
                starsSpan.addEventListener('mouseenter', async () => {
                    showTooltip(starsSpan, `<div>Loading stars timeline…</div>`);
                    const series = await api.fetchStargazerSeries(`https://github.com/${starsSpan.dataset.repo}`, 6).catch(()=>null);
                    if(!series){ hideTooltip(); showTooltip(starsSpan, `<div>Stars: ${u.escapeHtml((result.stars || '—').toString())}</div><div style="opacity:0.8;font-size:12px">Timeline unavailable</div>`); setTimeout(hideTooltip, 2600); return; }
                    const spark = u.buildSparkline(series, 200, 36, '#ffd89b');
                    hideTooltip(); showTooltip(starsSpan, `<div style="font-weight:700">Stars — recent months</div><div style="margin-top:6px">${spark}</div>`);
                });
                starsSpan.addEventListener('mouseleave', hideTooltip);

            } catch(err){ console.warn('Error retrieving GH stats for', info.url, err); u.setStatusError(ghStatusSpan, 'error', () => loadGHStats()); }
        }
        loadGHStats();

        // Downloads aggregation
        if(hasModrinthKey && downloadsSpan){
            const dlStatusSpan = u.createStatusSpan(statsRow);
            async function loadDownloads(){
                u.setStatusLoading(dlStatusSpan, 'loading downloads…');
                let total = 0; let anyFound = false; const breakdown = { modrinth:null, spigot:null, hangar:null };
                const modId = info['modrinth-id'] || info.modrinth;
                const modDownloads = await api.fetchModrinthDownloadsById(modId);
                if(typeof modDownloads === 'number'){ breakdown.modrinth = modDownloads; total += modDownloads; anyFound = true; }
                if(info.spigot){
                    const spigotId = u.parseSpigotResourceId(info.spigot);
                    if(spigotId){
                        const spigotDownloads = await api.fetchSpigetDownloads(spigotId);
                        if(typeof spigotDownloads === 'number'){ breakdown.spigot = spigotDownloads; total += spigotDownloads; anyFound = true; }
                    }
                }
                if(info.hangar){
                    const hs = u.parseHangarOwnerSlug(info.hangar);
                    if(hs && hs.owner && hs.slug){
                        const hangarDownloads = await api.fetchHangarDownloads(hs.owner, hs.slug);
                        if(typeof hangarDownloads === 'number'){ breakdown.hangar = hangarDownloads; total += hangarDownloads; anyFound = true; }
                    }
                }
                const dSpan = downloadsSpan.querySelector('.stat-value'); if(dSpan) dSpan.textContent = anyFound ? total.toLocaleString() : '—';
                downloadsSpan.dataset.breakdown = JSON.stringify(breakdown);
                downloadsSpan.title = `Modrinth: ${breakdown.modrinth ?? 'n/a'} • Spigot: ${breakdown.spigot ?? 'n/a'} • Hangar: ${breakdown.hangar ?? 'n/a'}`;

                downloadsSpan.addEventListener('mouseenter', async () => {
                    const bd = downloadsSpan.dataset.breakdown ? JSON.parse(downloadsSpan.dataset.breakdown) : null;
                    const lines = [
                        'Downloads breakdown',
                        `Modrinth: ${bd && bd.modrinth !== null ? bd.modrinth.toLocaleString() : 'n/a'}`,
                        `Spigot: ${bd && bd.spigot !== null ? bd.spigot.toLocaleString() : 'n/a'}`,
                        `Hangar: ${bd && bd.hangar !== null ? bd.hangar.toLocaleString() : 'n/a'}`
                    ];
                    const html = `<div style="font-weight:700">Downloads</div><div style="margin-top:6px">${lines.map(l => u.escapeHtml(l)).join('<br>')}</div>`;
                    showTooltip(downloadsSpan, html);
                });
                downloadsSpan.addEventListener('mouseleave', hideTooltip);

                if(dlStatusSpan && dlStatusSpan.parentNode) dlStatusSpan.parentNode.removeChild(dlStatusSpan);
                const cacheKey = `modrinth:downloads:${modId}`;
                const cachedMeta = u.getCachedMeta(cacheKey);
                if(cachedMeta && cachedMeta.ts) infoBtn.dataset.dlChecked = cachedMeta.ts; else infoBtn.dataset.dlChecked = Date.now();
            }
            loadDownloads();
        }

        // version badge click -> modal
        if(!isOnDev){
            versionBadge.style.cursor = 'pointer';
            versionBadge.addEventListener('click', async () => {
                if(!info.url) return;
                const repo = u.parseGitHubRepo(info.url);
                if(!repo) return;
                ns.modal.openModal();
                ns.modal.releaseBody.innerHTML = `<div style="opacity:0.75">Loading release notes…</div>`;
                ns.modal.modalCurrentRepo = `${repo.owner}/${repo.repo}`;
                ns.modal.modalReleases = []; ns.modal.modalReleaseIndex = 0;
                const list = await api.fetchReleasesList(info.url);
                if(!list || (list && list.__error)){
                    if(list && list.__error === 'rate_limit'){ ns.modal.releaseBody.innerHTML = `<div style="color:#ffd89b">GitHub API rate limited. Please try again later or use the refresh button.</div>`; }
                    else { ns.modal.releaseBody.innerHTML = `<div style="color:#ff6b6b">No releases found for <b>${u.escapeHtml(ns.modal.modalCurrentRepo)}</b>.</div>`; }
                    ns.modal.updateModalNavButtons();
                    return;
                }
                ns.modal.modalReleases = list;
                ns.modal.modalReleaseIndex = 0;
                const activeRel = ns.modal.modalReleases[ns.modal.modalReleaseIndex];
                const activeTag = activeRel ? (activeRel.tag_name || activeRel.name || '') : '';
                if(activeTag){ const encoded = encodeURIComponent(activeTag); const newPath = `${location.pathname}${location.search}#release:${ns.modal.modalCurrentRepo}:${encoded}`; history.replaceState(null,'',newPath); }
                ns.modal.renderModalReleaseAt(ns.modal.modalReleaseIndex);
            });
        } else {
            versionBadge.style.cursor = 'default';
            const vHtml = `<div><strong>In development</strong></div><div>This project is currently under active development — no release badge shown.</div>`;
            versionBadge.addEventListener('mouseenter', () => showTooltip(versionBadge, vHtml));
            versionBadge.addEventListener('mouseleave', hideTooltip);
        }

        contribToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if(!info.url){ showTooltip(contribToggle, `<div><strong>No repository</strong></div><div>Contributors unavailable</div>`); setTimeout(hideTooltip, 1400); return; }
            const repoUrl = info.url;
            const expanded = contribToggle.getAttribute('aria-expanded') === 'true';
            if(expanded) ns.popovers.hideContribPopover(); else ns.popovers.showContribPopover(contribToggle, repoUrl, { name: info.name || folderName });
        });
    }

    ns.ui = { showTooltip, hideTooltip, setElementSrcFromOptions, updateLogos, updateCardTheme, setNavButtonState, renderProject };
})(window.zp);