window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;
    const api = ns.api;
    ns.modal = ns.modal || {};

    const releaseModal = document.getElementById('releaseModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalClose = document.getElementById('modalClose');
    const releaseBody = document.getElementById('releaseBody');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');
    const modalCopy = document.getElementById('modalCopy');

    ns.modal.releaseBody = releaseBody;
    ns.modal.modalReleases = [];
    ns.modal.modalReleaseIndex = 0;
    ns.modal.modalCurrentRepo = null;

    function openModal(){ releaseModal.classList.remove('hidden'); releaseModal.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; modalClose.focus(); }
    function closeModal(){
        releaseModal.classList.add('hidden'); releaseModal.setAttribute('aria-hidden','true'); document.body.style.overflow = '';
        ns.modal.modalReleases = []; ns.modal.modalReleaseIndex = 0; ns.modal.modalCurrentRepo = null; releaseBody.innerHTML = '';
        setNavButtonState(modalPrev, false); setNavButtonState(modalNext, false);
        if(modalCopy){ modalCopy.dataset.tag=''; modalCopy.dataset.repo=''; modalCopy.disabled = true; }
        try { if(location.hash && location.hash.startsWith('#release:')){ const newUrl = location.pathname + location.search; history.replaceState(null, '', newUrl); } } catch(e){}
    }
    function setNavButtonState(buttonEl, enabled){
        if(!buttonEl) return;
        if(enabled){ buttonEl.classList.remove('nav-disabled'); buttonEl.setAttribute('aria-disabled','false'); buttonEl.disabled = false; }
        else { buttonEl.classList.add('nav-disabled'); buttonEl.setAttribute('aria-disabled','true'); buttonEl.disabled = true; }
    }

    function updateModalNavButtons(){
        const atNewest = ns.modal.modalReleaseIndex === 0;
        const atOldest = ns.modal.modalReleases && (ns.modal.modalReleaseIndex >= (ns.modal.modalReleases.length - 1));
        setNavButtonState(modalNext, !atNewest);
        setNavButtonState(modalPrev, !atOldest);
    }

    // Ensure modal control labels use i18n and update on language change.
    function updateModalControlLabels(){
        try {
            if(modalPrev) modalPrev.textContent = ns.i18n ? ns.i18n.t('modal.prev') : 'Previous';
            if(modalNext) modalNext.textContent = ns.i18n ? ns.i18n.t('modal.next') : 'Next';
            if(modalCopy) modalCopy.textContent = ns.i18n ? ns.i18n.t('modal.copy') : 'Copy';
            if(modalClose) modalClose.textContent = ns.i18n ? ns.i18n.t('modal.close') : '✕';
        } catch(e){}
    }
    // initial labels
    updateModalControlLabels();
    // update on language change
    document.addEventListener('zp:langchange', updateModalControlLabels);

    modalPrev.addEventListener('click', () => {
        if(!ns.modal.modalReleases || ns.modal.modalReleases.length === 0) return;
        if(ns.modal.modalReleaseIndex >= ns.modal.modalReleases.length - 1) return;
        ns.modal.modalReleaseIndex++; renderModalReleaseAt(ns.modal.modalReleaseIndex);
    });
    modalNext.addEventListener('click', () => {
        if(!ns.modal.modalReleases || ns.modal.modalReleases.length === 0) return;
        if(ns.modal.modalReleaseIndex <= 0) return;
        ns.modal.modalReleaseIndex--; renderModalReleaseAt(ns.modal.modalReleaseIndex);
    });

    modalClose.addEventListener('click', () => closeModal());
    modalBackdrop.addEventListener('click', closeModal);

    if(modalCopy){
        modalCopy.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tag = modalCopy.dataset.tag || '';
            const repoStr = modalCopy.dataset.repo || ns.modal.modalCurrentRepo || '';
            if(!tag || !repoStr){ ns.ui.showTooltip(modalCopy, `<div><strong>${u.escapeHtml(ns.i18n.t('modal.copy_nothing'))}</strong></div><div>Nothing to copy</div>`); setTimeout(ns.ui.hideTooltip, 1200); return; }
            try {
                const base = `${location.origin}${location.pathname}`;
                const deepHash = `#release:${repoStr}:${encodeURIComponent(tag)}`;
                const full = `${base}${deepHash}`;
                await navigator.clipboard.writeText(full);
                const prev = modalCopy.textContent; modalCopy.textContent = ns.i18n.t('modal.copy_copied'); setTimeout(()=>{ modalCopy.textContent = prev; },1200);
            } catch {
                const prev = modalCopy.textContent; modalCopy.textContent = ns.i18n.t('modal.copy_failed'); setTimeout(()=>{ modalCopy.textContent = prev; },1200);
            }
        });
    }

    function renderModalReleaseAt(index){
        if(!ns.modal.modalReleases || !ns.modal.modalReleases.length){ releaseBody.innerHTML = `<div style="color:#ff6b6b">${u.escapeHtml(ns.i18n.t('modal.no_releases'))}</div>`; updateModalNavButtons(); return; }
        const rel = ns.modal.modalReleases[index];
        if(!rel){ releaseBody.innerHTML = `<div style="color:#ff6b6b">${u.escapeHtml(ns.i18n.t('modal.release_not_found'))}</div>`; updateModalNavButtons(); return; }
        const title = rel.name || rel.tag_name || 'Release';
        const tag = rel.tag_name || '';
        const published = rel.published_at ? new Date(rel.published_at).toLocaleString() : '';
        const body = rel.body || '_No release note provided._';

        let assetsHtml = '';
        if(Array.isArray(rel.assets) && rel.assets.length){
            const hasAnyUrl = rel.assets.some(a => a && a.url);
            if(hasAnyUrl){
                assetsHtml = '<div class="modal-assets-list">';
                for(const a of rel.assets){
                    const assetUrl = a.url || null;
                    assetsHtml += `<div class="asset-row">
                        <div class="asset-meta">
                            <div style="min-width:0">
                                <div class="asset-name">${u.escapeHtml(a.name || '(unnamed)')}</div>
                                <div class="asset-size">${a.downloads !== null ? `${a.downloads.toLocaleString()} downloads • `: ''}${u.formatBytes(a.size)}</div>
                            </div>
                        </div>
                        <div class="asset-actions">` + (assetUrl ? `<a class="asset-link" href="${u.escapeHtml(assetUrl)}" target="_blank" rel="noopener">Download</a>` : `<span style="opacity:0.65">No direct link</span>`) + `</div>
                    </div>`;
                }
                assetsHtml += '</div>';
            } else {
                assetsHtml = `<div style="opacity:0.75">Assets present but no downloadable URL available.</div>`;
            }
        } else {
            assetsHtml = `<div style="opacity:0.7">No release assets</div>`;
        }

        releaseBody.innerHTML = `
            <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;">
                <div>
                    <div class="release-title" id="releaseTitle">${u.escapeHtml(title)}</div>
                    <div class="release-meta">${u.escapeHtml(tag)} ${published ? '• ' + u.escapeHtml(ns.i18n.t('modal.published')) + ' ' + u.escapeHtml(published) : ''}</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button id="toggleCompareBtn" class="modal-copy-btn" title="${u.escapeHtml(ns.i18n.t('modal.compare'))}">${u.escapeHtml(ns.i18n.t('modal.compare'))}</button>
                </div>
            </div>
            <div class="release-body">${marked.parse(body)}</div>
            <div id="releaseAssets">${assetsHtml}</div>
            <div id="releaseCompare" style="display:none;"></div>
            <div id="releaseInsights" class="release-insights"></div>
        `;

        if(modalCopy){ modalCopy.dataset.tag = tag || ''; modalCopy.dataset.repo = ns.modal.modalCurrentRepo || ''; modalCopy.disabled = !tag; }

        if(ns.modal.modalCurrentRepo && tag){ const encoded = encodeURIComponent(tag); const newPath = `${location.pathname}${location.search}#release:${ns.modal.modalCurrentRepo}:${encoded}`; history.replaceState(null,'',newPath); }

        updateModalNavButtons();
        buildReleaseInsights(tag);

        const toggleCompareBtn = document.getElementById('toggleCompareBtn');
        const compareContainer = document.getElementById('releaseCompare');
        let compareMenuEl = null;

        function removeCompareMenu(){
            if(compareMenuEl && compareMenuEl.parentNode) compareMenuEl.parentNode.removeChild(compareMenuEl);
            compareMenuEl = null; document.removeEventListener('click', onDocClickForCompareMenu); document.removeEventListener('keydown', onKeyDownForCompareMenu);
        }
        function onDocClickForCompareMenu(e){ if(!compareMenuEl) return; if(!compareMenuEl.contains(e.target) && e.target !== toggleCompareBtn) removeCompareMenu(); }
        function onKeyDownForCompareMenu(e){ if(e.key === 'Escape') removeCompareMenu(); }

        toggleCompareBtn.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            if(compareMenuEl){ removeCompareMenu(); return; }
            compareMenuEl = document.createElement('div'); compareMenuEl.className = 'compare-menu';
            compareMenuEl.innerHTML = `
                <div class="compare-menu-inner">
                    <button class="compare-option" data-type="previous">${u.escapeHtml(ns.i18n.t('compare.previous'))}</button>
                    <button class="compare-option" data-type="other">${u.escapeHtml(ns.i18n.t('compare.other'))}</button>
                    <div class="compare-other" style="display:none; margin-top:8px;">
                        <input class="compare-other-input" placeholder="${u.escapeHtml(ns.i18n.t('compare.other.placeholder'))}" />
                        <button class="compare-other-go">${u.escapeHtml(ns.i18n.t('modal.compare'))}</button>
                        <div class="compare-other-hint" style="margin-top:6px;font-size:12px;opacity:0.8">${u.escapeHtml(ns.i18n.t('compare.other.hint'))}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(compareMenuEl);

            const r = toggleCompareBtn.getBoundingClientRect(); const menuW = 300; const menuH = 150;
            let left = r.left; let top = r.bottom + 8;
            if(left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
            if(top + menuH > window.innerHeight - 8) top = r.top - menuH - 8;
            compareMenuEl.style.left = `${Math.max(8, left)}px`; compareMenuEl.style.top = `${Math.max(8, top)}px`;

            document.addEventListener('click', onDocClickForCompareMenu);
            document.addEventListener('keydown', onKeyDownForCompareMenu);

            const prevBtn = compareMenuEl.querySelector('.compare-option[data-type="previous"]');
            const otherBtn = compareMenuEl.querySelector('.compare-option[data-type="other"]');
            const otherWrap = compareMenuEl.querySelector('.compare-other');
            const otherInput = compareMenuEl.querySelector('.compare-other-input');
            const otherGo = compareMenuEl.querySelector('.compare-other-go');

            prevBtn.addEventListener('click', async () => {
                removeCompareMenu();
                if(!ns.modal.modalCurrentRepo){ ns.ui.showTooltip(toggleCompareBtn, `<div><strong>No repo</strong></div>`); setTimeout(ns.ui.hideTooltip, 1200); return; }
                const currentIdx = ns.modal.modalReleaseIndex;
                const older = ns.modal.modalReleases[currentIdx + 1];
                if(!older || !older.tag_name){ ns.ui.showTooltip(toggleCompareBtn, `<div><strong>No previous release</strong></div><div>Cannot compute compare</div>`); setTimeout(ns.ui.hideTooltip, 1500); return; }
                compareContainer.style.display = 'block'; compareContainer.innerHTML = `<div style="opacity:0.8">${u.escapeHtml(ns.i18n.t('modal.compare_loading'))}</div>`;
                const cmp = await api.fetchReleaseCompare(ns.modal.modalCurrentRepo, older.tag_name, tag);
                if(!cmp){ compareContainer.innerHTML = `<div style="color:#ff6b6b">${u.escapeHtml(ns.i18n.t('modal.compare_failed'))}</div>`; return; }
                if(cmp.__error === 'rate_limit'){ compareContainer.innerHTML = `<div style="color:#ffd89b">GitHub rate limited. Try again later.</div>`; return; }
                if(!cmp.files || !cmp.files.length){ compareContainer.innerHTML = `<div style="opacity:0.8">${u.escapeHtml(ns.i18n.t('modal.no_changed_files', [u.escapeHtml(older.tag_name), u.escapeHtml(tag)]))}</div>`; return; }
                const filesHtml = cmp.files.map(f => `<div class="compare-file ${u.escapeHtml(f.status || '')}"><div class="filename">${u.escapeHtml(f.filename)}</div><div class="meta">${u.escapeHtml(f.status)} • +${f.additions} / -${f.deletions}</div></div>`).join('');
                compareContainer.innerHTML = `<div class="compare-section"><div style="font-weight:700;margin-bottom:6px">Changed files (${cmp.files.length})</div>${filesHtml}</div>`;
            });

            otherBtn.addEventListener('click', () => {
                otherWrap.style.display = otherWrap.style.display === 'none' ? 'block' : 'none';
                if(otherWrap.style.display === 'block') otherInput.focus();
            });

            async function doOtherCompare(){
                const baseTagRaw = otherInput.value && otherInput.value.trim();
                if(!baseTagRaw){ otherInput.focus(); return; }
                removeCompareMenu(); compareContainer.style.display = 'block'; compareContainer.innerHTML = `<div style="opacity:0.8">${u.escapeHtml(ns.i18n.t('modal.compare_loading'))}</div>`;
                const cmp = await api.fetchReleaseCompare(ns.modal.modalCurrentRepo, baseTagRaw, tag);
                if(!cmp){ compareContainer.innerHTML = `<div style="color:#ff6b6b">${u.escapeHtml(ns.i18n.t('modal.compare_failed'))}</div>`; return; }
                if(cmp.__error === 'rate_limit'){ compareContainer.innerHTML = `<div style="color:#ffd89b">GitHub rate limited. Try again later.</div>`; return; }
                if(!cmp.files || !cmp.files.length){ compareContainer.innerHTML = `<div style="opacity:0.8">${u.escapeHtml(ns.i18n.t('modal.no_changed_files', [u.escapeHtml(baseTagRaw), u.escapeHtml(tag)]))}</div>`; return; }
                const filesHtml = cmp.files.map(f => `<div class="compare-file ${u.escapeHtml(f.status || '')}"><div class="filename">${u.escapeHtml(f.filename)}</div><div class="meta">${u.escapeHtml(f.status)} • +${f.additions} / -${f.deletions}</div></div>`).join('');
                compareContainer.innerHTML = `<div class="compare-section"><div style="font-weight:700;margin-bottom:6px">Changed files (${cmp.files.length})</div>${filesHtml}</div>`;
            }

            otherGo.addEventListener('click', () => doOtherCompare());
            otherInput.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); doOtherCompare(); } else if(e.key === 'Escape'){ removeCompareMenu(); } });
        });
    }

    function buildReleaseInsights(activeTag){
        const el = document.getElementById('releaseInsights');
        if(!el || !ns.modal.modalReleases || !ns.modal.modalReleases.length) return;
        const timeline = ns.modal.modalReleases.filter(r => !r.draft).map((r, idx) => {
            const isActive = r.tag_name === activeTag;
            const date = r.published_at ? new Date(r.published_at).toLocaleDateString() : '';
            return `<button class="timeline-pill ${isActive ? 'active':''}" data-idx="${idx}" title="${date}">${u.escapeHtml(r.tag_name || r.name || '')}</button>`;
        }).join('');
        const now = new Date();
        const months = [];
        for(let i=0;i<3;i++) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
        const releaseDates = ns.modal.modalReleases.filter(r => !r.draft && r.published_at).map(r => new Date(r.published_at));
        function buildMonthCalendar(baseDate){
            const year = baseDate.getFullYear(); const month = baseDate.getMonth();
            const firstDay = new Date(year, month, 1); const startWeekday = firstDay.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let cells = [];
            for(let i=0;i<startWeekday;i++) cells.push('<div class="cal-cell empty"></div>');
            for(let day=1; day<=daysInMonth; day++){
                const cur = new Date(year, month, day);
                const hasRelease = releaseDates.some(rd => rd.getFullYear() === cur.getFullYear() && rd.getMonth() === cur.getMonth() && rd.getDate() === cur.getDate());
                cells.push(`<div class="cal-cell${hasRelease ? ' rel':''}" aria-label="${cur.toDateString()}">${day}</div>`);
            }
            return `<div class="month-block"><div class="month-label">${baseDate.toLocaleString(undefined,{month:'short'})}</div><div class="month-grid">${cells.join('')}</div></div>`;
        }
        const calendarHTML = months.map(m => buildMonthCalendar(m)).join('');
        el.innerHTML = `<div class="ins-section"><div class="ins-title">${u.escapeHtml(ns.i18n.t('timeline.title'))}</div><div class="timeline-pills">${timeline}</div></div><div class="ins-section"><div class="ins-title">${u.escapeHtml(ns.i18n.t('calendar.title'))}</div><div class="calendar-wrap">${calendarHTML}</div></div>`;
        el.querySelectorAll('.timeline-pill').forEach(btn => { btn.addEventListener('click', () => { const i = parseInt(btn.dataset.idx,10); if(!isNaN(i)){ ns.modal.modalReleaseIndex = i; renderModalReleaseAt(i); } }); });
    }

    // deep-link handling
    function parseReleaseHash(hash){
        if(!hash) return null;
        const h = hash.charAt(0) === '#' ? hash.slice(1) : hash;
        const m = h.match(/^release:([^:]+\/[^:]+):(.+)$/);
        if(!m) return null;
        try { const repo = m[1]; const rawTag = decodeURIComponent(m[2]); return { repo, tag: rawTag }; } catch(e) { return { repo: m[1], tag: m[2] }; }
    }

    async function processReleaseHash(){
        const parsed = parseReleaseHash(location.hash); if(!parsed) return;
        const ghUrl = `https://github.com/${parsed.repo}`;
        const list = await api.fetchReleasesList(ghUrl);
        if(!list || !list.length){ openModal(); if(list && list.__error === 'rate_limit') releaseBody.innerHTML = `<div style="color:#ffd89b">${u.escapeHtml(ns.i18n.t('modal.loading_releases'))}</div>`; else releaseBody.innerHTML = `<div style="color:#ff6b6b">${u.escapeHtml(ns.i18n.t('modal.no_releases'))} <b>${u.escapeHtml(parsed.repo)}</b>.</div>`; return; }
        ns.modal.modalCurrentRepo = parsed.repo; ns.modal.modalReleases = list;
        const reqTag = parsed.tag || '';
        const norm = t => (t || '').toString().toLowerCase().replace(/^v/,'');
        let foundIdx = -1;
        for(let i=0;i<list.length;i++){
            const r = list[i];
            const candidates = [r.tag_name || '', r.name || ''];
            for(const c of candidates){ if(!c) continue; if(c === reqTag){ foundIdx = i; break; } if(norm(c) === norm(reqTag)){ foundIdx = i; break; } }
            if(foundIdx !== -1) break;
        }
        openModal();
        if(foundIdx === -1){ ns.modal.modalReleaseIndex = 0; renderModalReleaseAt(ns.modal.modalReleaseIndex); releaseBody.insertAdjacentHTML('afterbegin', `<div style="color:#ffb86b">${u.escapeHtml('Requested release ' + reqTag + ' not found; showing latest.')}</div>`); }
        else { ns.modal.modalReleaseIndex = foundIdx; renderModalReleaseAt(ns.modal.modalReleaseIndex); }
    }
    window.addEventListener('hashchange', () => { processReleaseHash(); });

    ns.modal = Object.assign(ns.modal, {
        openModal, closeModal, renderModalReleaseAt, updateModalNavButtons, buildReleaseInsights, processReleaseHash,
        modalPrev, modalNext, modalCopy
    });
})(window.zp);