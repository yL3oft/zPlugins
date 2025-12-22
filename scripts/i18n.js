// simple i18n helper: loads dictionaries and applies translations to DOM and JS strings
window.zp = window.zp || {};
(function(ns){
    const DICTS = {
        'en': {
            brand: 'yLeoft Projects',
            'search.placeholder': 'Search projects...',
            'refresh.title': 'Refresh stats',
            'dark.toggle.aria': 'Toggle theme',
            'discord.title': 'Discord',
            'lang.toggle': 'EN',
            loading: 'loading…',
            'on_development': 'On development',
            'archived': 'Archived',
            'archived_tooltip': 'This project is archived — no active releases',
            'disabled_dev_tooltip': '{0} (disabled while project is in development)',
            'disabled_archived_tooltip': '{0} (disabled - project is archived)',
            'last_checked': 'Last checked',
            'gh_stats_not_checked': 'GH stats: not checked',
            'downloads_not_checked': 'Downloads: not checked',
            'modal.loading_releases': 'Loading release notes…',
            'modal.no_releases': 'No releases available.',
            'modal.release_not_found': 'Release not found.',
            'modal.published': 'Published',
            'modal.compare': 'Compare',
            'modal.compare_loading': 'Loading compare…',
            'modal.compare_failed': 'Compare failed or unavailable.',
            'modal.no_changed_files': 'No changed files between {0} and {1}',
            'modal.copy_nothing': 'Nothing to copy',
            'modal.copy_copied': '✓ Copied',
            'modal.copy_failed': 'Failed',
            // Added modal control labels
            'modal.prev': '◀ Previous',
            'modal.next': 'Next ▶',
            'modal.copy': 'Copy',
            'modal.close': '✕',
            'contrib.loading': 'Loading contributors & activity…',
            'platform.loading': 'Loading platforms…',
            'contrib.no_contrib': 'No contributors data',
            'contrib.activity_hint': 'Click avatar to view profile. Activity shows commits/week (≈last 12w).',
            'compare.previous': 'Compare with previous release',
            'compare.other': 'Compare with other tag…',
            'compare.other.placeholder': 'Enter base tag (e.g. v1.2.3)',
            'compare.other.hint': 'Press Enter to compare',
            'timeline.title': 'Release Timeline',
            'calendar.title': 'Recent Release Calendar',
            'lang.en': 'EN',
            'lang.pt': 'PT'
        },
        'pt-BR': {
            brand: 'Projetos yLeoft',
            'search.placeholder': 'Pesquisar projetos...',
            'refresh.title': 'Atualizar estatísticas',
            'dark.toggle.aria': 'Alternar tema',
            'discord.title': 'Discord',
            'lang.toggle': 'PT‑BR',
            loading: 'carregando…',
            'on_development': 'Em desenvolvimento',
            'archived': 'Arquivado',
            'archived_tooltip': 'Este projeto foi arquivado — sem versões ativas',
            'disabled_dev_tooltip': '{0} (desativado enquanto o projeto está em desenvolvimento)',
            'disabled_archived_tooltip': '{0} (desativado - projeto arquivado)',
            'last_checked': 'Última verificação',
            'gh_stats_not_checked': 'Estatísticas GH: não verificadas',
            'downloads_not_checked': 'Downloads: não verificados',
            'modal.loading_releases': 'Carregando notas de versão…',
            'modal.no_releases': 'Nenhuma versão disponível.',
            'modal.release_not_found': 'Versão não encontrada.',
            'modal.published': 'Publicado',
            'modal.compare': 'Comparar',
            'modal.compare_loading': 'Carregando comparação…',
            'modal.compare_failed': 'Comparação falhou ou indisponível.',
            'modal.no_changed_files': 'Nenhum arquivo alterado entre {0} e {1}',
            'modal.copy_nothing': 'Nada para copiar',
            'modal.copy_copied': '✓ Copiado',
            'modal.copy_failed': 'Falhou',
            // Added modal control labels (pt-BR)
            'modal.prev': '◀ Anterior',
            'modal.next': 'Próxima ▶',
            'modal.copy': 'Copiar',
            'modal.close': '✕',
            'contrib.loading': 'Carregando contribuidores e atividade…',
            'platform.loading': 'Carregando plataformas…',
            'contrib.no_contrib': 'Dados de contribuidores indisponíveis',
            'contrib.activity_hint': 'Clique no avatar para ver o perfil. Atividade mostra commits/semana (≈últimas 12s).',
            'compare.previous': 'Comparar com a versão anterior',
            'compare.other': 'Comparar com outra tag…',
            'compare.other.placeholder': 'Digite a tag base (ex.: v1.2.3)',
            'compare.other.hint': 'Pressione Enter para comparar',
            'timeline.title': 'Linha do tempo de versões',
            'calendar.title': 'Calendário recente de versões',
            'lang.en': 'EN',
            'lang.pt': 'PT‑BR'
        }
    };

    let current = 'en';

    function t(key, vars){
        const dict = DICTS[current] || DICTS['en'];
        let v = dict[key] !== undefined ? dict[key] : (DICTS['en'][key] || key);
        if(vars && Array.isArray(vars)){
            vars.forEach((val, idx) => { v = v.replace(new RegExp('\\{' + idx + '\\}', 'g'), String(val)); });
        }
        return v;
    }

    function setLanguage(lang){
        if(!DICTS[lang]) lang = 'en';
        current = lang;
        applyToDocument();
        // expose current on ns for other modules
        ns.i18n.current = current;
        // persist
        try { localStorage.setItem('lang', current); } catch(e){}
        // notify interested modules to update dynamic content (cards, etc.)
        try { document.dispatchEvent(new CustomEvent('zp:langchange', { detail: { lang: current } })); } catch(e){}
    }

    function applyToDocument(){
        // elements with data-i18n: set textContent; for inputs use placeholder
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if(!key) return;
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
                el.setAttribute('placeholder', t(key));
            } else {
                try {
                    const children = Array.from(el.childNodes || []);
                    const nonEmptyTextNodes = children.filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
                    if(children.length > 0 && nonEmptyTextNodes.length === 0 && el.querySelector('img')){
                        el.setAttribute('title', t(key));
                        el.setAttribute('aria-label', t(key));
                    } else {
                        el.textContent = t(key);
                    }
                } catch(e){
                    el.textContent = t(key);
                }
            }
        });

        // Some well-known items that use attributes:
        const searchBox = document.getElementById('searchBox');
        if(searchBox) searchBox.setAttribute('placeholder', t('search.placeholder'));

        const refreshBtn = document.getElementById('refreshBtn');
        if(refreshBtn) { refreshBtn.setAttribute('title', t('refresh.title')); refreshBtn.setAttribute('aria-label', t('refresh.title')); }

        const toggleBtn = document.getElementById('toggleBtn');
        if(toggleBtn) toggleBtn.setAttribute('aria-label', t('dark.toggle.aria'));

        const discordBtn = document.getElementById('discordBtn');
        if(discordBtn){ discordBtn.setAttribute('title', t('discord.title')); discordBtn.setAttribute('aria-label', t('discord.title')); }

        // modal controls (update their innerText if data-i18n not processed)
        ['modalPrev','modalNext','modalCopy','modalClose'].forEach(id => {
            const el = document.getElementById(id);
            if(!el) return;
            const key = el.getAttribute('data-i18n');
            if(key) {
                el.textContent = t(key);
            }
        });
    }

    // init: try saved language
    try {
        const saved = localStorage.getItem('lang') || 'en';
        if(DICTS[saved]) current = saved;
    } catch(e){ current = 'en'; }

    ns.i18n = ns.i18n || {};
    Object.assign(ns.i18n, { t, setLanguage, applyToDocument, current });

    // initial apply on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        applyToDocument();
    });

})(window.zp);