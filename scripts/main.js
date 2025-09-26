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

    // Footer year
    document.getElementById('year').textContent = new Date().getFullYear();

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

                const searchItems = allInfos.map((info, idx) => ({ folder: folders[idx], name: (info && info.name) ? info.name : folders[idx], description: info && info.description ? info.description : '', idx }));
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

})(window.zp);