// search.js — Fuse.js fuzzy search & autocomplete suggestions
window.zp = window.zp || {};
(function(ns){
    const u = ns.utils;
    let fuse = null;
    let searchItems = [];
    let selectedSuggestionIndex = -1;
    const searchBox = document.getElementById('searchBox');
    const suggestionsEl = document.getElementById('searchSuggestions');

    function clearSuggestions(){
        if(!suggestionsEl) return;
        suggestionsEl.innerHTML = ''; suggestionsEl.hidden = true; selectedSuggestionIndex = -1;
        if(searchBox) searchBox.setAttribute('aria-expanded','false');
    }
    function setSuggestionActive(relativeIndex){
        const children = Array.from(suggestionsEl.querySelectorAll('.suggestion-item'));
        children.forEach((c, idx) => { if(idx === relativeIndex) c.classList.add('active'); else c.classList.remove('active'); });
        selectedSuggestionIndex = relativeIndex;
    }
    function completeWithSuggestion(item){
        if(!item) return;
        searchBox.value = item.name;
        const ev = new Event('input', { bubbles:true }); searchBox.dispatchEvent(ev);
        clearSuggestions();
    }

    function renderSuggestions(results){
        if(!suggestionsEl) return;
        suggestionsEl.innerHTML = '';
        if(!results || !results.length){ clearSuggestions(); return; }
        suggestionsEl.hidden = false; if(searchBox) searchBox.setAttribute('aria-expanded','true');
        const max = Math.min(8, results.length);
        for(let i=0;i<max;i++){
            const item = results[i].item ? results[i].item : results[i];
            const li = document.createElement('li'); li.className='suggestion-item'; li.setAttribute('role','option'); li.setAttribute('data-idx', item.idx);
            li.innerHTML = `<div style="flex:1;min-width:0"><strong>${u.escapeHtml(item.name)}</strong><div style="font-size:12px;opacity:0.85">${u.escapeHtml((item.description||'').slice(0,120))}</div></div>`;
            li.addEventListener('mousedown', (ev) => { ev.preventDefault(); completeWithSuggestion(item); });
            li.addEventListener('mouseenter', () => { setSuggestionActive(i); });
            suggestionsEl.appendChild(li);
        }
        selectedSuggestionIndex = -1;
    }

    function attachHandlers(){
        if(!searchBox) return;
        searchBox.addEventListener('input', () => {
            const filter = searchBox.value.trim();
            if(fuse && filter.length > 0){
                const res = fuse.search(filter, { limit: 12 });
                renderSuggestions(res);
            } else { clearSuggestions(); }
            const low = searchBox.value.trim().toLowerCase();
            document.querySelectorAll('.card').forEach(card => {
                const nameEl = card.querySelector('.project-name');
                const descEl = card.querySelector('.card-desc');
                const verEl = card.querySelector('.version');
                const name = nameEl ? nameEl.textContent.toLowerCase() : '';
                const desc = descEl ? descEl.textContent.toLowerCase() : '';
                const ver = verEl ? verEl.dataset.version && verEl.dataset.version.toLowerCase() || verEl.textContent.toLowerCase() : '';
                const matches = !low || name.includes(low) || desc.includes(low) || ver.includes(low);
                if(matches){ card.classList.remove('hidden'); card.style.animation='none'; void card.offsetHeight; card.style.animation=''; } else card.classList.add('hidden');

                if(nameEl){
                    const raw = nameEl.textContent;
                    if(low){ const regex = new RegExp(`(${u.escapeRegExp(low)})`, 'gi'); nameEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
                    else nameEl.textContent = raw;
                }
                if(descEl){
                    const raw = descEl.textContent;
                    if(low){ const regex = new RegExp(`(${u.escapeRegExp(low)})`, 'gi'); descEl.innerHTML = raw.replace(regex, '<mark>$1</mark>'); }
                    else descEl.textContent = raw;
                }
            });
        });

        searchBox.addEventListener('keydown', (e) => {
            const children = Array.from(suggestionsEl.querySelectorAll('.suggestion-item'));
            if(e.key === 'ArrowDown'){ e.preventDefault(); if(!children.length) return; const next = (selectedSuggestionIndex + 1) >= children.length ? 0 : selectedSuggestionIndex + 1; setSuggestionActive(next); children[next].scrollIntoView({ block:'nearest' }); }
            else if(e.key === 'ArrowUp'){ e.preventDefault(); if(!children.length) return; const prev = (selectedSuggestionIndex - 1) < 0 ? (children.length - 1) : selectedSuggestionIndex - 1; setSuggestionActive(prev); children[prev].scrollIntoView({ block:'nearest' }); }
            else if(e.key === 'Enter'){
                if(selectedSuggestionIndex >= 0 && children[selectedSuggestionIndex]){ e.preventDefault(); const itemIdx = parseInt(children[selectedSuggestionIndex].getAttribute('data-idx'),10); const item = searchItems.find(si => si.idx === itemIdx); completeWithSuggestion(item); }
            } else if(e.key === 'Tab'){
                if(selectedSuggestionIndex >= 0 && children[selectedSuggestionIndex]){ e.preventDefault(); const itemIdx = parseInt(children[selectedSuggestionIndex].getAttribute('data-idx'),10); const item = searchItems.find(si => si.idx === itemIdx); completeWithSuggestion(item); }
                else if(children.length === 1){ e.preventDefault(); const itemIdx = parseInt(children[0].getAttribute('data-idx'),10); const item = searchItems.find(si => si.idx === itemIdx); completeWithSuggestion(item); }
            } else if(e.key === 'Escape'){ clearSuggestions(); }
        });

        document.addEventListener('click', (e) => {
            if(!suggestionsEl.contains(e.target) && e.target !== searchBox) clearSuggestions();
        });
    }

    function init(items){
        searchItems = items || [];
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
        } catch(e){ console.warn('Could not init Fuse.js', e); fuse = null; }
        attachHandlers();
    }

    ns.search = { init, clearSuggestions };
})(window.zp);