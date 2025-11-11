// main.js — bootstrapping: load projects.json, wire UI events and initialize search/module
window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;

    const toggleBtn = document.getElementById('toggleBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const banner = document.getElementById('banner');
    const searchBox = document.getElementById('searchBox');
    const container = document.getElementById('projectsContainer');
    const suggestionsEl = document.getElementById('searchSuggestions');
    const langToggle = document.getElementById('langToggle');
    const discordBtn = document.getElementById('discordBtn');

    // Footer year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Initialize i18n from saved language (i18n.js exposes ns.i18n)
    try {
        const savedLang = localStorage.getItem('lang') || ns.i18n.current || 'en';
        ns.i18n.setLanguage(savedLang);
        // update language toggle label
        if(langToggle){
            langToggle.textContent = ns.i18n.t('lang.toggle') || (savedLang === 'en' ? 'EN' : 'PT-BR');
        }
    } catch(e){ /* ignore */ }

    // Dark mode initialization
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'light'){ document.body.classList.add('light'); toggleBtn.textContent = '🌞'; }
    else { document.body.classList.remove('light'); toggleBtn.textContent = '🌙'; }
    ns.ui.updateLogos();

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light');
        if(document.body.classList.contains('light')){ toggleBtn.textContent = '🌞'; localStorage.setItem('theme','light'); }
        else { toggleBtn.textContent = '🌙'; localStorage.setItem('theme','dark'); }
        ns.ui.updateLogos();
    });

    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('rotating');
        u.clearAllZPluginsCache();
        setTimeout(() => { location.reload(); }, 260);
    });

    // Discord button — update default link or open # if not configured
    if(discordBtn){
        // You can change the invite URL below:
        const invite = discordBtn.getAttribute('href') && discordBtn.getAttribute('href') !== '#' ? discordBtn.getAttribute('href') : '#';
        discordBtn.addEventListener('click', (e) => {
            if(invite === '#'){ e.preventDefault(); // show a quick tooltip if no invite configured
                ns.ui.showTooltip(discordBtn, `<div><strong>${u.escapeHtml(ns.i18n.t('discord.title'))}</strong></div><div style="opacity:0.8">Invite not configured</div>`);
                setTimeout(ns.ui.hideTooltip, 1400);
            }
        });
    }

    // Language toggle handler (simple cycle EN <-> PT-BR)
    if(langToggle){
        langToggle.addEventListener('click', () => {
            const next = (ns.i18n.current === 'en') ? 'pt-BR' : 'en';
            ns.i18n.setLanguage(next);
            try { localStorage.setItem('lang', next); } catch(e){}
            // update label
            langToggle.textContent = ns.i18n.t('lang.toggle') || (next === 'en' ? 'EN' : 'PT‑BR');
            // trigger input on searchBox to refresh suggestions immediately
            if(searchBox) searchBox.dispatchEvent(new Event('input', { bubbles:true }));
        });
    }

    // Load projects list & info.json
    fetch('projects.json')
        .then(res => res.json())
        .then(list => {
            document.querySelectorAll('.skeleton').forEach(s => s.remove());
            const folders = Array.isArray(list) ? list.filter(folderName => folderName !== 'sources') : [];
            const infoPromises = folders.map(folderName => {
                return fetch(`${folderName}/info.json`).then(r => { if(!r.ok) throw new Error('missing info.json'); return r.json(); }).then(infoDoc => Array.isArray(infoDoc) ? infoDoc[0] : infoDoc).catch(err => { console.warn('Could not load info for', folderName, err); return { name: folderName, description: '' }; });
            });
            Promise.all(infoPromises).then(allInfos => {
                allInfos.forEach((info, idx) => ns.ui.renderProject(folders[idx], info, idx));

                // Build search items: include description_pt so suggestions can switch to Portuguese
                const searchItems = allInfos.map((info, idx) => ({
                    folder: folders[idx],
                    name: (info && info.name) ? info.name : folders[idx],
                    description: (info && info.description) ? info.description : '',
                    description_pt: (info && info.description_pt) ? info.description_pt : '',
                    idx
                }));
                ns.search.init(searchItems);

                ns.modal.processReleaseHash();
            }).catch(err => {
                console.error('Error while loading project infos', err);
                folders.forEach((folderName, idx) => ns.ui.renderProject(folderName, { name: folderName, description: '' }, idx));
                ns.modal.processReleaseHash();
            });
        }).catch(err => {
            console.error('Could not read projects.json', err);
            ns.modal.processReleaseHash();
        });

    // keyboard helpers
    document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape' && !document.getElementById('releaseModal').classList.contains('hidden')) ns.modal.closeModal();
        if(e.key === 'Escape' && ns.popovers && ns.popovers.hideContribPopover) ns.popovers.hideContribPopover();
        if(e.key === 'Escape' && ns.popovers && ns.popovers.hidePlatformPopover) ns.popovers.hidePlatformPopover();
        if(!document.getElementById('releaseModal').classList.contains('hidden')){
            if(e.key === 'ArrowLeft'){ if(!ns.modal.modalPrev.disabled) ns.modal.modalPrev.click(); }
            else if(e.key === 'ArrowRight'){ if(!ns.modal.modalNext.disabled) ns.modal.modalNext.click(); }
        }
        if(e.key === '/' && document.activeElement !== searchBox){
            e.preventDefault(); searchBox.focus();
        }
    });

    // also refresh suggestions when language changes (covers cases where lang is changed elsewhere)
    document.addEventListener('zp:langchange', () => {
        if(searchBox) searchBox.dispatchEvent(new Event('input', { bubbles:true }));
    });

})(window.zp);