// app.js: the whole front end for plugins.yleoft.me.
//
// Data flow: projects.json lists the folders to show, each folder's info.json describes the project,
// and live numbers (stars, versions, downloads) come from GitHub, Modrinth, Spiget and Hangar.
// Every remote response is cached in localStorage and served stale-while-revalidate: cached data
// renders immediately, and anything older than its TTL is refetched in the background.
(() => {
    'use strict';

    const OWNER = 'yL3oft';
    const HOUR = 3600e3;
    const TTL = { repos: HOUR, releases: 6 * HOUR, downloads: 6 * HOUR, contributors: 24 * HOUR };
    const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // ---------------------------------------------------------------- i18n

    const DICT = {
        en: {
            'skip': 'Skip to content',
            'nav.label': 'Main',
            'nav.projects': 'Projects',
            'nav.about': 'About',
            'nav.docs': 'Docs',
            'theme.toLight': 'Switch to light theme',
            'theme.toDark': 'Switch to dark theme',
            'hero.avatarAlt': "yLeoft's Minecraft skin",
            'hero.title': 'I make Minecraft plugins, and now mods too.',
            'hero.lede': 'Server plugins for Paper, Spigot and Folia, Folia ports of plugins that servers depend on, and NeoForge mods. The source for all of it is on GitHub.',
            'hero.browse': 'Browse projects',
            'hero.discord': 'Join the Discord',
            'hero.stats': '<strong>{0}</strong> projects and <strong>{1}</strong> downloads across GitHub, Modrinth, CurseForge, SpigotMC and Hangar.',
            'hero.statsNoDl': '<strong>{0}</strong> projects so far.',
            'projects.title': 'Projects',
            'search.label': 'Search projects',
            'search.placeholder': 'Search projects',
            'filter.type': 'Project type',
            'type.all': 'All',
            'type.plugins': 'Plugins',
            'type.mods': 'Mods',
            'type.libraries': 'Libraries',
            'kind.plugin': 'Plugin',
            'kind.mod': 'Mod',
            'kind.library': 'Library',
            'filter.forks': 'Show forks',
            'filter.clear': 'Clear filters',
            'filter.empty': 'No projects match your filters.',
            'filter.emptyQuery': 'No projects match “{0}”.',
            'sort.label': 'Sort',
            'sort.featured': 'Featured',
            'sort.updated': 'Recently updated',
            'sort.downloads': 'Most downloaded',
            'sort.name': 'Name',
            'flag.fork': 'Fork',
            'flag.dev': 'In development',
            'flag.archived': 'Archived',
            'stat.downloads': 'Downloads',
            'stat.stars': 'Stars',
            'stat.forks': 'Forks',
            'stat.updated': 'Last updated',
            'stat.license': 'License',
            'stat.version': 'Latest version',
            'row.download': 'Download',
            'row.downloadFrom': 'Download {0} from {1}',
            'row.docs': 'Docs',
            'row.docsFor': 'Documentation for {0}',
            'row.source': 'Source',
            'row.sourceFor': 'Source code for {0}',
            'row.dev': 'Not released yet',
            'row.open': 'Details for {0}',
            'load.error': 'The project list couldn’t be loaded. Refresh the page, or browse the projects on <a href="https://github.com/yL3oft">GitHub</a>.',
            'pd.close': 'Close',
            'pd.copy': 'Copy link',
            'pd.copied': 'Link copied',
            'pd.copyFailed': 'Couldn’t copy the link',
            'pd.inReview': '{0} (in review)',
            'pd.inReviewNote': 'The Modrinth page goes live once Modrinth finishes reviewing it.',
            'pd.devNote': 'This project is still in development. Downloads open with the first release.',
            'pd.archivedNote': 'This project is archived and no longer updated. Old releases stay available on GitHub.',
            'pd.details': 'Details',
            'pd.runsOn': 'Runs on',
            'pd.requires': 'Requires',
            'pd.addonFor': 'Addon for',
            'flag.addon': 'Addon',
            'flag.addonFor': 'Addon for {0}',
            'pd.releasesLimited': 'GitHub’s hourly request limit for your network was reached, so releases can’t load until {0}. <a href="{1}" rel="noopener">See them on GitHub</a>.',
            'pd.fromModrinth': 'GitHub isn’t answering right now, so this list comes from Modrinth.',
            'pd.onModrinth': 'View on Modrinth',
            'pd.assetDownloads': '{0} downloads',
            'pd.original': 'Original project',
            'pd.forkOf': 'Fork of <a href="{1}" rel="noopener">{0}</a>. {2}',
            'pd.releases': 'Releases',
            'pd.releasesLoading': 'Loading releases…',
            'pd.releasesNone': 'No releases on GitHub yet.',
            'pd.releasesError': 'GitHub didn’t answer, so releases can’t be shown right now. <a href="{0}" rel="noopener">See them on GitHub</a>.',
            'pd.showAll': 'Show all {0} releases',
            'pd.prerelease': 'Pre-release',
            'pd.onGitHub': 'View on GitHub',
            'pd.notesEmpty': 'No release notes.',
            'pd.notesLoading': 'Loading notes…',
            'pd.contributors': 'Contributors',
            'pd.unknown': 'Unknown',
            'pd.none': 'None',
            'link.github': 'GitHub',
            'link.wiki': 'Documentation',
            'link.javadocs': 'Javadocs',
            'link.jenkins': 'Dev builds',
            'link.bstats': 'bStats',
            'toast.copied': 'Link copied',
            'about.title': 'About',
            'about.p1': 'I write software for Minecraft servers. Most of my plugins are built on zAPI, my own library that takes care of commands, config files and translations, so each plugin can focus on what it actually does.',
            'about.p2': 'When a plugin that servers rely on doesn’t run on Folia, I fork it and port it. Those forks are listed here too, with a link back to the original project.',
            'about.p3': 'Lately I’ve been making NeoForge mods. The first one, Create: FTB Chunks Compat, stops Create’s machines from reaching into land claimed with FTB Chunks.',
            'about.p4': 'Bug reports, ideas and pull requests are always welcome. Discord is the quickest way to reach me.',
            'about.tools': 'What I work with',
            'about.find': 'Where to find me',
            'find.discord': 'Support, updates and feedback',
            'find.github': 'Source code and issue tracker',
            'find.kofi': 'Buy me a coffee if something here helped',
            'find.sponsors': 'Support my work every month',
            'nav.sponsor': 'Sponsor on GitHub',
            'footer.tagline': 'Minecraft plugins and mods, with the source on GitHub.',
            'footer.projects': 'Projects',
            'footer.all': 'All projects',
            'footer.resources': 'Resources',
            'footer.docs': 'Documentation',
            'footer.builds': 'Dev builds (CodeMC)',
            'footer.community': 'Community',
            'footer.mojang': 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
        },
        'pt-BR': {
            'skip': 'Pular para o conteúdo',
            'nav.label': 'Principal',
            'nav.projects': 'Projetos',
            'nav.about': 'Sobre',
            'nav.docs': 'Docs',
            'theme.toLight': 'Mudar para o tema claro',
            'theme.toDark': 'Mudar para o tema escuro',
            'hero.avatarAlt': 'Skin de Minecraft do yLeoft',
            'hero.title': 'Eu faço plugins de Minecraft, e agora mods também.',
            'hero.lede': 'Plugins de servidor para Paper, Spigot e Folia, ports para Folia de plugins dos quais os servidores dependem, e mods para NeoForge. O código de tudo está no GitHub.',
            'hero.browse': 'Ver projetos',
            'hero.discord': 'Entrar no Discord',
            'hero.stats': '<strong>{0}</strong> projetos e <strong>{1}</strong> downloads somando GitHub, Modrinth, CurseForge, SpigotMC e Hangar.',
            'hero.statsNoDl': '<strong>{0}</strong> projetos até agora.',
            'projects.title': 'Projetos',
            'search.label': 'Pesquisar projetos',
            'search.placeholder': 'Pesquisar projetos',
            'filter.type': 'Tipo de projeto',
            'type.all': 'Todos',
            'type.plugins': 'Plugins',
            'type.mods': 'Mods',
            'type.libraries': 'Bibliotecas',
            'kind.plugin': 'Plugin',
            'kind.mod': 'Mod',
            'kind.library': 'Biblioteca',
            'filter.forks': 'Mostrar forks',
            'filter.clear': 'Limpar filtros',
            'filter.empty': 'Nenhum projeto corresponde aos filtros.',
            'filter.emptyQuery': 'Nenhum projeto corresponde a “{0}”.',
            'sort.label': 'Ordenar',
            'sort.featured': 'Destaques',
            'sort.updated': 'Atualizados recentemente',
            'sort.downloads': 'Mais baixados',
            'sort.name': 'Nome',
            'flag.fork': 'Fork',
            'flag.dev': 'Em desenvolvimento',
            'flag.archived': 'Arquivado',
            'stat.downloads': 'Downloads',
            'stat.stars': 'Estrelas',
            'stat.forks': 'Forks',
            'stat.updated': 'Última atualização',
            'stat.license': 'Licença',
            'stat.version': 'Versão mais recente',
            'row.download': 'Baixar',
            'row.downloadFrom': 'Baixar {0} pelo {1}',
            'row.docs': 'Docs',
            'row.docsFor': 'Documentação do {0}',
            'row.source': 'Código',
            'row.sourceFor': 'Código-fonte do {0}',
            'row.dev': 'Ainda não lançado',
            'row.open': 'Detalhes do {0}',
            'load.error': 'Não foi possível carregar a lista de projetos. Recarregue a página ou veja os projetos no <a href="https://github.com/yL3oft">GitHub</a>.',
            'pd.close': 'Fechar',
            'pd.copy': 'Copiar link',
            'pd.copied': 'Link copiado',
            'pd.copyFailed': 'Não foi possível copiar o link',
            'pd.inReview': '{0} (em análise)',
            'pd.inReviewNote': 'A página no Modrinth fica disponível quando o Modrinth terminar a análise.',
            'pd.devNote': 'Este projeto ainda está em desenvolvimento. Os downloads abrem com a primeira versão.',
            'pd.archivedNote': 'Este projeto está arquivado e não recebe mais atualizações. As versões antigas continuam no GitHub.',
            'pd.details': 'Detalhes',
            'pd.runsOn': 'Funciona em',
            'pd.requires': 'Requer',
            'pd.addonFor': 'Addon para',
            'flag.addon': 'Addon',
            'flag.addonFor': 'Addon para {0}',
            'pd.releasesLimited': 'O limite de requisições por hora do GitHub para a sua rede foi atingido, então as versões só carregam às {0}. <a href="{1}" rel="noopener">Veja no GitHub</a>.',
            'pd.fromModrinth': 'O GitHub não está respondendo agora, então esta lista vem do Modrinth.',
            'pd.onModrinth': 'Ver no Modrinth',
            'pd.assetDownloads': '{0} downloads',
            'pd.original': 'Projeto original',
            'pd.forkOf': 'Fork do <a href="{1}" rel="noopener">{0}</a>. {2}',
            'pd.releases': 'Versões',
            'pd.releasesLoading': 'Carregando versões…',
            'pd.releasesNone': 'Ainda não há versões no GitHub.',
            'pd.releasesError': 'O GitHub não respondeu, então as versões não podem ser mostradas agora. <a href="{0}" rel="noopener">Veja no GitHub</a>.',
            'pd.showAll': 'Mostrar todas as {0} versões',
            'pd.prerelease': 'Pré-lançamento',
            'pd.onGitHub': 'Ver no GitHub',
            'pd.notesEmpty': 'Sem notas de versão.',
            'pd.notesLoading': 'Carregando notas…',
            'pd.contributors': 'Contribuidores',
            'pd.unknown': 'Desconhecido',
            'pd.none': 'Nenhuma',
            'link.github': 'GitHub',
            'link.wiki': 'Documentação',
            'link.javadocs': 'Javadocs',
            'link.jenkins': 'Builds de desenvolvimento',
            'link.bstats': 'bStats',
            'toast.copied': 'Link copiado',
            'about.title': 'Sobre',
            'about.p1': 'Eu escrevo software para servidores de Minecraft. A maioria dos meus plugins usa a zAPI, minha própria biblioteca que cuida de comandos, arquivos de configuração e traduções, para que cada plugin foque no que ele realmente faz.',
            'about.p2': 'Quando um plugin do qual os servidores dependem não roda no Folia, eu faço um fork e o porto. Esses forks também aparecem aqui, com link para o projeto original.',
            'about.p3': 'Ultimamente tenho feito mods para NeoForge. O primeiro, Create: FTB Chunks Compat, impede que as máquinas do Create alcancem terrenos protegidos pelo FTB Chunks.',
            'about.p4': 'Relatos de bugs, ideias e pull requests são sempre bem-vindos. O Discord é o jeito mais rápido de falar comigo.',
            'about.tools': 'Com o que eu trabalho',
            'about.find': 'Onde me encontrar',
            'find.discord': 'Suporte, novidades e sugestões',
            'find.github': 'Código-fonte e issues',
            'find.kofi': 'Me pague um café se algo aqui te ajudou',
            'find.sponsors': 'Apoie meu trabalho todo mês',
            'nav.sponsor': 'Patrocinar no GitHub',
            'footer.tagline': 'Plugins e mods de Minecraft, com o código no GitHub.',
            'footer.projects': 'Projetos',
            'footer.all': 'Todos os projetos',
            'footer.resources': 'Recursos',
            'footer.docs': 'Documentação',
            'footer.builds': 'Builds de desenvolvimento (CodeMC)',
            'footer.community': 'Comunidade',
            'footer.mojang': 'Não é um produto oficial do Minecraft. Não é aprovado nem associado à Mojang ou à Microsoft.',
        },
    };

    let lang = document.documentElement.lang === 'pt-BR' ? 'pt-BR' : 'en';

    function t(key, ...args) {
        const s = DICT[lang][key] ?? DICT.en[key] ?? key;
        return args.length ? s.replace(/\{(\d)\}/g, (_, i) => args[i] ?? '') : s;
    }

    // Static page text: data-i18n sets textContent, data-i18n-attr="attr:key;attr:key" sets attributes.
    function applyStaticText() {
        $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        $$('[data-i18n-attr]').forEach(el => {
            el.dataset.i18nAttr.split(';').forEach(pair => {
                const [attr, key] = pair.split(':');
                el.setAttribute(attr, t(key));
            });
        });
        const other = lang === 'en' ? 'pt-BR' : 'en';
        const langBtn = $('#langBtn');
        langBtn.textContent = other === 'en' ? 'EN' : 'PT';
        langBtn.lang = other;
        const langLabel = other === 'en' ? 'Switch to English' : 'Mudar para português';
        langBtn.setAttribute('aria-label', langLabel);
        langBtn.title = langLabel;
        updateThemeButton();
        document.documentElement.classList.remove('i18n-pending');
    }

    // ---------------------------------------------------------------- formatting

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtCompact = n => new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    const fmtNum = n => new Intl.NumberFormat(lang).format(n);
    const fmtTime = ms => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
    const fmtDate = iso => new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));

    function fmtAgo(iso) {
        const diff = (new Date(iso).getTime() - Date.now()) / 1000;
        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
        const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
        for (const [unit, secs] of units) {
            if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
        }
        return rtf.format(0, 'minute');
    }

    function fmtBytes(n) {
        if (n < 1024) return `${n} B`;
        if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 ** 2).toFixed(1)} MB`;
    }

    const listJoin = items => (Intl.ListFormat ? new Intl.ListFormat(lang, { type: 'conjunction' }).format(items) : items.join(', '));

    const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

    // ---------------------------------------------------------------- cache + network

    const CACHE_PREFIX = 'zp2:';

    // One-time cleanup of the previous site's cache keys.
    try {
        Object.keys(localStorage).filter(k => k.startsWith('zplugins:cache:')).forEach(k => localStorage.removeItem(k));
    } catch (e) { /* storage unavailable */ }

    function readCache(key) {
        try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + key)); } catch (e) { return null; }
    }

    function writeCache(key, value, ts = Date.now()) {
        try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts, v: value })); } catch (e) { /* full or blocked */ }
    }

    // Stale-while-revalidate. `apply` runs with the cached value right away (if any),
    // then again with fresh data if the cache was missing or older than `ttl`.
    // Returns a promise that settles once fresh data is in (or immediately if the cache was fresh).
    // A value marked `fallback: true` came from a backup source; it's kept for 10 minutes only,
    // so the main source is tried again soon.
    function load(key, ttl, fetcher, apply) {
        const cached = readCache(key);
        if (cached) apply(cached.v, true);
        if (cached && Date.now() - cached.ts < ttl) return Promise.resolve(cached.v);
        return fetcher().then(value => {
            writeCache(key, value, value && value.fallback ? Date.now() - ttl + 10 * 60e3 : Date.now());
            apply(value, false);
            return value;
        }, err => {
            if (!cached) throw err;
            return cached.v;
        });
    }

    async function getJSON(url, options) {
        const res = await fetch(url, options);
        if (!res.ok) {
            const err = new Error(`${res.status} ${url}`);
            err.status = res.status;
            err.headers = res.headers;
            throw err;
        }
        return res.json();
    }

    // Unauthenticated GitHub API calls are limited to 60 an hour per IP address. When the limit hits,
    // remember when it resets and stop calling until then, so cached data keeps the page working.
    const GH_BLOCK_KEY = 'gh:blockedUntil';

    function ghBlockedUntil() {
        const blocked = readCache(GH_BLOCK_KEY);
        return blocked && blocked.v > Date.now() ? blocked.v : 0;
    }

    async function gh(path) {
        if (ghBlockedUntil()) throw new Error('GitHub rate limited');
        try {
            return await getJSON(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } });
        } catch (err) {
            if (err.status === 403 || err.status === 429) {
                const reset = Number(err.headers.get('x-ratelimit-reset'));
                writeCache(GH_BLOCK_KEY, reset ? reset * 1000 : Date.now() + 15 * 60e3);
            }
            throw err;
        }
    }

    // ---------------------------------------------------------------- project model

    const PLATFORM_NAMES = { spigot: 'Spigot', papermc: 'Paper', paper: 'Paper', purpur: 'Purpur', folia: 'Folia', velocity: 'Velocity', neoforge: 'NeoForge', fabric: 'Fabric', forge: 'Forge', quilt: 'Quilt' };
    const TYPES = ['plugin', 'mod', 'library'];

    function platformName(logoPath) {
        const base = String(logoPath).split('/').pop().replace(/\.\w+$/, '').toLowerCase();
        return PLATFORM_NAMES[base] || base.charAt(0).toUpperCase() + base.slice(1);
    }

    function parseVersion(v) {
        return String(v).replace(/\.x$/i, '').split('.').map(Number);
    }

    function cmpVersion(a, b) {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const d = (a[i] || 0) - (b[i] || 0);
            if (d) return d;
        }
        return 0;
    }

    // ["1.21.x", "1.20.x", "1.8.x"] -> "1.8 – 1.21"
    function versionRange(versions) {
        const parsed = (versions || []).map(parseVersion).filter(v => v.every(n => !Number.isNaN(n)));
        if (!parsed.length) return '';
        parsed.sort(cmpVersion);
        const lo = parsed[0].join('.'), hi = parsed[parsed.length - 1].join('.');
        return lo === hi ? lo : `${lo} – ${hi}`;
    }

    function parseRepo(url) {
        const m = String(url || '').match(/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?]|$)/i);
        return m ? { owner: m[1], name: m[2] } : null;
    }

    function modrinthSlug(info) {
        if (info['modrinth-id']) return info['modrinth-id'];
        const m = String(info.modrinth || '').match(/modrinth\.com\/(?:plugin|mod|project|datapack|shader|resourcepack|modpack)\/([^/#?]+)/i);
        return m ? m[1] : null;
    }

    function spigotId(url) {
        const m = String(url || '').match(/resources\/(?:[^/]*?\.)?(\d+)\/?/i);
        return m && Number(m[1]) > 0 ? m[1] : null;
    }

    function hangarSlug(url) {
        const m = String(url || '').match(/hangar\.papermc\.io\/[^/]+\/([^/#?]+)/i);
        return m ? m[1] : null;
    }

    // CFWidget (api.cfwidget.com) is a public CurseForge mirror; the official API needs a secret key.
    // The numeric project id is more reliable than the slug, which CFWidget sometimes hasn't indexed.
    function cfWidgetPath(info) {
        if (info['curseforge-id']) return String(info['curseforge-id']);
        const m = String(info.curseforge || '').match(/curseforge\.com\/(minecraft\/[^/]+\/[^/#?]+)/i);
        return m ? m[1] : null;
    }

    function makeProject(id, info, order) {
        const platforms = (info.platforms || []).map(p => ({
            names: p.name ? [p.name] : (p.logos || (p.logo ? [p.logo] : [])).map(platformName),
            versions: p.versions || [],
        }));
        const allVersions = platforms.flatMap(p => p.versions);
        return {
            id,
            order,
            info,
            name: info.name || id,
            type: TYPES.includes(info.type) ? info.type : 'plugin',
            fork: info.fork === true,
            addon: info.addon === true,
            requires: Array.isArray(info.requires) ? info.requires : [],
            dev: info.on_dev === true,
            archived: info.archived === true,
            repo: parseRepo(info.url),
            platforms,
            platformNames: [...new Set(platforms.flatMap(p => p.names))],
            mcRange: versionRange(allVersions),
            gh: null,            // { stars, forks, license, pushed, archived }
            releases: null,      // array, or { error: true }
            releaseSource: null, // 'github' or 'modrinth'
            downloads: {},       // { github, modrinth, curseforge, spigot, hangar }
        };
    }

    const desc = p => (lang === 'pt-BR' && p.info.description_pt) || p.info.description || '';
    const forkedDesc = f => (lang === 'pt-BR' && f.description_pt) || f.description || '';
    const isArchived = p => p.archived || (p.gh && p.gh.archived);
    // Libraries are pulled in by other developers' builds, so their download numbers don't mean
    // much; they're neither shown nor counted in the site total.
    const countsDownloads = p => p.type !== 'library';
    const totalDownloads = p => countsDownloads(p) ? Object.values(p.downloads).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0) : 0;
    const hasDownloads = p => countsDownloads(p) && Object.values(p.downloads).some(n => typeof n === 'number');
    const latestRelease = p => (Array.isArray(p.releases) && p.releases[0]) || null;
    const iconSrc = p => `${p.id}/sources/${document.documentElement.dataset.theme === 'light' ? 'lightmode' : 'darkmode'}/logo.webp`;

    // Store pages in the order they're preferred as "the" download.
    function storeLinks(p) {
        const i = p.info;
        const inReview = i['modrinth-status'] === 'review';
        return [
            i.modrinth && { key: 'modrinth', label: 'Modrinth', href: i.modrinth, icon: 'modrinth', review: inReview },
            i.curseforge && { key: 'curseforge', label: 'CurseForge', href: i.curseforge, icon: 'curseforge' },
            i.hangar && { key: 'hangar', label: 'Hangar', href: i.hangar, img: 'sources/global/hangar.svg' },
            i.spigot && spigotId(i.spigot) && { key: 'spigot', label: 'SpigotMC', href: i.spigot, icon: 'spigot' },
        ].filter(Boolean);
    }

    function primaryAction(p) {
        if (p.dev) return null;
        const store = storeLinks(p).find(s => !s.review);
        if (store && !isArchived(p)) return { href: store.href, label: t('row.download'), aria: t('row.downloadFrom', p.name, store.label), icon: store.icon || 'download' };
        if (p.type === 'library' && p.info.wiki) return { href: p.info.wiki, label: t('row.docs'), aria: t('row.docsFor', p.name), icon: 'book' };
        if (p.info.url) return { href: p.info.url, label: t('row.source'), aria: t('row.sourceFor', p.name), icon: 'github' };
        return null;
    }

    // ---------------------------------------------------------------- state

    const state = {
        projects: [],
        type: 'all',
        query: '',
        forks: true,
        sort: 'featured',
    };
    const rows = new Map();   // project id -> <li>

    // ---------------------------------------------------------------- list rendering

    function badgesHTML(p, { withKind = true } = {}) {
        let html = withKind ? `<span class="kind kind-${p.type}">${esc(t('kind.' + p.type))}</span>` : '';
        if (p.addon) {
            const names = p.requires.map(r => r.name);
            html += `<span class="flag flag-addon"${names.length ? ` title="${esc(t('flag.addonFor', listJoin(names)))}"` : ''}>${icon('puzzle')}${esc(t('flag.addon'))}</span>`;
        }
        if (p.fork) html += `<span class="flag">${icon('fork')}${esc(t('flag.fork'))}</span>`;
        if (p.dev) html += `<span class="flag flag-dev">${esc(t('flag.dev'))}</span>`;
        if (isArchived(p)) html += `<span class="flag flag-archived">${esc(t('flag.archived'))}</span>`;
        return html;
    }

    function versionText(p) {
        const rel = latestRelease(p);
        if (!rel) return '';
        return /^\d/.test(rel.tag) ? `v${rel.tag}` : rel.tag;
    }

    function numsHTML(p) {
        let html = '';
        if (hasDownloads(p)) {
            html += `<div title="${esc(t('stat.downloads'))}: ${esc(fmtNum(totalDownloads(p)))}">${icon('download')}<dt class="visually-hidden">${esc(t('stat.downloads'))}</dt><dd>${esc(fmtCompact(totalDownloads(p)))}</dd></div>`;
        }
        if (p.gh && p.gh.stars > 0) {
            html += `<div title="${esc(t('stat.stars'))}">${icon('star')}<dt class="visually-hidden">${esc(t('stat.stars'))}</dt><dd>${esc(fmtCompact(p.gh.stars))}</dd></div>`;
        }
        return html;
    }

    function rowSideHTML(p) {
        const action = primaryAction(p);
        const btn = action
            ? `<a class="btn btn-sm" href="${esc(action.href)}" target="_blank" rel="noopener" aria-label="${esc(action.aria)}">${icon(action.icon)}${esc(action.label)}</a>`
            : `<span class="note">${esc(t('row.dev'))}</span>`;
        return `<dl class="nums" data-slot="nums">${numsHTML(p)}</dl>${btn}`;
    }

    function buildRow(p) {
        const li = document.createElement('li');
        li.className = 'proj';
        li.dataset.id = p.id;
        li.dataset.type = p.type;
        const chips = p.platformNames.map(n => `<li>${esc(n)}</li>`).join('') + (p.mcRange ? `<li class="chip-mc">${esc(p.mcRange)}</li>` : '');
        li.innerHTML = `
            <img class="proj-icon" src="${esc(iconSrc(p))}" width="64" height="64" alt="" loading="lazy" decoding="async">
            <div class="proj-body">
                <div class="proj-top">
                    <h3 class="proj-name"><a class="proj-link" href="#/${encodeURIComponent(p.id)}" aria-label="${esc(t('row.open', p.name))}">${esc(p.name)}</a></h3>
                    <span data-slot="badges" style="display:contents">${badgesHTML(p)}</span>
                    <span class="ver" data-slot="ver">${esc(versionText(p))}</span>
                </div>
                <p class="proj-desc">${esc(desc(p))}</p>
                ${chips ? `<ul class="chips">${chips}</ul>` : ''}
            </div>
            <div class="proj-side" data-slot="side">${rowSideHTML(p)}</div>`;
        const img = li.querySelector('.proj-icon');
        img.addEventListener('error', () => { img.src = `${p.id}/sources/darkmode/logo.png`; }, { once: true });
        patchRowState(li, p);
        return li;
    }

    function patchRowState(li, p) {
        if (isArchived(p)) li.dataset.state = 'archived';
        else if (p.dev) li.dataset.state = 'dev';
        else delete li.dataset.state;
    }

    // Live numbers arrive after the first render; update only the parts that change so focus
    // and hover aren't disturbed.
    function patchRow(p) {
        const li = rows.get(p.id);
        if (!li) return;
        const ver = li.querySelector('[data-slot="ver"]');
        const v = versionText(p);
        if (ver.textContent !== v) ver.textContent = v;
        li.querySelector('[data-slot="nums"]').innerHTML = numsHTML(p);
        li.querySelector('[data-slot="badges"]').innerHTML = badgesHTML(p);
        patchRowState(li, p);
    }

    function normalize(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    function searchText(p) {
        const i = p.info;
        return normalize([p.name, p.id, i.description, i.description_pt, t('kind.' + p.type), p.type, ...p.platformNames,
            p.fork ? 'fork folia' : '', p.addon ? `addon ${t('flag.addon')}` : '', ...p.requires.map(r => r.name),
            i['forked-project'] && i['forked-project'].name].join(' '));
    }

    function matches(p, { ignoreType = false } = {}) {
        if (!state.forks && p.fork) return false;
        if (!ignoreType && state.type !== 'all' && p.type !== state.type) return false;
        if (state.query) {
            const hay = searchText(p);
            return normalize(state.query).split(/\s+/).filter(Boolean).every(word => hay.includes(word));
        }
        return true;
    }

    function sorted(list) {
        const byOrder = (a, b) => a.order - b.order;
        const cmp = {
            featured: byOrder,
            name: (a, b) => a.name.localeCompare(b.name, lang, { sensitivity: 'base' }),
            downloads: (a, b) => totalDownloads(b) - totalDownloads(a) || byOrder(a, b),
            updated: (a, b) => ((b.gh && Date.parse(b.gh.pushed)) || 0) - ((a.gh && Date.parse(a.gh.pushed)) || 0) || byOrder(a, b),
        }[state.sort];
        // Archived projects always go last.
        return list.slice().sort((a, b) => (isArchived(a) - isArchived(b)) || cmp(a, b));
    }

    function renderList() {
        const list = $('#plist');
        const visible = sorted(state.projects.filter(p => matches(p)));

        // Reorder existing rows instead of rebuilding them.
        const wanted = visible.map(p => rows.get(p.id) || rows.set(p.id, buildRow(p)).get(p.id));
        const current = Array.from(list.children);
        if (wanted.length !== current.length || wanted.some((el, i) => el !== current[i])) {
            list.replaceChildren(...wanted);
        }
        list.setAttribute('aria-busy', 'false');

        const empty = $('#empty');
        empty.hidden = visible.length > 0;
        list.hidden = visible.length === 0;
        if (!visible.length) {
            $('#emptyText').textContent = state.query ? t('filter.emptyQuery', state.query) : t('filter.empty');
        }

        // Counts respect the search and fork filters, but not the type filter itself.
        const pool = state.projects.filter(p => matches(p, { ignoreType: true }));
        $$('#types button').forEach(btn => {
            const type = btn.dataset.type;
            const n = type === 'all' ? pool.length : pool.filter(p => p.type === type).length;
            btn.querySelector('.count').textContent = n;
            btn.hidden = type !== 'all' && !state.projects.some(p => p.type === type);
        });
    }

    let statsTimer = 0;
    function renderHeroStats() {
        clearTimeout(statsTimer);
        statsTimer = setTimeout(() => {
            const n = state.projects.length;
            const total = state.projects.reduce((sum, p) => sum + totalDownloads(p), 0);
            $('#heroStats').innerHTML = total > 0 ? t('hero.stats', esc(fmtNum(n)), esc(fmtNum(total))) : t('hero.statsNoDl', esc(fmtNum(n)));
        }, 150);
    }

    // Some sorts depend on live data, so re-sort when it arrives. Batched to one render per frame.
    let listQueued = false;
    function dataChanged(p) {
        patchRow(p);
        renderHeroStats();
        if (state.sort === 'updated' || state.sort === 'downloads') {
            if (!listQueued) {
                listQueued = true;
                requestAnimationFrame(() => { listQueued = false; renderList(); });
            }
        }
        if (dialog.open && dialog.dataset.id === p.id) refreshDialogFacts(p);
    }

    // ---------------------------------------------------------------- live data

    function loadRepos() {
        return load(`gh:repos:${OWNER}`, TTL.repos, async () => {
            const list = await gh(`/users/${OWNER}/repos?per_page=100&type=owner`);
            const slim = {};
            list.forEach(r => {
                slim[r.name.toLowerCase()] = {
                    stars: r.stargazers_count,
                    forks: r.forks_count,
                    license: r.license && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
                    pushed: r.pushed_at,
                    archived: r.archived,
                };
            });
            return slim;
        }, repos => {
            state.projects.forEach(p => {
                const r = p.repo && repos[p.repo.name.toLowerCase()];
                if (r) { p.gh = r; dataChanged(p); }
            });
        }).catch(() => {});
    }

    function slimRelease(r) {
        return {
            tag: r.tag_name,
            name: r.name && r.name !== r.tag_name ? r.name : '',
            date: r.published_at || r.created_at,
            body: r.body || '',
            pre: r.prerelease,
            url: r.html_url,
            assets: (r.assets || []).map(a => ({ name: a.name, url: a.browser_download_url, size: a.size, downloads: a.download_count })),
        };
    }

    function slimModrinthVersion(v, slug) {
        return {
            tag: v.version_number,
            name: v.name && v.name !== v.version_number ? v.name : '',
            date: v.date_published,
            body: v.changelog || '',
            pre: v.version_type !== 'release',
            url: `https://modrinth.com/project/${slug}/version/${v.id}`,
            assets: (v.files || []).map(f => ({ name: f.filename, url: f.url, size: f.size, downloads: null })),
        };
    }

    // Every download of every asset of every release (drafts excluded) on GitHub.
    const githubDownloads = list => list.reduce((sum, r) => sum + r.assets.reduce((n, a) => n + (a.downloads || 0), 0), 0);

    // Releases come from GitHub. If GitHub is rate limited or down, projects that are also on
    // Modrinth fall back to Modrinth's version list, which has the same versions and changelogs.
    const releaseLoads = new Map();
    function loadReleases(p) {
        if (!p.repo) return Promise.resolve();
        if (releaseLoads.has(p.id)) return releaseLoads.get(p.id);
        const { owner, name } = p.repo;
        const slug = !p.info['modrinth-status'] && modrinthSlug(p.info);
        const promise = load(`releases:${owner}/${name}`, TTL.releases, async () => {
            try {
                const list = await gh(`/repos/${owner}/${name}/releases?per_page=100`);
                return { source: 'github', list: list.filter(r => !r.draft).map(slimRelease) };
            } catch (err) {
                if (!slug) throw err;
                const versions = await getJSON(`https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}/version`);
                return { source: 'modrinth', fallback: true, list: versions.map(v => slimModrinthVersion(v, slug)) };
            }
        }, ({ source, list }) => {
            p.releases = list;
            p.releaseSource = source;
            if (source === 'github') p.downloads.github = githubDownloads(list);
            dataChanged(p);
        }).catch(() => {
            if (!Array.isArray(p.releases)) { p.releases = { error: true }; dataChanged(p); }
        });
        releaseLoads.set(p.id, promise);
        return promise;
    }

    function loadDownloads() {
        const live = state.projects.filter(p => !p.dev);

        // Modrinth takes every project in one request (ids and slugs both work).
        const mr = live.map(p => [p, modrinthSlug(p.info)]).filter(([, slug]) => slug);
        if (mr.length) {
            const ids = mr.map(([, slug]) => slug);
            load(`mr:projects:${ids.join(',')}`, TTL.downloads, async () => {
                const list = await getJSON(`https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(JSON.stringify(ids))}`);
                const out = {};
                list.forEach(m => { out[m.id] = m.downloads; out[m.slug.toLowerCase()] = m.downloads; });
                return out;
            }, found => {
                mr.forEach(([p, slug]) => {
                    const n = found[slug] ?? found[slug.toLowerCase()];
                    if (typeof n === 'number') { p.downloads.modrinth = n; dataChanged(p); }
                });
            }).catch(() => {});
        }

        live.forEach(p => {
            const cf = cfWidgetPath(p.info);
            if (cf) {
                load(`cf:${cf}`, TTL.downloads, async () => {
                    const data = await getJSON(`https://api.cfwidget.com/${cf}`);
                    return data.downloads ? data.downloads.total : null;
                }, n => {
                    if (typeof n === 'number') { p.downloads.curseforge = n; dataChanged(p); }
                }).catch(() => {});
            }
            const sid = spigotId(p.info.spigot);
            if (sid) {
                load(`spiget:${sid}`, TTL.downloads, async () => (await getJSON(`https://api.spiget.org/v2/resources/${sid}`)).downloads, n => {
                    if (typeof n === 'number') { p.downloads.spigot = n; dataChanged(p); }
                }).catch(() => {});
            }
            const hslug = hangarSlug(p.info.hangar);
            if (hslug) {
                load(`hangar:${hslug.toLowerCase()}`, TTL.downloads, async () => {
                    const data = await getJSON(`https://hangar.papermc.io/api/v1/projects/${encodeURIComponent(hslug)}`);
                    return data.stats ? data.stats.downloads : null;
                }, n => {
                    if (typeof n === 'number') { p.downloads.hangar = n; dataChanged(p); }
                }).catch(() => {});
            }
        });
    }

    function loadContributors(p) {
        const { owner, name } = p.repo;
        return load(`gh:contributors:${owner}/${name}`, TTL.contributors, async () => {
            const list = await gh(`/repos/${owner}/${name}/contributors?per_page=12`);
            return list.filter(c => c.type !== 'Bot').map(c => ({ login: c.login, avatar: c.avatar_url, url: c.html_url, n: c.contributions }));
        }, () => {});
    }

    // ---------------------------------------------------------------- markdown (loaded on demand)

    let markedPromise = null;
    function loadMarked() {
        if (!markedPromise) {
            markedPromise = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = MARKED_URL;
                s.async = true;
                s.onload = () => resolve(window.marked);
                s.onerror = () => { markedPromise = null; reject(new Error('marked failed to load')); };
                document.head.appendChild(s);
            });
        }
        return markedPromise;
    }

    const ALLOWED_TAGS = new Set(['A', 'P', 'BR', 'HR', 'STRONG', 'B', 'EM', 'I', 'DEL', 'S', 'CODE', 'PRE', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'IMG', 'DETAILS', 'SUMMARY', 'KBD', 'SUP', 'SUB', 'INPUT', 'SPAN', 'DIV']);
    const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'width', 'height', 'type', 'checked', 'disabled', 'align', 'colspan', 'rowspan']);

    // Release notes come from GitHub; keep only plain formatting before putting them in the page.
    function sanitize(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const walk = node => {
            Array.from(node.children).forEach(el => {
                if (!ALLOWED_TAGS.has(el.tagName) || (el.tagName === 'INPUT' && el.type !== 'checkbox')) {
                    el.replaceWith(...(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(el.tagName) ? [] : el.childNodes));
                    return;
                }
                Array.from(el.attributes).forEach(a => {
                    const name = a.name.toLowerCase();
                    if (!ALLOWED_ATTRS.has(name)) el.removeAttribute(a.name);
                    else if ((name === 'href' || name === 'src') && !/^(https?:|mailto:|#|\/|\.\/)/i.test(a.value.trim())) el.removeAttribute(a.name);
                });
                if (el.tagName === 'A') { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
                if (el.tagName === 'IMG') { el.loading = 'lazy'; el.decoding = 'async'; }
                if (el.tagName === 'INPUT') el.disabled = true;
                walk(el);
            });
        };
        walk(tpl.content);
        // Walking can unwrap nodes, which exposes new children; a second pass catches those.
        walk(tpl.content);
        return tpl.innerHTML;
    }

    // ---------------------------------------------------------------- project dialog

    const dialog = $('#pd');

    function linkButtons(p) {
        const i = p.info;
        const out = [];
        const disabled = p.dev;
        storeLinks(p).forEach(s => {
            const iconHTML = s.icon ? icon(s.icon) : `<img src="${esc(s.img)}" alt="" width="18" height="18" loading="lazy">`;
            if (s.review || disabled) {
                out.push(`<span class="btn" aria-disabled="true">${iconHTML}${esc(s.review ? t('pd.inReview', s.label) : s.label)}</span>`);
            } else {
                out.push(`<a class="btn${out.length ? '' : ' btn-primary'}" href="${esc(s.href)}" target="_blank" rel="noopener">${iconHTML}${esc(s.label)}</a>`);
            }
        });
        const secondary = [
            i.wiki && { href: i.wiki, label: t('link.wiki'), icon: 'book' },
            i.javadocs && { href: typeof i.javadocs === 'string' ? i.javadocs : `${p.id}/javadocs/`, label: t('link.javadocs'), icon: 'code', local: typeof i.javadocs !== 'string' },
            i.url && { href: i.url, label: t('link.github'), icon: 'github' },
            i.jenkins && { href: i.jenkins, label: t('link.jenkins'), icon: 'box' },
            i['bstats-id'] && { href: `https://bstats.org/plugin/bukkit/${encodeURIComponent(p.name)}/${i['bstats-id']}`, label: t('link.bstats'), icon: 'chart' },
        ].filter(Boolean);
        secondary.forEach(l => {
            out.push(`<a class="btn" href="${esc(l.href)}"${l.local ? '' : ' target="_blank" rel="noopener"'}>${icon(l.icon)}${esc(l.label)}</a>`);
        });
        return out.join('');
    }

    function dialogNotes(p) {
        const notes = [];
        if (p.dev) notes.push(t('pd.devNote'));
        else if (isArchived(p)) notes.push(t('pd.archivedNote'));
        if (p.info['modrinth-status'] === 'review') notes.push(t('pd.inReviewNote'));
        return notes.map(n => `<p class="pd-note">${esc(n)}</p>`).join('');
    }

    function factsHTML(p) {
        const rows = [];
        const rel = latestRelease(p);
        if (rel) rows.push([t('stat.version'), `<a href="${esc(rel.url)}" target="_blank" rel="noopener">${esc(rel.tag)}</a> <small>${esc(fmtDate(rel.date))}</small>`]);
        if (hasDownloads(p)) {
            const d = p.downloads;
            const parts = [['Modrinth', d.modrinth], ['CurseForge', d.curseforge], ['GitHub', d.github], ['SpigotMC', d.spigot], ['Hangar', d.hangar]]
                .filter(([, n]) => typeof n === 'number' && n > 0)
                .map(([label, n]) => `${esc(label)} ${esc(fmtNum(n))}`);
            rows.push([t('stat.downloads'), `${esc(fmtNum(totalDownloads(p)))}${parts.length > 1 ? `<br><small>${parts.join(', ')}</small>` : ''}`]);
        }
        if (p.gh) {
            rows.push([t('stat.stars'), esc(fmtNum(p.gh.stars))]);
            if (p.gh.forks) rows.push([t('stat.forks'), esc(fmtNum(p.gh.forks))]);
            if (p.gh.pushed) rows.push([t('stat.updated'), `<time datetime="${esc(p.gh.pushed)}" title="${esc(fmtDate(p.gh.pushed))}">${esc(fmtAgo(p.gh.pushed))}</time>`]);
            rows.push([t('stat.license'), esc(p.gh.license || t('pd.none'))]);
        }
        return rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
    }

    function runsOnHTML(p) {
        let html = '';
        if (p.platforms.length) {
            html += `<dl class="facts">${p.platforms.map(pl => `<dt>${esc(pl.names.join(', '))}</dt><dd>${esc(versionRange(pl.versions))}</dd>`).join('')}</dl>`;
        }
        const req = p.requires;
        if (req.length) {
            html += `<h3${p.platforms.length ? ' style="margin-top:20px"' : ''}>${esc(t(p.addon ? 'pd.addonFor' : 'pd.requires'))}</h3><ul class="contribs">${req.map(r =>
                `<li><a href="${esc(r.url)}" target="_blank" rel="noopener" style="padding-left:10px">${esc(r.name)}${r.version ? ` <span class="muted">${esc(r.version)}</span>` : ''}</a></li>`).join('')}</ul>`;
        }
        return html;
    }

    // "v3.0.5" and "3.0.5" are the same release (GitHub tags vs Modrinth version numbers).
    const sameTag = (a, b) => String(a).replace(/^v/i, '') === String(b).replace(/^v/i, '');

    function assetHTML(a) {
        const meta = [fmtBytes(a.size), typeof a.downloads === 'number' ? t('pd.assetDownloads', fmtNum(a.downloads)) : ''].filter(Boolean).join(', ');
        return `<li><a class="asset" href="${esc(a.url)}" rel="noopener">
            <span class="asset-icon">${icon('download')}</span>
            <span class="asset-name">${esc(a.name)}</span>
            <span class="asset-meta">${esc(meta)}</span></a></li>`;
    }

    function releaseHTML(r, i, target, source) {
        const isTarget = target && sameTag(r.tag, target);
        const isOpen = target ? isTarget : i === 0;
        return `<details class="release${isTarget ? ' is-target' : ''}" data-tag="${esc(r.tag)}"${isOpen ? ' open' : ''}>
            <summary><b>${esc(r.tag)}</b>${r.name ? `<span class="rname">${esc(r.name)}</span>` : ''}${r.pre ? `<span class="flag flag-dev">${esc(t('pd.prerelease'))}</span>` : ''}
                <time datetime="${esc(r.date)}" title="${esc(fmtDate(r.date))}">${esc(fmtAgo(r.date))}</time></summary>
            <div class="release-body"><div class="md" data-notes>${esc(t('pd.notesLoading'))}</div>
                ${r.assets.length ? `<ul class="assets">${r.assets.map(assetHTML).join('')}</ul>` : ''}
                <a class="release-link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(t(source === 'modrinth' ? 'pd.onModrinth' : 'pd.onGitHub'))}${icon('external')}</a>
            </div>
        </details>`;
    }

    async function fillNotes(details, release) {
        const box = details.querySelector('[data-notes]');
        if (!box || box.dataset.done) return;
        box.dataset.done = '1';
        if (!release.body.trim()) { box.innerHTML = `<p class="muted">${esc(t('pd.notesEmpty'))}</p>`; return; }
        try {
            const marked = await loadMarked();
            box.innerHTML = sanitize(marked.parse(release.body, { gfm: true }));
        } catch (e) {
            box.textContent = release.body;
            box.style.whiteSpace = 'pre-wrap';
        }
    }

    function renderReleases(p, target) {
        const box = dialog.querySelector('#pdReleases');
        if (!box) return;
        if (!p.repo) { box.closest('.pd-section').hidden = true; return; }
        if (p.releases == null) { box.innerHTML = `<p class="muted">${esc(t('pd.releasesLoading'))}</p>`; return; }
        if (!Array.isArray(p.releases)) {
            const until = ghBlockedUntil();
            const link = esc(`${p.info.url}/releases`);
            box.innerHTML = `<p class="muted">${until ? t('pd.releasesLimited', esc(fmtTime(until)), link) : t('pd.releasesError', link)}</p>`;
            return;
        }
        if (!p.releases.length) { box.innerHTML = `<p class="muted">${esc(t('pd.releasesNone'))}</p>`; return; }

        const targetIndex = target ? p.releases.findIndex(r => sameTag(r.tag, target)) : -1;
        const limit = Math.max(5, targetIndex + 1);
        const shown = p.releases.slice(0, box.dataset.all ? p.releases.length : limit);
        const note = p.releaseSource === 'modrinth' ? `<p class="pd-note" style="margin:0 0 10px">${esc(t('pd.fromModrinth'))}</p>` : '';
        box.innerHTML = `${note}<div class="releases">${shown.map((r, i) => releaseHTML(r, i, targetIndex >= 0 ? target : null, p.releaseSource)).join('')}</div>` +
            (shown.length < p.releases.length ? `<p style="margin-top:12px"><button type="button" class="linkish" data-show-all>${esc(t('pd.showAll', p.releases.length))}</button></p>` : '');

        $$('details.release', box).forEach(d => {
            const release = p.releases.find(r => r.tag === d.dataset.tag);
            if (d.open) fillNotes(d, release);
            d.addEventListener('toggle', () => { if (d.open) fillNotes(d, release); });
        });
        const more = box.querySelector('[data-show-all]');
        if (more) more.addEventListener('click', () => { box.dataset.all = '1'; renderReleases(p, target); });
        if (targetIndex >= 0) {
            const el = box.querySelector('.release.is-target');
            if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }));
        }
    }

    function refreshDialogFacts(p) {
        const facts = dialog.querySelector('#pdFacts');
        if (facts) {
            facts.innerHTML = factsHTML(p);
            dialog.querySelector('#pdFactsSection').hidden = !facts.innerHTML;
        }
        const badges = dialog.querySelector('#pdBadges');
        if (badges) badges.innerHTML = dialogBadges(p);
        const box = dialog.querySelector('#pdReleases');
        if (box && !box.querySelector('.releases')) renderReleases(p, dialog.dataset.target || null);
    }

    function dialogBadges(p) {
        const v = versionText(p);
        return badgesHTML(p) + (v ? `<span class="ver">${esc(v)}</span>` : '') + (p.gh && p.gh.license ? `<span class="flag">${esc(p.gh.license)}</span>` : '');
    }

    function renderContributors(p) {
        const box = dialog.querySelector('#pdContrib');
        if (!box || !p.repo) return;
        loadContributors(p).then(list => {
            if (dialog.dataset.id !== p.id) return;
            if (!list || !list.length) { box.closest('.pd-section').hidden = true; return; }
            box.innerHTML = list.map(c => `<a href="${esc(c.url)}" target="_blank" rel="noopener" title="${esc(c.login)}: ${esc(fmtNum(c.n))} commits">
                <img src="${esc(c.avatar)}&s=52" alt="" width="26" height="26" loading="lazy" decoding="async">${esc(c.login)}</a>`).join('');
        }).catch(() => { box.closest('.pd-section').hidden = true; });
    }

    function openProject(p, target) {
        const f = p.info['forked-project'];
        dialog.dataset.id = p.id;
        dialog.dataset.target = target || '';
        dialog.setAttribute('data-type', p.type);
        dialog.innerHTML = `
            <header class="pd-head">
                <img src="${esc(iconSrc(p))}" width="72" height="72" alt="">
                <div>
                    <h2 id="pdTitle">${esc(p.name)}</h2>
                    <div class="pd-badges" id="pdBadges">${dialogBadges(p)}</div>
                </div>
                <div class="header-actions">
                    <button class="hbtn" type="button" data-copy aria-label="${esc(t('pd.copy'))}" title="${esc(t('pd.copy'))}">${icon('link')}</button>
                    <button class="hbtn" type="button" data-close aria-label="${esc(t('pd.close'))}" title="${esc(t('pd.close'))}">${icon('close')}</button>
                </div>
            </header>
            <div class="pd-body">
                <p class="pd-desc">${esc(desc(p))}</p>
                <div class="pd-links">${linkButtons(p)}</div>
                ${dialogNotes(p)}
                ${f ? `<section class="pd-section"><h3>${esc(t('pd.original'))}</h3><p class="fork-box">${t('pd.forkOf', esc(f.name), esc(f.url), esc(forkedDesc(f)))}</p></section>` : ''}
                <div class="pd-grid">
                    <section class="pd-section" id="pdFactsSection"${factsHTML(p) ? '' : ' hidden'}><h3>${esc(t('pd.details'))}</h3><dl class="facts" id="pdFacts">${factsHTML(p)}</dl></section>
                    ${p.platforms.length || (p.info.requires || []).length ? `<section class="pd-section"><h3>${esc(t('pd.runsOn'))}</h3>${runsOnHTML(p)}</section>` : ''}
                </div>
                <section class="pd-section"><h3>${esc(t('pd.releases'))}</h3><div id="pdReleases"></div></section>
                <section class="pd-section"><h3>${esc(t('pd.contributors'))}</h3><div class="contribs" id="pdContrib"></div></section>
            </div>`;

        const img = dialog.querySelector('.pd-head img');
        img.addEventListener('error', () => { img.src = `${p.id}/sources/darkmode/logo.png`; }, { once: true });

        renderReleases(p, target);
        loadReleases(p).then(() => { if (dialog.dataset.id === p.id) renderReleases(p, target); });
        renderContributors(p);

        if (!dialog.open) {
            dialog.showModal();
            dialog.scrollTop = 0;
        }
        dialog.querySelector('[data-close]').focus();
    }

    // Bookkeeping runs synchronously here rather than in the dialog's 'close' event, which fires
    // a task later: a project opened in between would otherwise get wiped or navigated away.
    function closeDialog() {
        if (!dialog.open) return;
        dialog.close();
        dialog.innerHTML = '';
        delete dialog.dataset.id;
        // Drop the #/project hash: step back over the entry we pushed, or just clean the URL.
        if (location.hash.startsWith('#/') || location.hash.startsWith('#release:')) {
            if (history.state && history.state.zpOpened) stepBack();
            else history.replaceState(null, '', location.pathname + location.search);
        }
        const row = lastRowFocus && rows.get(lastRowFocus);
        if (row) row.querySelector('.proj-link').focus({ preventScroll: true });
    }

    // Esc goes through closeDialog too, so every way of closing behaves the same.
    dialog.addEventListener('cancel', e => {
        e.preventDefault();
        closeDialog();
    });

    dialog.addEventListener('click', e => {
        if (e.target === dialog) return closeDialog();   // backdrop
        if (e.target.closest('[data-close]')) return closeDialog();
        if (e.target.closest('[data-copy]')) {
            const url = `${location.origin}${location.pathname}#/${encodeURIComponent(dialog.dataset.id)}`;
            (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
                .then(() => toast(t('pd.copied')), () => toast(t('pd.copyFailed')));
        }
    });

    let toastTimer = 0;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
    }

    // ---------------------------------------------------------------- routing
    // #/zHomes opens a project. #release:owner/repo:tag is the old site's deep-link format; it
    // still works and opens the project with that release expanded.

    let lastRowFocus = null;

    // history.back() finishes asynchronously. Until it does, new navigations wait for it; otherwise
    // opening another project right after closing one would be undone by the late back step.
    let pendingBack = null;
    function stepBack() {
        pendingBack = new Promise(resolve => {
            const done = () => { window.removeEventListener('popstate', done); clearTimeout(timer); pendingBack = null; resolve(); };
            const timer = setTimeout(done, 2000);
            window.addEventListener('popstate', done);
        });
        history.back();
    }

    function findProject(idOrRepo) {
        const key = String(idOrRepo).toLowerCase();
        return state.projects.find(p => p.id.toLowerCase() === key)
            || state.projects.find(p => p.repo && `${p.repo.owner}/${p.repo.name}`.toLowerCase() === key);
    }

    function route() {
        const hash = location.hash;
        let project = null, target = null;
        if (hash.startsWith('#/')) {
            project = findProject(decodeURIComponent(hash.slice(2)));
        } else if (hash.startsWith('#release:')) {
            const m = hash.slice(9).match(/^([^:]+\/[^:]+):(.+)$/);
            if (m) {
                project = findProject(m[1]);
                try { target = decodeURIComponent(m[2]); } catch (e) { target = m[2]; }
            }
        }
        if (project) {
            if (dialog.dataset.id !== project.id || target) openProject(project, target);
        } else if (dialog.open && !hash.startsWith('#/')) {
            closeDialog();
        }
    }

    // Clicking a row pushes #/id; mark that history entry so closing the dialog can step back
    // instead of leaving an extra entry behind.
    document.addEventListener('click', e => {
        const link = e.target.closest('a[href^="#/"]');
        if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const row = link.closest('.proj');
        lastRowFocus = row ? row.dataset.id : null;
        const go = () => {
            history.pushState({ zpOpened: true }, '', link.getAttribute('href'));
            route();
        };
        if (pendingBack) pendingBack.then(go); else go();
    });
    window.addEventListener('popstate', route);
    window.addEventListener('hashchange', route);

    // ---------------------------------------------------------------- controls

    function setType(type) {
        state.type = type;
        $$('#types button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
        renderList();
    }

    $('#types').addEventListener('click', e => {
        const btn = e.target.closest('button[data-type]');
        if (btn) setType(btn.dataset.type);
    });

    const search = $('#q');
    let searchTimer = 0;
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { state.query = search.value.trim(); renderList(); }, 80);
    });
    search.addEventListener('keydown', e => {
        if (e.key === 'Escape' && search.value) { e.stopPropagation(); search.value = ''; state.query = ''; renderList(); }
    });

    $('#showForks').addEventListener('change', e => { state.forks = e.target.checked; renderList(); });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; renderList(); });
    $('#clearFilters').addEventListener('click', () => {
        search.value = '';
        state.query = '';
        state.forks = true;
        $('#showForks').checked = true;
        setType('all');
    });

    document.addEventListener('keydown', e => {
        if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || dialog.open) return;
        const el = document.activeElement;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        e.preventDefault();
        search.focus();
        search.select();
    });

    // Theme
    function updateThemeButton() {
        const light = document.documentElement.dataset.theme === 'light';
        const label = t(light ? 'theme.toDark' : 'theme.toLight');
        const btn = $('#themeBtn');
        btn.setAttribute('aria-label', label);
        btn.title = label;
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.content = light ? '#eef2f8' : '#0f1420';
    }

    $('#themeBtn').addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) {}
        updateThemeButton();
        state.projects.forEach(p => {
            const img = rows.get(p.id) && rows.get(p.id).querySelector('.proj-icon');
            if (img) img.src = iconSrc(p);
        });
        const dImg = dialog.open && dialog.querySelector('.pd-head img');
        if (dImg) dImg.src = iconSrc(findProject(dialog.dataset.id));
    });

    // Language
    $('#langBtn').addEventListener('click', () => {
        lang = lang === 'en' ? 'pt-BR' : 'en';
        document.documentElement.lang = lang;
        try { localStorage.setItem('lang', lang); } catch (e) {}
        applyStaticText();
        // Row text is language-dependent: rebuild rows, then re-render.
        rows.clear();
        $('#plist').replaceChildren();
        renderList();
        renderHeroStats();
        if (dialog.open) openProject(findProject(dialog.dataset.id), dialog.dataset.target || null);
    });

    // ---------------------------------------------------------------- boot

    async function boot() {
        $('#year').textContent = new Date().getFullYear();
        applyStaticText();

        let folders;
        try {
            folders = await getJSON('projects.json');
        } catch (e) {
            $('#plist').innerHTML = `<li class="load-error">${t('load.error')}</li>`;
            return;
        }
        folders = folders.filter(f => typeof f === 'string' && f !== 'sources');
        const infos = await Promise.all(folders.map(f => getJSON(`${f}/info.json`).then(i => (Array.isArray(i) ? i[0] : i)).catch(() => null)));
        state.projects = folders.map((f, i) => infos[i] && makeProject(f, infos[i], i)).filter(Boolean);

        renderList();
        renderHeroStats();
        route();

        loadRepos();
        loadDownloads();
        state.projects.filter(p => !p.dev).forEach(loadReleases);
    }

    boot();

    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    }
})();
