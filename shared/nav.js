/* @ds-version 2.46.0 */
const VERSION = '2.45.0';

const NAV_SECTIONS = [
    { title: null, links: [
        { label: 'Hub', icon: '&#9670;', href: '/site.html' },
        { label: 'Getting Started', icon: '&#9654;', href: '/pages/getting-started.html' }
    ]},
    { title: 'Fondation', links: [
        { label: 'Couleurs', icon: '&#127912;', href: '/pages/fondation.html#colors' },
        { label: 'Typographie', icon: 'Aa', href: '/pages/fondation.html#typography' },
        { label: 'Spacing', icon: '&#9638;', href: '/pages/fondation.html#spacing' },
        { label: 'Tokens CSS', icon: '{}', href: '/pages/fondation.html#tokens' },
        { label: 'Theming', icon: '&#9775;', href: '/pages/fondation.html#theming' },
        { label: 'Utilitaires', icon: '&#9638;', href: '/pages/fondation.html#utilities' },
        { label: 'Texture', icon: '&#9617;', href: '/pages/fondation.html#texture' },
        { label: 'Motion', icon: '&#9889;', href: '/pages/motion.html#durations' }
    ]},
    { title: 'Composants', links: [
        { label: 'Boutons', icon: '&#9654;', href: '/pages/composants.html#buttons' },
        { label: 'Cards', icon: '&#9744;', href: '/pages/composants.html#cards' },
        { label: 'Badges & Tags', icon: '&#9679;', href: '/pages/composants.html#badges' },
        { label: 'Chips', icon: '&#10005;', href: '/pages/composants.html#chips' },
        { label: 'Divider', icon: '&#9135;', href: '/pages/composants.html#dividers' },
        { label: 'Rating', icon: '&#9733;', href: '/pages/composants.html#rating' },
        { label: 'Avatars', icon: '&#9786;', href: '/pages/composants.html#avatars' },
        { label: 'Theme Switcher', icon: '&#9775;', href: '/pages/composants.html#theme-switcher' },
        { label: 'Tooltip/Popover', icon: '&#128172;', href: '/pages/composants.html#tooltip' },
        { label: 'FAB', icon: '&#43;', href: '/pages/composants.html#fab' },
        { label: 'Action Menu', icon: '&#8942;', href: '/pages/composants.html#action-menu' }
    ]},
    { title: 'Formulaires', links: [
        { label: 'Inputs', icon: '&#9998;', href: '/pages/formulaires.html#inputs' },
        { label: 'Controls', icon: '&#9881;', href: '/pages/formulaires.html#controls' },
        { label: 'Login / Auth', icon: '&#128274;', href: '/pages/formulaires.html#login' },
        { label: 'Calendrier', icon: '&#128197;', href: '/pages/formulaires.html#calendar' },
        { label: 'Dropdown', icon: '&#9662;', href: '/pages/formulaires.html#dropdown' },
        { label: 'File Upload', icon: '&#128206;', href: '/pages/formulaires.html#file-upload' },
        { label: 'Slider / Range', icon: '&#8942;', href: '/pages/formulaires.html#slider' },
        { label: 'Search Input', icon: '&#128269;', href: '/pages/formulaires.html#search-input' },
        { label: 'Number Input', icon: '&#177;', href: '/pages/formulaires.html#number-input' },
        { label: 'OTP Input', icon: '&#9872;', href: '/pages/formulaires.html#otp-input' },
        { label: 'Tag Input', icon: '&#127991;', href: '/pages/formulaires.html#tag-input' },
        { label: 'Wizard', icon: '&#8594;', href: '/pages/formulaires.html#wizard' },
        { label: 'Inline Edit', icon: '&#9998;', href: '/pages/formulaires.html#inline-edit' }
    ]},
    { title: 'Navigation', links: [
        { label: 'Header User', icon: '&#128100;', href: '/pages/navigation.html#header-user' },
        { label: 'Tabs & Nav', icon: '&#9776;', href: '/pages/navigation.html#nav-components' },
        { label: 'Breadcrumbs', icon: '&#8250;', href: '/pages/navigation.html#breadcrumbs' },
        { label: 'Stepper', icon: '&#8594;', href: '/pages/navigation.html#stepper' },
        { label: 'Segmented', icon: '&#9632;', href: '/pages/navigation.html#segmented-control' },
        { label: 'Pagination', icon: '&#8230;', href: '/pages/navigation.html#pagination' },
        { label: 'Bottom Nav', icon: '&#9635;', href: '/pages/navigation.html#bottom-nav' },
        { label: 'Sidebar Rail', icon: '&#9646;', href: '/pages/navigation.html#sidebar-rail' }
    ]},
    { title: 'Data', links: [
        { label: 'Stats', icon: '#', href: '/pages/data.html#stats' },
        { label: 'Progress', icon: '&#9632;', href: '/pages/data.html#progress' },
        { label: 'Tables', icon: '&#9638;', href: '/pages/data.html#tables' },
        { label: 'Data Grid', icon: '&#9639;', href: '/pages/data.html#data-grid' },
        { label: 'Charts', icon: '&#9636;', href: '/pages/data.html#charts' },
        { label: 'Pie & Donut', icon: '&#9685;', href: '/pages/data.html#pie-donut' },
        { label: 'Tree View', icon: '&#9656;', href: '/pages/data.html#tree-view' },
        { label: 'Gauge', icon: '&#9685;', href: '/pages/data.html#gauge' },
        { label: 'Listes', icon: '&#9776;', href: '/pages/data.html#lists' },
        { label: 'Matrice Risque', icon: '&#9888;', href: '/pages/data.html#risk-matrix' }
    ]},
    { title: 'Feedback', links: [
        { label: 'Alertes', icon: '&#9888;', href: '/pages/feedback.html#alerts' },
        { label: 'Toasts', icon: '&#9993;', href: '/pages/feedback.html#toasts' },
        { label: 'Modals', icon: '&#9634;', href: '/pages/feedback.html#modals' },
        { label: 'Skeleton', icon: '&#9604;', href: '/pages/feedback.html#skeleton' },
        { label: 'Drawer', icon: '&#9646;', href: '/pages/feedback.html#drawer' },
        { label: 'Zone Banner', icon: '&#9646;', href: '/pages/feedback.html#zone-banner' },
        { label: 'Empty States', icon: '&#9744;', href: '/pages/feedback.html#empty-states' },
        { label: 'Bottom Sheet', icon: '&#9650;', href: '/pages/feedback.html#bottom-sheet' },
        { label: 'Spinners', icon: '&#10227;', href: '/pages/feedback.html#spinners' }
    ]},
    { title: 'Avancé', links: [
        { label: 'Timeline', icon: '&#8942;', href: '/pages/divers.html#timeline' },
        { label: 'Accordion', icon: '&#9660;', href: '/pages/divers.html#accordion' },
        { label: 'Code', icon: '&lt;/&gt;', href: '/pages/divers.html#code' },
        { label: 'Copy Button', icon: '&#128203;', href: '/pages/divers.html#copy-button' },
        { label: 'Carousel', icon: '&#9654;', href: '/pages/divers.html#carousel' },
        { label: 'Lightbox', icon: '&#128247;', href: '/pages/divers.html#lightbox' },
        { label: 'Context Menu', icon: '&#9776;', href: '/pages/divers.html#context-menu' },
        { label: 'Cmd Palette', icon: '&#8984;', href: '/pages/divers.html#command-palette' },
        { label: 'Video Embed', icon: '&#127909;', href: '/pages/divers.html#video-embed' },
        { label: 'Decision Tree', icon: '&#9656;', href: '/pages/divers.html#decision-tree' },
        { label: 'Before/After', icon: '&#8596;', href: '/pages/divers.html#before-after' }
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

    // Lire la config consommateur
    var cfg = (typeof window.MSYX_HEADER === 'object' && window.MSYX_HEADER) ? window.MSYX_HEADER : {};
    var authEnabled = !!cfg.auth;
    var user = cfg.user || {};
    var notifCfg = cfg.notifications || {};
    var menuItems = cfg.menu || [
        { label: 'Profil', icon: '&#128100;', href: '#' },
        { label: 'Preferences', icon: '&#9881;', href: '#' },
        { divider: true },
        { label: 'Deconnexion', icon: '&#128682;', action: 'logout', 'class': 'danger' }
    ];

    // Construire l'avatar (initiales ou image)
    var avatarContent = '';
    if (user.avatar) {
        avatarContent = `<img src="${user.avatar}" alt="${user.name || 'Utilisateur'}">`;
    } else {
        avatarContent = user.initials || (user.name ? user.name.charAt(0).toUpperCase() : 'U');
    }

    // Construire les items du dropdown
    var dropdownItems = '';
    if (user.name) {
        dropdownItems += `<div class="header-dropdown-header"><span class="header-dropdown-name">${user.name}</span></div>`;
    }
    menuItems.forEach(function(item) {
        if (item.divider) {
            dropdownItems += '<div class="header-dropdown-divider"></div>';
        } else {
            var cls = 'header-dropdown-item' + (item['class'] ? ' ' + item['class'] : '');
            var dataAction = item.action ? ` data-action="${item.action}"` : '';
            var href = item.href || '#';
            dropdownItems += `<a href="${href}" class="${cls}"${dataAction}>${item.icon ? `<span>${item.icon}</span>` : ''}${item.label}</a>`;
        }
    });

    // Zone user (seulement si auth activé)
    var userZoneHtml = '';
    if (authEnabled) {
        var notifCount = notifCfg.count || 0;
        var notifVisible = notifCfg.enabled !== false;
        var badgeHtml = '';
        if (notifCount > 0) {
            badgeHtml = `<span class="header-notification-badge" id="header-notif-badge">${notifCount > 99 ? '99+' : notifCount}</span>`;
        } else {
            badgeHtml = '<span class="header-notification-badge hidden" id="header-notif-badge"></span>';
        }

        var notifBellHtml = '';
        if (notifVisible) {
            notifBellHtml = `<button class="header-notification" id="header-notif-btn" aria-label="Notifications" aria-expanded="false">&#128276;${badgeHtml}</button><div class="header-notif-panel" id="header-notif-panel" role="dialog" aria-label="Centre de notifications"><div class="header-notif-panel-header"><span>Notifications</span><button class="header-notif-mark-read" id="header-notif-mark-all">Tout lire</button></div><div class="header-notif-list" id="header-notif-list"><div class="header-notif-empty">Aucune notification</div></div></div>`;
        }

        userZoneHtml = `<div class="header-user-zone" id="header-user-zone">${notifBellHtml}<button class="header-avatar-trigger" id="header-avatar-btn" aria-label="Menu utilisateur" aria-expanded="false" aria-haspopup="true">${avatarContent}</button><div class="header-dropdown" id="header-dropdown" role="menu">${dropdownItems}</div></div>`;
    }

    header.innerHTML = `<button class="header-burger" id="header-burger" aria-label="Ouvrir le menu">&#9776;</button><a href="/site.html" class="header-logo"><img src="/assets/logo-msyx.svg" alt="msyx Design System" width="40" height="40" class="header-logo-img"></a><span class="header-version">v${VERSION}</span><span class="header-spacer"></span><div class="header-controls"><div class="theme-switcher"><label class="theme-switcher-label" for="theme-select">Theme</label><select id="theme-select" class="theme-switcher-select" aria-label="Choisir le theme"><option value="msyx">MSYX</option><option value="acssi">ACSSI</option><option value="nhood">Nhood</option></select></div><div class="mode-toggle"><span class="mode-toggle-label">Mode</span><button id="mode-dark" class="mode-toggle-btn" aria-label="Mode sombre" title="Dark">&#9790;</button><button id="mode-light" class="mode-toggle-btn" aria-label="Mode clair" title="Light">&#9788;</button></div></div>${userZoneHtml}`;

    var burger = document.getElementById('header-burger');
    var sidebar = document.getElementById('sidebar');
    if (burger && sidebar) {
        if (!burger.dataset.bound) {
            burger.dataset.bound = '1';
            burger.addEventListener('click', function() {
                if (sidebar.classList.contains('open')) { closeSidebar(); } else { openSidebar(); }
            });
        }
    }
    if (typeof initThemeSwitcher === 'function') initThemeSwitcher();
    if (typeof initModeSwitcher === 'function') initModeSwitcher();
    if (authEnabled) {
        initHeaderUser();
        if ((cfg.notifications || {}).enabled !== false) initHeaderNotifications();
    }
}

// Initialise le dropdown avatar
function initHeaderUser() {
    var btn = document.getElementById('header-avatar-btn');
    var dropdown = document.getElementById('header-dropdown');
    if (!btn || !dropdown) return;
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    function openDropdown() {
        dropdown.classList.add('open');
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        // Fermer le panel notif si ouvert
        var np = document.getElementById('header-notif-panel');
        var nb = document.getElementById('header-notif-btn');
        if (np) np.classList.remove('open');
        if (nb) { nb.classList.remove('active'); nb.setAttribute('aria-expanded', 'false'); }
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
        if (dropdown.classList.contains('open')) { closeDropdown(); } else { openDropdown(); }
    }

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });

    btn.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(); }
        if (e.key === 'Escape') { closeDropdown(); btn.focus(); }
    });

    // Clic en dehors → fermer
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && e.target !== btn) { closeDropdown(); }
    });

    // Keyboard navigation in dropdown items
    dropdown.querySelectorAll('.header-dropdown-item').forEach(function(item) {
        if (item.dataset.bound) return;
        item.dataset.bound = '1';
        item.setAttribute('role', 'menuitem');
        item.addEventListener('click', function(e) {
            var action = item.dataset.action;
            if (action === 'logout') {
                e.preventDefault();
                document.dispatchEvent(new CustomEvent('msyx:logout', { bubbles: true }));
            }
            closeDropdown();
        });
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { closeDropdown(); btn.focus(); }
        });
    });
}

// Initialise le panel de notifications
function initHeaderNotifications() {
    var btn = document.getElementById('header-notif-btn');
    var panel = document.getElementById('header-notif-panel');
    var markAllBtn = document.getElementById('header-notif-mark-all');
    if (!btn || !panel) return;
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    function openPanel() {
        panel.classList.add('open');
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        // Fermer le dropdown avatar si ouvert
        var dd = document.getElementById('header-dropdown');
        var ab = document.getElementById('header-avatar-btn');
        if (dd) dd.classList.remove('open');
        if (ab) { ab.classList.remove('open'); ab.setAttribute('aria-expanded', 'false'); }
    }

    function closePanel() {
        panel.classList.remove('open');
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (panel.classList.contains('open')) { closePanel(); } else { openPanel(); }
    });

    btn.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { closePanel(); btn.focus(); }
    });

    if (markAllBtn && !markAllBtn.dataset.bound) {
        markAllBtn.dataset.bound = '1';
        markAllBtn.addEventListener('click', function() {
            panel.querySelectorAll('.header-notif-item.unread').forEach(function(item) {
                item.classList.remove('unread');
            });
            updateNotificationCount(0);
        });
    }

    document.addEventListener('click', function(e) {
        if (!panel.contains(e.target) && e.target !== btn) { closePanel(); }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && panel.classList.contains('open')) { closePanel(); }
    });

    // Charger les notifications depuis la config si présentes
    var cfg = (typeof window.MSYX_HEADER === 'object' && window.MSYX_HEADER) ? window.MSYX_HEADER : {};
    if (cfg.notifications && cfg.notifications.items) {
        renderNotifications(cfg.notifications.items);
    }
}

// Rendu de la liste de notifications
function renderNotifications(items) {
    var list = document.getElementById('header-notif-list');
    if (!list) return;
    if (!items || !items.length) {
        list.innerHTML = '<div class="header-notif-empty">Aucune notification</div>';
        return;
    }
    var html = '';
    items.forEach(function(n) {
        var unreadCls = n.unread ? ' unread' : '';
        html += `<div class="header-notif-item${unreadCls}">${n.icon ? `<span class="header-notif-icon">${n.icon}</span>` : ''}<div class="header-notif-body"><div class="header-notif-title">${n.title || ''}</div>${n.desc ? `<div class="header-notif-desc">${n.desc}</div>` : ''}</div>${n.time ? `<span class="header-notif-time">${n.time}</span>` : ''}</div>`;
    });
    list.innerHTML = html;
}

// Mettre à jour les infos user à la volée (ex: après login)
function updateHeaderUser(user) {
    var btn = document.getElementById('header-avatar-btn');
    if (!btn) return;
    var avatarContent = '';
    if (user.avatar) {
        avatarContent = `<img src="${user.avatar}" alt="${user.name || 'Utilisateur'}">`;
    } else {
        avatarContent = user.initials || (user.name ? user.name.charAt(0).toUpperCase() : 'U');
    }
    btn.innerHTML = avatarContent;
    var nameEl = document.querySelector('.header-dropdown-name');
    if (nameEl && user.name) nameEl.textContent = user.name;
}

// Mettre à jour le badge de notifications à la volée
function updateNotificationCount(count) {
    var badge = document.getElementById('header-notif-badge');
    if (!badge) return;
    if (count <= 0) {
        badge.textContent = '';
        badge.classList.add('hidden');
    } else {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    }
}

function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    let html = '<div class="sidebar-filter-wrap"><input class="sidebar-filter" type="search" placeholder="Filtrer..." aria-label="Filtrer la navigation" autocomplete="off"></div>';
    NAV_SECTIONS.forEach(section => {
        if (section.title) html += `<div class="sidebar-section" data-section-title>${section.title}</div>`;
        section.links.forEach(link => {
            html += `<a href="${link.href}" class="sidebar-link" data-href="${link.href}"><span class="icon">${link.icon}</span> ${link.label}</a>`;
        });
    });
    html += '<div class="sidebar-footer"><p>msyx.fr — 2026</p></div>';
    sidebar.innerHTML = html;
    updateActiveLink();
    bindSidebarClicks();
    bindSidebarFilter();
    buildSidebarOverlay();
}

function buildSidebarOverlay() {
    // Créer l'overlay s'il n'existe pas
    if (document.getElementById('sidebar-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    // Tap outside → fermer
    overlay.addEventListener('click', function() { closeSidebar(); });

    // Swipe gauche sur la sidebar → fermer
    var sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.dataset.swipeBound) {
        sidebar.dataset.swipeBound = '1';
        var touchStartX = 0;
        sidebar.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        sidebar.addEventListener('touchend', function(e) {
            var deltaX = e.changedTouches[0].clientX - touchStartX;
            if (deltaX < -50) { closeSidebar(); }
        }, { passive: true });
    }
}

function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function openSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function bindSidebarFilter() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const input = sidebar.querySelector('.sidebar-filter');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    input.addEventListener('input', function() {
        const q = input.value.toLowerCase().trim();
        const links = sidebar.querySelectorAll('.sidebar-link');
        const sections = sidebar.querySelectorAll('[data-section-title]');

        links.forEach(function(link) {
            const text = link.textContent.toLowerCase();
            const visible = !q || text.includes(q);
            link.style.display = visible ? '' : 'none';
        });

        // Masquer les titres de section dont tous les liens sont cachés
        sections.forEach(function(sec) {
            var next = sec.nextElementSibling;
            var anyVisible = false;
            while (next && !next.hasAttribute('data-section-title') && !next.classList.contains('sidebar-footer')) {
                if (next.classList.contains('sidebar-link') && next.style.display !== 'none') {
                    anyVisible = true;
                }
                next = next.nextElementSibling;
            }
            sec.style.display = anyVisible ? '' : 'none';
        });
    });
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

            // On site.html hub: intercept clicks to scroll to lazy sections
            if (isSiteHub() && !isSamePage && PAGE_TO_LAZY[linkPath]) {
                var lazyId = PAGE_TO_LAZY[linkPath];
                var container = document.getElementById(lazyId);
                if (container) {
                    var scrollTarget = linkHash || null;
                    loadSection(container).then(function() {
                        setTimeout(function() {
                            var target = scrollTarget ? document.getElementById(scrollTarget) : container;
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    });
                    var slug = lazyId.replace('lazy-', '');
                    history.replaceState(null, '', '#' + (linkHash || slug));
                    updateActiveLink();
                    closeSidebar();
                    return;
                }
            }

            if (isSamePage && linkHash) {
                // Same page: smooth scroll
                const target = document.getElementById(linkHash);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + linkHash);
                updateActiveLink();
                closeSidebar();
            } else {
                // Different page: SPA navigation
                navigateTo(href);
            }
        });
    });
}

async function navigateTo(url) {
    const [path, hash] = url.split('#');
    const currentMain = document.querySelector('.main');
    try {
        // Fade-out avant le swap
        if (currentMain) {
            currentMain.classList.add('fade-out');
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        const resp = await fetch(path);
        if (!resp.ok) { window.location.href = url; return; }
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('.main');
        if (!newMain || !currentMain) { window.location.href = url; return; }

        // Swap content
        currentMain.innerHTML = newMain.innerHTML;

        // Fade-in après le swap
        currentMain.classList.remove('fade-out');

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
        closeSidebar();

        // Re-init components for new content
        reinitComponents();
    } catch (err) {
        if (currentMain) currentMain.classList.remove('fade-out');
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
    if (typeof window.__initPricing === 'function') window.__initPricing();
    if (typeof window.__initNotificationCenter === 'function') window.__initNotificationCenter();
    if (typeof window.__initActivityFeed === 'function') window.__initActivityFeed();
    if (typeof window.__initWizard === 'function') window.__initWizard();
    if (typeof window.__initInlineEdit === 'function') window.__initInlineEdit();
    if (typeof window.__initActionMenu === 'function') window.__initActionMenu();
    if (typeof window.__initSidebarRail === 'function') window.__initSidebarRail();
    if (typeof window.__initRiskMatrix === 'function') window.__initRiskMatrix();
}

function isSidebarLinkVisible(el) {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar || !el) return true;
    var sRect = sidebar.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    return eRect.top >= sRect.top && eRect.bottom <= sRect.bottom;
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
                        // Ne scroller que si l'élément actif est hors de la zone visible de la sidebar
                        if (!isSidebarLinkVisible(l)) {
                            l.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                    }
                });
                if (isSiteHub()) {
                    history.replaceState(null, '', '#' + id);
                }
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(s => scrollSpyObserver.observe(s));
}

// ===== LAZY LOADER (site.html only) =====

function isSiteHub() {
    return location.pathname === '/' || location.pathname === '/site.html' || location.pathname.endsWith('/site.html');
}

var loadedSections = new Set();
var lazyObserver = null;

var PAGE_TO_LAZY = {
    '/pages/fondation.html': 'lazy-fondation',
    '/pages/motion.html': 'lazy-motion',
    '/pages/composants.html': 'lazy-composants',
    '/pages/formulaires.html': 'lazy-formulaires',
    '/pages/navigation.html': 'lazy-navigation',
    '/pages/data.html': 'lazy-data',
    '/pages/feedback.html': 'lazy-feedback',
    '/pages/divers.html': 'lazy-divers',
    '/pages/templates.html': 'lazy-templates'
};

var LAZY_SLUGS = {};
Object.keys(PAGE_TO_LAZY).forEach(function(path) {
    LAZY_SLUGS[PAGE_TO_LAZY[path].replace('lazy-', '')] = path;
});

async function loadSection(container) {
    var page = container.dataset.page;
    if (!page || loadedSections.has(page)) return;
    loadedSections.add(page);
    try {
        var resp = await fetch(page);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var html = await resp.text();
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var mainContent = doc.querySelector('.main');
        if (!mainContent) throw new Error('No .main found');
        container.innerHTML = mainContent.innerHTML;
        container.classList.add('lazy-loaded');
        container.classList.remove('lazy-section');
        if (typeof window.__initComponents === 'function') window.__initComponents();
        if (scrollSpyObserver) { scrollSpyObserver.disconnect(); scrollSpyObserver = null; }
        initScrollSpy();
    } catch (err) {
        container.innerHTML = `<div class="lazy-error"><p>Erreur de chargement — <a href="${page}">ouvrir la page</a></p></div>`;
        container.classList.add('lazy-loaded');
        loadedSections.delete(page);
    }
}

function loadAllSections() {
    document.querySelectorAll('.lazy-section[data-page]').forEach(function(c) { loadSection(c); });
}

function initLazyLoader() {
    var sections = document.querySelectorAll('.lazy-section[data-page]');
    if (!sections.length) return;
    lazyObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                loadSection(entry.target);
                lazyObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '200px' });
    sections.forEach(function(s) { lazyObserver.observe(s); });

    var loadAllBtn = document.getElementById('load-all-sections');
    if (loadAllBtn) {
        loadAllBtn.addEventListener('click', function() {
            loadAllBtn.disabled = true;
            loadAllBtn.textContent = 'Chargement...';
            var pending = document.querySelectorAll('.lazy-section[data-page]');
            var promises = Array.from(pending).map(function(c) { return loadSection(c); });
            Promise.all(promises).then(function() {
                loadAllBtn.textContent = 'Tout charg\u00e9 \u2713';
                loadAllBtn.classList.add('btn-success');
            });
        });
    }

    // Auto-load Ctrl+F : charger toutes les sections pour permettre Ctrl+F natif
    if (!document.body.dataset.ctrlFBound) {
        document.body.dataset.ctrlFBound = '1';
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && isSiteHub()) {
                var pending2 = document.querySelectorAll('.lazy-section[data-page]');
                var promises2 = Array.from(pending2).map(function(c) { return loadSection(c); });
                Promise.all(promises2).then(function() {
                    if (loadAllBtn) {
                        loadAllBtn.disabled = true;
                        loadAllBtn.textContent = 'Tout charg\u00e9 \u2713';
                        loadAllBtn.classList.add('btn-success');
                    }
                });
            }
        });
    }

    handleInitialHash();
}

function handleInitialHash() {
    var hash = location.hash.replace('#', '');
    if (!hash) return;

    // Case 1: hash is a category slug (fondation, composants...)
    if (LAZY_SLUGS[hash]) {
        var container = document.getElementById('lazy-' + hash);
        if (container) {
            loadSection(container).then(function() {
                setTimeout(function() { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            });
        }
        return;
    }

    // Case 2: hash is a sub-section ID (colors, buttons, kanban...)
    // Find which page contains this section by checking sidebar links
    var sidebarLinks = document.querySelectorAll('.sidebar-link[data-href]');
    for (var i = 0; i < sidebarLinks.length; i++) {
        var href = sidebarLinks[i].dataset.href || '';
        if (href.endsWith('#' + hash)) {
            var linkPath = href.split('#')[0];
            var lazyId = PAGE_TO_LAZY[linkPath];
            if (lazyId) {
                var container = document.getElementById(lazyId);
                if (container) {
                    loadSection(container).then(function() {
                        setTimeout(function() {
                            var target = document.getElementById(hash);
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 150);
                    });
                }
                return;
            }
        }
    }
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
        var href = card.getAttribute('href');
        if (isSiteHub() && PAGE_TO_LAZY[href]) {
            var lazyId = PAGE_TO_LAZY[href];
            var container = document.getElementById(lazyId);
            if (container) {
                loadSection(container).then(function() {
                    setTimeout(function() { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                });
                history.replaceState(null, '', '#' + lazyId.replace('lazy-', ''));
                return;
            }
        }
        navigateTo(href);
    }
});

// ===== APIS PUBLIQUES — header user =====
window.__updateHeaderUser = function(data) { updateHeaderUser(data); };
window.__updateNotificationCount = function(count) { updateNotificationCount(count); };

document.addEventListener('DOMContentLoaded', function() {
    buildHeader();
    buildSidebar();
    initScrollSpy();
    if (isSiteHub()) initLazyLoader();
});
