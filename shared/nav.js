const NAV_SECTIONS = [
    { title: null, links: [
        { label: 'Hub', icon: '&#9670;', href: '/site.html' }
    ]},
    { title: 'Fondation', links: [
        { label: 'Couleurs', icon: '&#127912;', href: '/pages/fondation.html#colors' },
        { label: 'Typographie', icon: 'Aa', href: '/pages/fondation.html#typography' },
        { label: 'Spacing', icon: '&#9638;', href: '/pages/fondation.html#spacing' },
        { label: 'Tokens CSS', icon: '{}', href: '/pages/fondation.html#tokens' },
        { label: 'Theming', icon: '&#9775;', href: '/pages/fondation.html#theming' }
    ]},
    { title: 'Composants', links: [
        { label: 'Boutons', icon: '&#9654;', href: '/pages/composants.html#buttons' },
        { label: 'Cards', icon: '&#9744;', href: '/pages/composants.html#cards' },
        { label: 'Badges & Tags', icon: '&#9679;', href: '/pages/composants.html#badges' },
        { label: 'Avatars', icon: '&#9786;', href: '/pages/composants.html#avatars' },
        { label: 'Theme Switcher', icon: '&#9775;', href: '/pages/composants.html#theme-switcher' }
    ]},
    { title: 'Formulaires', links: [
        { label: 'Inputs', icon: '&#9998;', href: '/pages/formulaires.html#inputs' },
        { label: 'Controls', icon: '&#9881;', href: '/pages/formulaires.html#controls' },
        { label: 'Login / Auth', icon: '&#128274;', href: '/pages/formulaires.html#login' },
        { label: 'Calendrier', icon: '&#128197;', href: '/pages/formulaires.html#calendar' },
        { label: 'Dropdown', icon: '&#9662;', href: '/pages/formulaires.html#dropdown' },
        { label: 'File Upload', icon: '&#128206;', href: '/pages/formulaires.html#file-upload' }
    ]},
    { title: 'Navigation', links: [
        { label: 'Tabs & Nav', icon: '&#9776;', href: '/pages/navigation.html#nav-components' },
        { label: 'Stepper', icon: '&#8594;', href: '/pages/navigation.html#stepper' },
        { label: 'Pagination', icon: '&#8230;', href: '/pages/navigation.html#pagination' }
    ]},
    { title: 'Data', links: [
        { label: 'Stats', icon: '#', href: '/pages/data.html#stats' },
        { label: 'Progress', icon: '&#9632;', href: '/pages/data.html#progress' },
        { label: 'Tables', icon: '&#9638;', href: '/pages/data.html#tables' },
        { label: 'Charts', icon: '&#9636;', href: '/pages/data.html#charts' },
        { label: 'Listes', icon: '&#9776;', href: '/pages/data.html#lists' }
    ]},
    { title: 'Feedback', links: [
        { label: 'Alertes', icon: '&#9888;', href: '/pages/feedback.html#alerts' },
        { label: 'Toasts', icon: '&#9993;', href: '/pages/feedback.html#toasts' },
        { label: 'Modals', icon: '&#9634;', href: '/pages/feedback.html#modals' },
        { label: 'Skeleton', icon: '&#9604;', href: '/pages/feedback.html#skeleton' },
        { label: 'Drawer', icon: '&#9646;', href: '/pages/feedback.html#drawer' },
        { label: 'Empty States', icon: '&#9744;', href: '/pages/feedback.html#empty-states' },
        { label: 'Spinners', icon: '&#10227;', href: '/pages/feedback.html#spinners' }
    ]},
    { title: 'Divers', links: [
        { label: 'Timeline', icon: '&#8942;', href: '/pages/divers.html#timeline' },
        { label: 'Accordion', icon: '&#9660;', href: '/pages/divers.html#accordion' },
        { label: 'Code', icon: '&lt;/&gt;', href: '/pages/divers.html#code' },
        { label: 'Tooltip/Popover', icon: '&#128172;', href: '/pages/divers.html#tooltip' },
        { label: 'Cmd Palette', icon: '&#8984;', href: '/pages/divers.html#command-palette' }
    ]},
    { title: 'Templates', links: [
        { label: 'Kanban', icon: '&#8862;', href: '/pages/templates.html#kanban' },
        { label: 'Roadmap', icon: '&#9656;', href: '/pages/templates.html#roadmap' },
        { label: 'Backlog', icon: '&#9776;', href: '/pages/templates.html#backlog' },
        { label: 'Sprint Board', icon: '&#10227;', href: '/pages/templates.html#sprint' }
    ]}
];

// Current scroll spy observer (so we can disconnect on page swap)
let scrollSpyObserver = null;

function buildHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;
    header.innerHTML = ''
        + '<button class="header-burger" id="header-burger" aria-label="Ouvrir le menu">&#9776;</button>'
        + '<a href="/site.html" class="header-logo">msyx.design</a>'
        + '<span class="header-version">v2.3</span>'
        + '<span class="header-spacer"></span>'
        + '<div class="header-controls">'
        +   '<div class="theme-switcher">'
        +     '<label class="theme-switcher-label" for="theme-select">Theme</label>'
        +     '<select id="theme-select" class="theme-switcher-select" aria-label="Choisir le theme">'
        +       '<option value="msyx">MSYX</option>'
        +       '<option value="acssi">ACSSI</option>'
        +       '<option value="nhood">Nhood</option>'
        +     '</select>'
        +   '</div>'
        +   '<div class="mode-toggle">'
        +     '<span class="mode-toggle-label">Mode</span>'
        +     '<button id="mode-dark" class="mode-toggle-btn" aria-label="Mode sombre" title="Dark">&#9790;</button>'
        +     '<button id="mode-light" class="mode-toggle-btn" aria-label="Mode clair" title="Light">&#9788;</button>'
        +   '</div>'
        + '</div>';
    var burger = document.getElementById('header-burger');
    var sidebar = document.getElementById('sidebar');
    if (burger && sidebar) {
        burger.addEventListener('click', function() { sidebar.classList.toggle('open'); });
    }
    if (typeof initThemeSwitcher === 'function') initThemeSwitcher();
    if (typeof initModeSwitcher === 'function') initModeSwitcher();
}

function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    let html = '';
    NAV_SECTIONS.forEach(section => {
        if (section.title) html += '<div class="sidebar-section">' + section.title + '</div>';
        section.links.forEach(link => {
            html += '<a href="' + link.href + '" class="sidebar-link" data-href="' + link.href + '"><span class="icon">' + link.icon + '</span> ' + link.label + '</a>';
        });
    });
    html += '<div class="sidebar-footer"><p>msyx.fr — 2026</p></div>';
    sidebar.innerHTML = html;
    updateActiveLink();
    bindSidebarClicks();
}

function updateActiveLink(targetUrl) {
    const url = targetUrl || (location.pathname + location.hash);
    const currentPath = location.pathname;
    const currentHash = location.hash;

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    // Try exact match first (path + hash)
    let found = false;
    document.querySelectorAll('.sidebar-link').forEach(l => {
        const href = l.dataset.href;
        if (!href) return;
        const [linkPath, linkHash] = href.split('#');
        if (currentPath.endsWith(linkPath) && currentHash === '#' + linkHash) {
            l.classList.add('active');
            found = true;
        }
    });

    // If no exact match, mark first link of current page
    if (!found) {
        document.querySelectorAll('.sidebar-link').forEach(l => {
            if (found) return;
            const href = l.dataset.href;
            if (!href) return;
            const linkPath = href.split('#')[0];
            if (currentPath.endsWith(linkPath)) {
                l.classList.add('active');
                found = true;
            }
        });
    }
}

function bindSidebarClicks() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.querySelectorAll('.sidebar-link').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const href = a.dataset.href;
            if (!href) return;

            const [linkPath, linkHash] = href.split('#');
            const currentPath = location.pathname;
            const isSamePage = currentPath.endsWith(linkPath);

            if (isSamePage && linkHash) {
                // Same page: smooth scroll
                const target = document.getElementById(linkHash);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + linkHash);
                updateActiveLink();
                sidebar.classList.remove('open');
            } else {
                // Different page: SPA navigation
                navigateTo(href);
            }
        });
    });
}

async function navigateTo(url) {
    const [path, hash] = url.split('#');
    try {
        const resp = await fetch(path);
        if (!resp.ok) { window.location.href = url; return; }
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('.main');
        const currentMain = document.querySelector('.main');
        if (!newMain || !currentMain) { window.location.href = url; return; }

        // Swap content
        currentMain.innerHTML = newMain.innerHTML;

        // Update URL and title
        history.pushState({ url: url }, doc.title, url);
        document.title = doc.title;

        // Scroll to hash or top
        if (hash) {
            const target = document.getElementById(hash);
            if (target) {
                setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }
        } else {
            window.scrollTo(0, 0);
        }

        // Update sidebar active state
        updateActiveLink();
        document.getElementById('sidebar').classList.remove('open');

        // Re-init components for new content
        reinitComponents();
    } catch (err) {
        window.location.href = url;
    }
}

function reinitComponents() {
    // Disconnect old scroll spy
    if (scrollSpyObserver) { scrollSpyObserver.disconnect(); scrollSpyObserver = null; }
    // Re-init scroll spy
    initScrollSpy();
    // Trigger components.js re-init
    if (typeof window.__initComponents === 'function') window.__initComponents();
}

function initScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;
    scrollSpyObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.sidebar-link').forEach(l => {
                    const href = l.dataset.href || '';
                    if (href.endsWith('#' + id)) {
                        document.querySelectorAll('.sidebar-link').forEach(x => x.classList.remove('active'));
                        l.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(s => scrollSpyObserver.observe(s));
}

// Handle back/forward browser buttons
window.addEventListener('popstate', () => {
    const url = location.pathname + location.hash;
    // Re-fetch the page content
    const path = location.pathname;
    fetch(path).then(r => r.text()).then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('.main');
        const currentMain = document.querySelector('.main');
        if (newMain && currentMain) {
            currentMain.innerHTML = newMain.innerHTML;
            document.title = doc.title;
            updateActiveLink();
            reinitComponents();
            if (location.hash) {
                const target = document.querySelector(location.hash);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo(0, 0);
            }
        }
    }).catch(() => location.reload());
});

// Also handle hub card clicks (SPA navigation)
document.addEventListener('click', e => {
    const card = e.target.closest('.hub-card');
    if (card && card.href) {
        e.preventDefault();
        navigateTo(card.getAttribute('href'));
    }
});

document.addEventListener('DOMContentLoaded', () => { buildHeader(); buildSidebar(); initScrollSpy(); });
