// utils.js — utility helpers and cache
window.zp = window.zp || {};
(function(ns){
    const CACHE_PREFIX = 'zplugins:cache:';
    ns.TTL = {
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

    function setCached(key, value, ttlSeconds){
        try {
            const payload = { ts: Date.now(), ttl: (ttlSeconds||0)*1000, v: value };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
        } catch(e){ console.warn('Could not write cache', e); }
    }
    function getCached(key){
        try {
            const raw = localStorage.getItem(CACHE_PREFIX + key);
            if(!raw) return null;
            const payload = JSON.parse(raw);
            if(!payload || !payload.ts) return null;
            if(payload.ttl && (Date.now() - payload.ts > payload.ttl)){ localStorage.removeItem(CACHE_PREFIX + key); return null; }
            return payload.v;
        } catch(e){ console.warn('Could not read cache', e); return null; }
    }
    function getCachedMeta(key){
        try {
            const raw = localStorage.getItem(CACHE_PREFIX + key);
            if(!raw) return null;
            const payload = JSON.parse(raw);
            if(!payload || !payload.ts) return null;
            if(payload.ttl && (Date.now() - payload.ts > payload.ttl)){ localStorage.removeItem(CACHE_PREFIX + key); return null; }
            return payload;
        } catch(e){ return null; }
    }
    function clearAllZPluginsCache(){
        try {
            Object.keys(localStorage).forEach(k => { if(k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k); });
        } catch(e){ console.warn('Could not clear cache', e); }
    }

    async function safeFetchJson(url, options = {}){
        try {
            const res = await fetch(url, options);
            if(res.status === 403){
                const resetRaw = res.headers ? (res.headers.get('x-ratelimit-reset') || res.headers.get('x-rate-limit-reset')) : null;
                const remaining = res.headers ? (res.headers.get('x-ratelimit-remaining') || res.headers.get('x-rate-limit-remaining')) : null;
                const reset = resetRaw ? parseInt(resetRaw,10) : null;
                return { ok:false, status:403, reason:'rate_limit', reset, remaining };
            }
            if(!res.ok) return { ok:false, status:res.status, reason:'http' };
            const j = await res.json();
            return { ok:true, status:res.status, data:j, headers:res.headers };
        } catch (err) {
            return { ok:false, reason:'network', error:err };
        }
    }

    function escapeHtml(str){
        return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function escapeRegExp(s){ return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function formatBytes(n){
        if(n===null||typeof n==='undefined') return '';
        if(n < 1024) return `${n} B`;
        if(n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
        if(n < 1024*1024*1024) return `${(n/(1024*1024)).toFixed(1)} MB`;
        return `${(n/(1024*1024*1024)).toFixed(2)} GB`;
    }
    function timeAgo(tsMs){
        if(!tsMs) return 'never';
        const now = Date.now(); const diff = Math.max(0, now - tsMs);
        const s = Math.floor(diff/1000); if(s<60) return `${s}s ago`;
        const m = Math.floor(s/60); if(m<60) return `${m}m ago`;
        const h = Math.floor(m/60); if(h<24) return `${h}h ago`;
        const d = Math.floor(h/24); return `${d}d ago`;
    }
    function buildSparkline(values, width = 120, height = 28, color = '#4ea3ff'){
        if(!values || !values.length) return '';
        const max = Math.max(...values) || 1;
        const step = (values.length === 1) ? width : width / (values.length - 1);
        let path = '';
        values.forEach((v,i) => {
            const x = i*step;
            const y = height - (v/max)*(height-4) - 2;
            path += (i===0 ? 'M':'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
        });
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline" aria-hidden="true"><path d="${path.trim()}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
    }

    function parseGitHubRepo(url){
        try { if(!url || typeof url !== 'string') return null;
            const trimmed = url.trim();
            const m = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/i);
            if(m) return { owner: m[1], repo: m[2].replace(/\/$/,'') };
        } catch(e){}
        return null;
    }

    function parseSpigotResourceId(url){
        try { if(!url) return null;
            let m = url.match(/resources\/(?:[^\/]+?\.)?(\d+)(?:\/|$)/i); if(m) return m[1];
            m = url.match(/resources\/(\d+)(?:\/|$)/i); if(m) return m[1];
        } catch(e){}
        return null;
    }
    function parseHangarOwnerSlug(url){
        try { if(!url) return null;
            let m = url.match(/hangar(?:\.[^\/]+)?\/project\/([^\/]+)\/([^\/\/#?]+)/i); if(m) return { owner:m[1], slug:m[2] };
            m = url.match(/hangar(?:\.[^\/]+)?\/projects\/([^\/]+)\/([^\/\/#?]+)/i); if(m) return { owner:m[1], slug:m[2] };
        } catch(e){}
        return null;
    }

    // status helpers for UI (created DOM nodes)
    function createStatusSpan(parent){
        const span = document.createElement('span'); span.className = 'fetch-status';
        span.innerHTML = `<span class="spinner" aria-hidden="true"></span><span class="msg">loading…</span>`;
        parent.appendChild(span);
        return span;
    }
    function setStatusLoading(span, text='loading…'){ if(!span) return; span.className='fetch-status'; span.innerHTML=`<span class="spinner" aria-hidden="true"></span><span class="msg">${escapeHtml(text)}</span>`; }
    function setStatusError(span, text='failed', retryCb){
        if(!span) return; span.className='fetch-status error'; span.innerHTML = `<span class="msg">${escapeHtml(text)}</span>`;
        if(retryCb){ const btn = document.createElement('button'); btn.className='fetch-retry'; btn.textContent='Retry'; btn.addEventListener('click', retryCb); span.appendChild(btn); }
    }
    function setStatusRateLimited(span, resetTs, retryCb){
        if(!span) return; span.className='fetch-status rate';
        let msg = 'rate limited';
        if(resetTs){ const when = new Date(resetTs * 1000); msg = `rate limited — reset ${when.toLocaleTimeString()}`; }
        span.innerHTML = `<span class="msg">${escapeHtml(msg)}</span>`;
        if(retryCb){ const btn = document.createElement('button'); btn.className='fetch-retry'; btn.textContent='Retry'; btn.addEventListener('click', retryCb); span.appendChild(btn); }
    }

    ns.utils = {
        setCached, getCached, getCachedMeta, clearAllZPluginsCache,
        safeFetchJson, escapeHtml, escapeRegExp, formatBytes, timeAgo, buildSparkline,
        parseGitHubRepo, parseSpigotResourceId, parseHangarOwnerSlug,
        createStatusSpan, setStatusLoading, setStatusError, setStatusRateLimited
    };
})(window.zp);