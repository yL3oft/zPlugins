// popovers.js — contributor & platform popovers
window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;
    const api = ns.api;
    let currentContribPopover = null;
    let currentPlatformPopover = null;

    function hideContribPopover(){
        if(!currentContribPopover) return;
        try { currentContribPopover.el.parentNode.removeChild(currentContribPopover.el); } catch(e){}
        if(currentContribPopover.button) currentContribPopover.button.setAttribute('aria-expanded','false');
        currentContribPopover = null;
        document.removeEventListener('click', handleDocClickForPopover);
        window.removeEventListener('scroll', hideContribPopover, true);
        window.removeEventListener('resize', hideContribPopover);
    }
    function handleDocClickForPopover(evt){
        if(!currentContribPopover) return;
        const root = currentContribPopover.el;
        if(!root.contains(evt.target) && evt.target !== currentContribPopover.button) hideContribPopover();
    }
    async function showContribPopover(buttonEl, repoUrl, opts = {}){
        hideContribPopover();
        buttonEl.setAttribute('aria-expanded','true');
        const popup = document.createElement('div'); popup.className = 'contrib-popover'; popup.setAttribute('role','dialog'); popup.setAttribute('aria-label', `Contributors for ${opts.name || repoUrl}`);
        popup.innerHTML = `<div class="contrib-popover-inner">
            <div class="contrib-popover-header">
                <strong>${u.escapeHtml(opts.name || repoUrl)}</strong>
                <button class="contrib-popover-close" title="Close" aria-label="Close">✕</button>
            </div>
            <div class="contrib-popover-body">
                <div class="contrib-loading">Loading contributors & activity…</div>
            </div>
        </div>`;
        document.body.appendChild(popup);
        const r = buttonEl.getBoundingClientRect();
        const pw = 340, ph = 160;
        let left = r.right - pw; let top = r.bottom + 8;
        if(left < 8) left = 8; if(left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
        if(top + ph > window.innerHeight - 8) top = r.top - ph - 8;
        popup.style.left = `${left}px`; popup.style.top = `${top}px`;

        currentContribPopover = { el: popup, button: buttonEl };
        popup.querySelector('.contrib-popover-close').addEventListener('click', () => hideContribPopover());
        setTimeout(() => document.addEventListener('click', handleDocClickForPopover), 20);
        window.addEventListener('scroll', hideContribPopover, true);
        window.addEventListener('resize', hideContribPopover);

        const body = popup.querySelector('.contrib-popover-body');
        body.innerHTML = `<div class="contrib-loading">Loading contributors & activity…</div>`;

        let contribs = await api.fetchContributors(repoUrl, 12).catch(()=>null);
        let activity = await api.fetchCommitActivity(repoUrl).catch(()=>null);

        if(contribs && contribs.__error === 'rate_limit'){
            body.innerHTML = `<div style="color:#ffd89b">GitHub API rate limited. Try again later or press Retry.</div><div style="margin-top:8px;"><button class="fetch-retry">Retry</button></div>`;
            body.querySelector('.fetch-retry').addEventListener('click', async () => {
                body.innerHTML = `<div class="contrib-loading">Retrying…</div>`;
                const reContribs = await api.fetchContributors(repoUrl, 12).catch(()=>null);
                if(reContribs && !reContribs.__error){ contribs = reContribs; } else { body.innerHTML = `<div style="color:#ffd89b">Still rate limited — try later.</div>`; return; }
            });
            return;
        }

        if((!activity || !Array.isArray(activity) || activity.length === 0) || (activity && activity.__error)){
            const fallback = await api.computeActivityFromCommits(repoUrl, 12).catch(()=>null);
            if(Array.isArray(fallback)) activity = fallback.map(n => ({ total: n }));
        }

        const contribHtml = (contribs && contribs.length && !contribs.__error) ? contribs.slice(0,8).map(c => {
            return `<a class="contrib-avatar" href="${u.escapeHtml(c.html_url)}" target="_blank" rel="noopener" title="${u.escapeHtml(c.login)} — ${c.contributions} commits"><img src="${u.escapeHtml(c.avatar)}" alt="${u.escapeHtml(c.login)}" /></a>`;
        }).join('') : `<div class="ins-no-contrib">No contributors data</div>`;

        let sparkHtml = `<div class="ins-activity-placeholder">No activity</div>`;
        if(Array.isArray(activity) && activity.length){
            let last;
            if(typeof activity[0] === 'number') last = activity.slice(-12);
            else last = activity.slice(-12).map(w => w.total || 0);
            sparkHtml = `<div class="ins-activity-spark">${u.buildSparkline(last, 220, 36)}</div>`;
        }

        body.innerHTML = `
            <div class="contrib-row">
                <div class="contrib-avatars">${contribHtml}</div>
                <div class="contrib-activity">${sparkHtml}</div>
            </div>
            <div class="contrib-meta"><small>Click avatar to view profile. Activity shows commits/week (≈last 12w).</small></div>
        `;
    }

    // Platform popover
    function hidePlatformPopover(){
        if(!currentPlatformPopover) return;
        try { currentPlatformPopover.el.parentNode.removeChild(currentPlatformPopover.el); } catch(e){}
        if(currentPlatformPopover.button) currentPlatformPopover.button.setAttribute('aria-expanded','false');
        currentPlatformPopover = null;
        document.removeEventListener('click', handleDocClickForPlatformPopover);
        window.removeEventListener('scroll', hidePlatformPopover, true);
        window.removeEventListener('resize', hidePlatformPopover);
    }
    function handleDocClickForPlatformPopover(evt){
        if(!currentPlatformPopover) return;
        const root = currentPlatformPopover.el;
        if(!root.contains(evt.target) && evt.target !== currentPlatformPopover.button) hidePlatformPopover();
    }
    function normalizePlatformEntry(entry){
        if(!entry) return null;
        const logos = Array.isArray(entry.logos) ? entry.logos.slice() : (entry.logo ? [entry.logo] : []);
        const versions = Array.isArray(entry.versions) ? entry.versions.slice() : [];
        return { logos, versions };
    }
    function buildPlatformsHTML(platforms){
        if(!Array.isArray(platforms) || platforms.length === 0) return '<div class="ins-no-contrib">No platforms provided</div>';
        return platforms.map(pRaw => {
            const p = normalizePlatformEntry(pRaw); if(!p) return '';
            const logosHtml = (p.logos && p.logos.length) ? p.logos.map(src => `<img class="platform-logo" src="${u.escapeHtml(src)}" alt="platform logo">`).join('') : '';
            const versionsHtml = (p.versions && p.versions.length) ? p.versions.map(v => `<span class="platform-version-pill">${u.escapeHtml(v)}</span>`).join('') : '';
            return `<div class="platform-row"><div class="platform-logos" aria-hidden="true">${logosHtml}</div><div class="platform-versions">${versionsHtml}</div></div>`;
        }).join('');
    }
    function showPlatformPopover(buttonEl, platforms, opts = {}){
        hideContribPopover(); hidePlatformPopover();
        buttonEl.setAttribute('aria-expanded','true');
        const popup = document.createElement('div'); popup.className='platform-popover'; popup.setAttribute('role','dialog'); popup.setAttribute('aria-label', `Platform compatibility for ${opts.name || ''}`);
        popup.innerHTML = `<div class="platform-popover-inner">
            <div class="platform-popover-header">
                <strong>${u.escapeHtml(opts.name || '')}</strong>
                <button class="platform-popover-close" title="Close" aria-label="Close">✕</button>
            </div>
            <div class="platform-popover-body">
                <div class="platform-loading">Loading platforms…</div>
            </div>
        </div>`;
        document.body.appendChild(popup);
        const r = buttonEl.getBoundingClientRect(); const pw = 360, ph = 180;
        let left = r.left, top = r.bottom + 8;
        if(left < 8) left = 8; if(left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
        if(top + ph > window.innerHeight - 8) top = r.top - ph - 8;
        popup.style.left = `${left}px`; popup.style.top = `${top}px`;
        currentPlatformPopover = { el: popup, button: buttonEl };
        popup.querySelector('.platform-popover-close').addEventListener('click', () => hidePlatformPopover());
        setTimeout(() => document.addEventListener('click', handleDocClickForPlatformPopover), 20);
        window.addEventListener('scroll', hidePlatformPopover, true);
        window.addEventListener('resize', hidePlatformPopover);
        const body = popup.querySelector('.platform-popover-body'); body.innerHTML = buildPlatformsHTML(platforms);
    }

    ns.popovers = { showContribPopover, hideContribPopover, showPlatformPopover, hidePlatformPopover };
})(window.zp);