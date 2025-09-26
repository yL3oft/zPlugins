// github-api.js — all network / GitHub and third-party API related functions
window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;
    async function fetchGitHubStats(githubUrl){
        const repo = u.parseGitHubRepo(githubUrl);
        if(!repo) return { stars:null, forks:null };
        const cacheKey = `gh:stats:${repo.owner}/${repo.repo}`;
        const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){
                const obj = { stars:null, forks:null, __error:'rate_limit', __reset: res.reset || null };
                const ttl = res.reset ? Math.max(30, Math.min(3600, Math.ceil((res.reset*1000 - Date.now())/1000))) : 60;
                u.setCached(cacheKey, obj, ttl);
                return obj;
            } else {
                const obj = { stars:null, forks:null, __error: res.reason || 'unknown' };
                u.setCached(cacheKey, obj, 30);
                return obj;
            }
        }
        const data = res.data;
        const result = { stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null, forks: typeof data.forks_count === 'number' ? data.forks_count : null };
        u.setCached(cacheKey, result, ns.TTL.GH_STATS);
        return result;
    }

    async function fetchGitHubLicense(githubUrl){
        const repo = u.parseGitHubRepo(githubUrl);
        if(!repo) return null;
        const cacheKey = `gh:license:${repo.owner}/${repo.repo}`;
        const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/license`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){ const obj = { __error:'rate_limit', __reset: res.reset || null }; u.setCached(cacheKey, obj, res.reset ? Math.max(30, Math.ceil((res.reset*1000 - Date.now())/1000)) : 60); return obj; }
            else { const obj = { __error: res.reason || 'http' }; u.setCached(cacheKey, obj, 60); return obj; }
        }
        const data = res.data;
        const licenseName = (data && data.license && (data.license.spdx_id || data.license.name)) ? (data.license.spdx_id || data.license.name) : (data.name || null);
        if(licenseName) u.setCached(cacheKey, licenseName, ns.TTL.GH_LICENSE);
        return licenseName;
    }

    async function fetchReleasesList(githubUrl){
        const repo = u.parseGitHubRepo(githubUrl);
        if(!repo) return null;
        const cacheKey = `gh:releases:${repo.owner}/${repo.repo}`;
        const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases?per_page=100`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){ const obj={__error:'rate_limit',__reset:res.reset||null}; u.setCached(cacheKey,obj,res.reset?Math.max(30,Math.ceil((res.reset*1000-Date.now())/1000)):60); return obj; }
            else { const obj={__error:res.reason||'http', status: res.status||null}; u.setCached(cacheKey,obj,60); return obj; }
        }
        const list = res.data;
        if(!Array.isArray(list)) return null;
        const slim = list.map(r => ({
            id: r.id,
            tag_name: r.tag_name,
            name: r.name,
            published_at: r.published_at,
            body: r.body || '',
            draft: !!r.draft,
            prerelease: !!r.prerelease,
            assets: Array.isArray(r.assets) ? r.assets.map(a => ({ id: a.id, name: a.name, url: a.browser_download_url || a.url || null, size: a.size, downloads: typeof a.download_count === 'number' ? a.download_count : null })) : []
        }));
        u.setCached(cacheKey, slim, ns.TTL.GH_RELEASES);
        return slim;
    }

    async function fetchLatestReleaseObject(githubUrl){
        const repo = u.parseGitHubRepo(githubUrl);
        if(!repo) return null;
        const cacheKey = `gh:releases:${repo.owner}/${repo.repo}`;
        const cached = u.getCached(cacheKey);
        if(cached && Array.isArray(cached) && cached.length) return cached[0];
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`);
        if(res.ok && res.data) return res.data;
        const list = await fetchReleasesList(githubUrl);
        if(list && Array.isArray(list) && list.length) return list[0];
        return null;
    }

    async function fetchModrinthDownloadsById(modrinthId){
        if(!modrinthId) return null;
        const cacheKey = `modrinth:downloads:${modrinthId}`;
        const cached = u.getCached(cacheKey);
        if(cached !== null && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.modrinth.com/v2/project/${encodeURIComponent(modrinthId)}`);
        if(!res.ok){ u.setCached(cacheKey, { __error: res.reason || 'error' }, 60); return null; }
        const data = res.data;
        const downloads = typeof data.downloads === 'number' ? data.downloads : (data.downloadCount || null);
        if(typeof downloads === 'number') u.setCached(cacheKey, downloads, ns.TTL.MODRINTH);
        return downloads;
    }

    // Updated: use the Spiget resource endpoint which contains "downloads"
    async function fetchSpigetDownloads(resourceId){
        if(!resourceId) return null;
        const cacheKey = `spiget:downloads:${resourceId}`;
        const cached = u.getCached(cacheKey);
        if(cached !== null && !(cached && cached.__error)) return cached;
        try {
            // Use the resource object endpoint; it includes a "downloads" field.
            const res = await u.safeFetchJson(`https://api.spiget.org/v2/resources/${encodeURIComponent(resourceId)}`);
            if(!res.ok){
                u.setCached(cacheKey, { __error: res.reason || 'error' }, 60);
                return null;
            }
            const data = res.data;
            // Some endpoints use different names; prefer numeric downloads
            const downloads = (typeof data.downloads === 'number') ? data.downloads : (typeof data.downloadCount === 'number' ? data.downloadCount : null);
            if(typeof downloads === 'number'){
                u.setCached(cacheKey, downloads, ns.TTL.SPIGET);
                return downloads;
            }
            u.setCached(cacheKey, { __error: 'not_found' }, 60);
            return null;
        } catch(err){
            console.warn('fetchSpigetDownloads error', err);
            u.setCached(cacheKey, { __error: 'network' }, 30);
            return null;
        }
    }

    async function fetchHangarDownloads(owner, slug){
        if(!owner || !slug) return null;
        const cacheKey = `hangar:downloads:${owner}/${slug}`;
        const cached = u.getCached(cacheKey);
        if(cached !== null && !(cached && cached.__error)) return cached;
        const tries = [
            `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
            `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/statistics`,
            `https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}/stats`
        ];
        for(const endpoint of tries){
            try {
                const res = await u.safeFetchJson(endpoint);
                if(!res.ok) continue;
                const data = res.data;
                let downloads = null;
                if(typeof data.downloads === 'number') downloads = data.downloads;
                if(!downloads && data.statistics && typeof data.statistics.downloads === 'number') downloads = data.statistics.downloads;
                if(!downloads && typeof data.total_downloads === 'number') downloads = data.total_downloads;
                if(downloads !== null){ u.setCached(cacheKey, downloads, ns.TTL.HANGAR); return downloads; }
                if(Array.isArray(data.versions)){
                    let sum = 0; let found = false;
                    for(const v of data.versions){ if(typeof v.downloads === 'number'){ sum += v.downloads; found = true; } }
                    if(found){ u.setCached(cacheKey, sum, ns.TTL.HANGAR); return sum; }
                }
            } catch(err){ /* try next */ }
        }
        u.setCached(cacheKey, { __error: 'not_found' }, 60);
        return null;
    }

    async function fetchContributors(githubUrl, limit = 10){
        const repo = u.parseGitHubRepo(githubUrl); if(!repo) return null;
        const cacheKey = `gh:contributors:${repo.owner}/${repo.repo}`; const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contributors?per_page=${limit}`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){ const obj={__error:'rate_limit',__reset:res.reset||null}; u.setCached(cacheKey,obj,res.reset?Math.max(30,Math.ceil((res.reset*1000-Date.now())/1000)):60); return obj; }
            else { const obj={__error:res.reason||'http', status: res.status||null}; u.setCached(cacheKey,obj,60); return obj; }
        }
        const data = res.data; if(!Array.isArray(data)) return null;
        const mapped = data.slice(0,limit).map(uobj => ({ login:uobj.login, avatar:uobj.avatar_url, html_url:uobj.html_url, contributions:uobj.contributions }));
        u.setCached(cacheKey, mapped, ns.TTL.GH_CONTRIB);
        return mapped;
    }

    async function fetchCommitActivity(githubUrl){
        const repo = u.parseGitHubRepo(githubUrl); if(!repo) return null;
        const cacheKey = `gh:commit_activity:${repo.owner}/${repo.repo}`; const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/stats/commit_activity`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){ u.setCached(cacheKey, { __error: 'rate_limit', __reset: res.reset || null }, 60); return { __error: 'rate_limit' }; }
            else { u.setCached(cacheKey, { __error: 'http' }, 60); return { __error: 'http' }; }
        }
        const data = res.data;
        if(!Array.isArray(data)) return null;
        u.setCached(cacheKey, data, ns.TTL.GH_COMMITS);
        return data;
    }

    async function computeActivityFromCommits(githubUrl, weeks = 12){
        const repo = u.parseGitHubRepo(githubUrl); if(!repo) return null;
        try {
            const res = await u.safeFetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=100`);
            if(!res.ok) return null;
            const commits = res.data;
            if(!Array.isArray(commits)) return null;
            const now = Date.now(); const weekMs = 7*24*60*60*1000;
            const counts = new Array(weeks).fill(0);
            for(const c of commits){
                const dateStr = c && c.commit && (c.commit.author && c.commit.author.date || c.commit.committer && c.commit.committer.date);
                if(!dateStr) continue;
                const dt = new Date(dateStr).getTime(); const deltaWeeks = Math.floor((now - dt) / weekMs);
                if(deltaWeeks >= 0 && deltaWeeks < weeks) counts[weeks - 1 - deltaWeeks] += 1;
            }
            return counts;
        } catch(e){ console.warn('computeActivityFromCommits error', e); return null; }
    }

    async function fetchStargazerSeries(githubUrl, months = 6){
        const repo = u.parseGitHubRepo(githubUrl); if(!repo) return null;
        const cacheKey = `gh:stars_series:${repo.owner}/${repo.repo}:${months}`; const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const endpoint = `https://api.github.com/repos/${repo.owner}/${repo.repo}/stargazers?per_page=100`;
        const res = await u.safeFetchJson(endpoint, { headers: { Accept: 'application/vnd.github.v3.star+json' } });
        if(!res.ok){
            if(res.reason === 'rate_limit'){ const obj={__error:'rate_limit',__reset:res.reset||null}; u.setCached(cacheKey,obj,res.reset?Math.max(30,Math.ceil((res.reset*1000-Date.now())/1000)):60); return obj; }
            else { u.setCached(cacheKey,{__error:res.reason||'http'},60); return null; }
        }
        const data = res.data; if(!Array.isArray(data)) return null;
        const now = new Date(); const buckets = [];
        for(let i = months - 1; i >= 0; i--) buckets.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
        const counts = new Array(months).fill(0);
        for(const entry of data){
            const t = entry.starred_at || (entry && entry.starred_at); if(!t) continue;
            const dt = new Date(t);
            for(let i=0;i<buckets.length;i++){
                const start = buckets[i], end = new Date(start.getFullYear(), start.getMonth()+1, 1);
                if(dt >= start && dt < end){ counts[i]++; break; }
            }
        }
        u.setCached(cacheKey, counts, ns.TTL.GH_STARS_SERIES); return counts;
    }

    async function fetchReleaseCompare(githubRepo, baseTag, headTag){
        if(!githubRepo || !baseTag || !headTag) return null;
        const cacheKey = `gh:compare:${githubRepo}:${baseTag}...${headTag}`; const cached = u.getCached(cacheKey);
        if(cached && !(cached && cached.__error)) return cached;
        const res = await u.safeFetchJson(`https://api.github.com/repos/${githubRepo}/compare/${encodeURIComponent(baseTag)}...${encodeURIComponent(headTag)}`);
        if(!res.ok){
            if(res.reason === 'rate_limit'){ const obj={__error:'rate_limit',__reset:res.reset||null}; u.setCached(cacheKey,obj,res.reset?Math.max(30,Math.ceil((res.reset*1000-Date.now())/1000)):60); return obj; }
            else { const obj={__error:'http', status: res.status||null}; u.setCached(cacheKey,obj,60); return obj; }
        }
        const data = res.data;
        const files = Array.isArray(data.files) ? data.files.map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch || null })) : [];
        const out = { files, ahead_by: data.ahead_by || 0, behind_by: data.behind_by || 0 };
        u.setCached(cacheKey, out, ns.TTL.GH_COMPARE);
        return out;
    }

    ns.api = {
        fetchGitHubStats, fetchGitHubLicense, fetchReleasesList, fetchLatestReleaseObject,
        fetchModrinthDownloadsById, fetchSpigetDownloads, fetchHangarDownloads,
        fetchContributors, fetchCommitActivity, computeActivityFromCommits,
        fetchStargazerSeries, fetchReleaseCompare
    };
})(window.zp);