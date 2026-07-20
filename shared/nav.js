/* @ds-version 2.106.0 */
const VERSION = '2.106.0';

// Manifeste des pages showcase — SEULE liste maintenue à la main.
// Les sections (liens enfants) sont scannées depuis le DOM au runtime, jamais hardcodées.
// Avantage : divergence impossible par construction (ancre morte = impossible).
const NAV_PAGES = [
    { title: null,          path: '/site.html',                  label: 'Hub',             icon: '&#9670;', flat: true },
    { title: null,          path: '/pages/getting-started.html', label: 'Getting Started', icon: '&#9654;' },
    { title: 'Fondation',   path: '/pages/fondation.html',       icon: '&#127912;' },
    { title: 'Composants',  path: '/pages/composants.html',      icon: '&#9654;' },
    { title: 'Formulaires', path: '/pages/formulaires.html',     icon: '&#9998;' },
    { title: 'Navigation',  path: '/pages/navigation.html',      icon: '&#9776;' },
    { title: 'Data',        path: '/pages/data.html',            icon: '#' },
    { title: 'Feedback',    path: '/pages/feedback.html',        icon: '&#9888;' },
    { title: 'Overlays',    path: '/pages/overlays.html',        icon: '&#9645;' },
    { title: 'Avancé',      path: '/pages/divers.html',          icon: '&#8942;' },
    { title: 'Templates',   path: '/pages/templates.html',       icon: '&#8862;' }
];


// Current scroll spy observer (so we can disconnect on page swap)
let scrollSpyObserver = null;

/* AUTO-GENERATED VERSION NOTES START — ne pas éditer à la main (bin/generate-version-notes.js) */
const VERSION_NOTES = {"next":{"highlights":[]},"released":[{"version":"2.97.2","date":"2026-07-15","titre":"Fenêtres plus accessibles","highlights":[{"type":"amelioration","text":"Le bouton de fermeture des fenêtres est plus facile à toucher sur mobile (cible agrandie), et les titres de fenêtre sont plus lisibles."}]},{"version":"2.97.1","date":"2026-07-15","titre":"Notes de version plus lisibles","highlights":[{"type":"amelioration","text":"La chronologie met en avant la dernière version et annonce les nouveautés à venir."},{"type":"amelioration","text":"Le badge de version est désormais accessible sur mobile, avec une typographie plus moderne."},{"type":"correction","text":"Correction de puces parasites qui apparaissaient dans la liste des nouveautés."}]},{"version":"2.96.1","date":"2026-07-10","titre":"Catégories dans les notes de version","highlights":[{"type":"amelioration","text":"Chaque nouveauté est maintenant étiquetée par catégorie (Nouveauté, Amélioration, Correction, Sécurité) pour repérer l'essentiel d'un coup d'œil."}]},{"version":"2.96.0","date":"2026-07-09","titre":"Historique des nouveautés dans le header","highlights":[{"type":"nouveaute","text":"Un badge de version en haut de page ouvre la liste des dernières nouveautés du design system."},{"type":"amelioration","text":"Une pastille signale les nouveautés que vous n'avez pas encore consultées."}]},{"version":"2.95.0","date":"2026-07-07","titre":"Notes de version","highlights":[{"type":"nouveaute","text":"Un nouveau composant présente l'historique des versions sous forme de chronologie."}]},{"version":"2.94.0","date":"2026-06-30","titre":"Comparaison de fichiers","highlights":[{"type":"nouveaute","text":"Un affichage de différences met en évidence les lignes ajoutées et supprimées."}]},{"version":"2.93.0","date":"2026-06-30","titre":"Longues listes plus fluides","highlights":[{"type":"amelioration","text":"Les listes de milliers d'éléments défilent sans ralentir grâce à l'affichage à la demande."}]},{"version":"2.92.0","date":"2026-06-30","titre":"Visualiser l'activité dans le temps","highlights":[{"type":"nouveaute","text":"Une nouvelle vue en calendrier permet de repérer en un coup d'œil les périodes les plus actives."}]},{"version":"2.91.0","date":"2026-06-30","titre":"Explorer des données complexes","highlights":[{"type":"nouveaute","text":"Un nouvel affichage permet de parcourir un contenu structuré en dépliant et repliant chaque section."}]},{"version":"2.90.0","date":"2026-06-30","titre":"Panneaux ajustables","highlights":[{"type":"nouveaute","text":"Deux zones affichées côte à côte peuvent désormais être redimensionnées en faisant glisser la bordure qui les sépare."}]},{"version":"2.88.0","date":"2026-06-30","titre":"Affectation simplifiée entre deux listes","highlights":[{"type":"nouveaute","text":"Un nouvel outil permet de déplacer des éléments d'une liste vers une autre en un clic ou au clavier."}]}]};
/* AUTO-GENERATED VERSION NOTES END */

function buildHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;

    // Lire la config consommateur
    var cfg = (typeof window.MSYX_HEADER === 'object' && window.MSYX_HEADER) ? window.MSYX_HEADER : {};
    var authEnabled = !!cfg.auth;
    var user = cfg.user || {};
    var notifCfg = cfg.notifications || {};
    var notifVisible = notifCfg.enabled !== false;           // défaut true — indépendant de l'auth
    var themeSwitcherEnabled = !!cfg.themeSwitcher;          // défaut false — opt-in vitrine/multi-thème

    // Brand configurable (#570) — défauts rétro-compatibles avec la vitrine DS
    var brandCfg = cfg.brand || {};
    var brandText = brandCfg.text || 'design-system';
    var brandHref = brandCfg.href !== undefined ? brandCfg.href : '/site.html';
    var brandLogoSrc = brandCfg.logoSrc || '/assets/sources/logoMSYX.png';

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

    // Cloche notifications : construite UNE SEULE FOIS, hors gate auth (v2.73.0)
    // Masquée uniquement si MSYX_HEADER.notifications.enabled === false
    var notifBellHtml = '';
    if (notifVisible) {
        var notifCount = notifCfg.count || 0;
        var badgeHtml = (notifCount > 0)
            ? `<span class="header-notification-badge" id="header-notif-badge">${notifCount > 99 ? '99+' : notifCount}</span>`
            : '<span class="header-notification-badge hidden" id="header-notif-badge"></span>';
        notifBellHtml = `<button class="header-notification" id="header-notif-btn" aria-label="Notifications" aria-expanded="false"><svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-bell"/></svg>${badgeHtml}</button><div class="header-notif-panel" id="header-notif-panel" role="dialog" aria-label="Centre de notifications"><div class="header-notif-panel-header"><span>Notifications</span><button class="header-notif-mark-read" id="header-notif-mark-all">Tout lire</button></div><div class="header-notif-list" id="header-notif-list"><div class="header-notif-empty">Aucune notification</div></div></div>`;
    }

    // Profil (avatar/dropdown) : reste derrière auth — NE re-rend PAS la cloche (anti-double-cloche)
    // Stratégie back-compat M3 (v2.58.0) :
    //   - Si cfg.user présent → legacy dropdown (consumers existants back-compat)
    //   - Si cfg.user absent + authEnabled → slot UserMenu DS standard (M3 Authentik Proxy)
    //   - Si authEnabled false → pas de profil
    var profileHtml = '';
    if (authEnabled) {
        if (cfg.user && (cfg.user.name || cfg.user.initials || cfg.user.avatar)) {
            // Mode legacy : MSYX_HEADER.user défini → dropdown legacy (back-compat consumers existants)
            profileHtml = `<button class="header-avatar-trigger" id="header-avatar-btn" aria-label="Menu utilisateur" aria-expanded="false" aria-haspopup="true">${avatarContent}</button><div class="header-dropdown" id="header-dropdown" role="menu">${dropdownItems}</div>`;
        } else {
            // Mode M3 : pas de cfg.user → slot UserMenu DS standard
            // L'init script (auth-init inline dans site.html) fetch /me.json depuis Authentik Proxy
            // et appelle initUserMenu() sur ce slot une fois les données disponibles.
            profileHtml = `<div class="user-menu" id="ds-user-menu"></div>`;
        }
    }

    // Zone user : rendue si cloche OU profil présent (évite un wrapper vide orphelin)
    var userZoneHtml = '';
    if (notifBellHtml || profileHtml) {
        userZoneHtml = `<div class="header-user-zone" id="header-user-zone">${notifBellHtml}${profileHtml}</div>`;
    }

    // Switcher thème : derrière flag themeSwitcher (défaut false — opt-in vitrine/multi-thème)
    var themeSwitcherHtml = themeSwitcherEnabled
        ? `<div class="theme-switcher"><label class="theme-switcher-label" for="theme-select">Theme</label><select id="theme-select" class="theme-switcher-select" aria-label="Choisir le theme"><option value="msyx">MSYX</option><option value="acssi">ACSSI</option><option value="nhood">Nhood</option></select></div>`
        : '';

    // Logo : image si logoSrc défini, sinon texte gradient fallback (#570)
    var logoImgHtml = `<img src="${brandLogoSrc}" alt="" aria-hidden="true" width="40" height="40" class="header-logo-img">`;
    // Badge version cliquable — dogfood du composant version-notes (#645, #614, #649).
    // Présentationnel strict : ouverture déléguée à data-modal-trigger + initModals ;
    // pastille « nouveau » gérée par initVersionNotes (égalité de chaîne localStorage).
    // Icône spark (i-sparkles) devant le numéro — .icon = stroke:currentColor;fill:none (_base.css).
    var versionBadgeHtml = `<button class="version-badge header-version-badge" data-version-notes data-modal-trigger="ds-version-notes-modal" data-latest-version="${VERSION}" data-storage-key="ds-version-seen" aria-label="Notes de version, v${VERSION}"><svg class="icon" width="14" height="14" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-sparkles"></use></svg>v${VERSION}<span class="version-badge-dot" aria-hidden="true"></span></button>`;
    header.innerHTML = `<button class="header-burger" id="header-burger" aria-label="Ouvrir le menu">&#9776;</button><a href="${brandHref}" class="header-logo" aria-label="${brandText} — Accueil">${logoImgHtml}<span class="brand-wordmark">${brandText}</span></a>${versionBadgeHtml}<span class="header-spacer"></span><div class="header-controls">${themeSwitcherHtml}<div class="mode-toggle"><span class="mode-toggle-label">Mode</span><button id="mode-switch" class="mode-switch" role="switch" aria-checked="false" aria-label="Basculer mode clair/sombre"><span class="mode-switch-track"><svg class="mode-switch-icon mode-switch-icon--sun" aria-hidden="true" width="14" height="14"><use href="/shared/icons/sprite.svg#i-sun"></use></svg><svg class="mode-switch-icon mode-switch-icon--moon" aria-hidden="true" width="14" height="14"><use href="/shared/icons/sprite.svg#i-moon"></use></svg><span class="mode-switch-thumb"></span></span></button></div></div>${userZoneHtml}`;

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
    // FIX #251 — ordre garanti : initModeSwitcher AVANT initThemeSwitcher.
    // initModeSwitcher pose les listeners + lit data-theme/data-mode actuel ;
    // initThemeSwitcher rappelle updateModeSwitch() apres pour re-synchroniser
    // l'etat disabled des boutons dark/light si l'attribut data-theme a ete
    // pose tardivement (race anti-FOUC). updateModeSwitch() est desormais appele
    // avant le guard !select dans initThemeSwitcher — synchro garantie meme
    // quand themeSwitcher:false (switcher absent).
    if (typeof initModeSwitcher === 'function') initModeSwitcher();
    if (typeof initThemeSwitcher === 'function') initThemeSwitcher();
    if (authEnabled && cfg.user && (cfg.user.name || cfg.user.initials || cfg.user.avatar)) {
        // Legacy : init dropdown avatar
        initHeaderUser();
    }
    // Notifications : dès que la cloche est rendue, indépendamment de l'auth (v2.73.0)
    if (notifVisible) initHeaderNotifications();
    // Notes de version (#645) : injecter la modale AVANT de câbler les inits.
    // initModals lie le déclencheur + les listeners de la dialog ; initVersionNotes gère la pastille.
    // Les deux sont idempotents (dataset.bound) et déjà présents dans reinitAll — appel ici = robustesse d'ordre.
    ensureVersionNotesDialog();
    if (typeof initModals === 'function') initModals();
    if (typeof initVersionNotes === 'function') initVersionNotes();
    // M3 : notifie les consumers que le header DOM est rendu (slot #ds-user-menu disponible)
    document.dispatchEvent(new CustomEvent('msyx:header:ready', { bubbles: true }));
}

// escapeHtml minimal — les données sont curées (fiables) mais on protège contre <, >, &.
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// Formatte une date ISO YYYY-MM-DD en français court : "7 juil. 2026".
function formatVersionNoteDate(iso) {
    try {
        return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
}

// Catégories de highlight → .badge de statut DS + libellé FR.
// Mapping aligné sur le pilote cap-transfo (release-chip-*) pour cohérence avec la migration #355.
var VERSION_NOTE_CATEGORIES = {
    nouveaute:    { label: 'Nouveauté',    badge: 'badge-success' },
    amelioration: { label: 'Amélioration', badge: 'badge-info' },
    correction:   { label: 'Correction',   badge: 'badge-warning' },
    securite:     { label: 'Sécurité',     badge: 'badge-danger' }
};

// Rend un <li.timeline-item--upcoming> « À venir » depuis VERSION_NOTES.next.highlights (#649 paquet A).
// Nœud pointillé + label « À venir ». Rien si highlights vide (cas par défaut, version-notes.json next.highlights === []).
function renderVersionNotesUpcoming(next) {
    var hs = (next && Array.isArray(next.highlights)) ? next.highlights : [];
    if (!hs.length) return '';
    var items = hs.map(function (h) {
        var meta = VERSION_NOTE_CATEGORIES[h.type] || { label: h.type || '', badge: 'badge-neutral' };
        var chip = meta.label
            ? '<span class="badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span> '
            : '';
        return '<li>' + chip + escapeHtml(h.text) + '</li>';
    }).join('');
    return '<li class="timeline-item timeline-item--upcoming"><div class="timeline-dot" aria-hidden="true"></div>'
        + '<div class="timeline-content"><div class="timeline-date">À venir</div>'
        + '<ul>' + items + '</ul></div></li>';
}

// Rend les <li.timeline-item> depuis VERSION_NOTES.released (structure #614/#649).
// i===0 : pastille « Nouveau ». Chaque highlight porte un .badge de catégorie (#647).
function renderVersionNotesTimeline(released) {
    return released.map(function (n, i) {
        var items = (n.highlights || []).map(function (h) {
            var meta = VERSION_NOTE_CATEGORIES[h.type] || { label: h.type || '', badge: 'badge-neutral' };
            var chip = meta.label
                ? '<span class="badge ' + meta.badge + '">' + escapeHtml(meta.label) + '</span> '
                : '';
            return '<li>' + chip + escapeHtml(h.text) + '</li>';
        }).join('');
        var newBadge = i === 0 ? ' <span class="badge badge-success">Nouveau</span>' : '';
        var latestCls = i === 0 ? ' timeline-item--latest' : '';
        return '<li class="timeline-item' + latestCls + '"><div class="timeline-dot" aria-hidden="true"></div>'
            + '<div class="timeline-content"><div class="timeline-date"><time datetime="'
            + escapeHtml(n.date) + '">' + escapeHtml(formatVersionNoteDate(n.date)) + '</time> · v'
            + escapeHtml(n.version) + '</div><h4>' + escapeHtml(n.titre) + newBadge + '</h4><ul>' + items
            + '</ul></div></li>';
    }).join('');
}

// Injecte une seule fois la <dialog> des notes de version dans <body>.
// id = ds-version-notes-modal (référencé par data-modal-trigger du badge).
function ensureVersionNotesDialog() {
    if (document.getElementById('ds-version-notes-modal')) return;
    var notes = (typeof VERSION_NOTES === 'object' && VERSION_NOTES) ? VERSION_NOTES : {};
    var released = Array.isArray(notes.released) ? notes.released : [];
    var subtitle = (typeof notes.subtitle === 'string' && notes.subtitle.trim()) ? notes.subtitle : '';
    var dialog = document.createElement('dialog');
    dialog.className = 'modal-dialog version-notes-dialog';
    dialog.id = 'ds-version-notes-modal';
    dialog.setAttribute('aria-labelledby', 'ds-version-notes-title');
    dialog.innerHTML = '<div class="modal-header"><h3 class="modal-title" id="ds-version-notes-title">Notes de version</h3>'
        + '<button class="modal-close" data-modal-close aria-label="Fermer">&times;</button></div>'
        + '<div class="modal-body version-notes">'
        + (subtitle ? '<p class="version-notes-sub">' + escapeHtml(subtitle) + '</p>' : '')
        + '<ol class="timeline">'
        + renderVersionNotesUpcoming(notes.next)
        + renderVersionNotesTimeline(released) + '</ol></div>';
    document.body.appendChild(dialog);
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

// ===== SIDEBAR DYNAMIQUE — manifeste build + scan DOM page courante (#528) =====
// NAV_SECTIONS_MANIFEST : généré par bin/generate-nav-sections.js, inliné ici.
// Élimine tous les fetch runtime (auth-gate / cache / CSP immunisés).
// Page courante : scan DOM live (source de vérité instantanée, toujours 0 fetch).

/**
 * Extrait [{id, label}] des sections showcase du Document courant.
 * Sélecteur : enfants DIRECTS de .main (exclut les sections imbriquées dans les démos).
 * Utilisé uniquement pour la page courante (DOM déjà rendu).
 */
function extractSections(doc) {
    var out = [];
    doc.querySelectorAll('.main > section[id]').forEach(function(sec) {
        var h2 = sec.querySelector('.section-header h2') || sec.querySelector('h2');
        var label = (h2 ? h2.textContent : '').trim() || sec.id;
        out.push({ id: sec.id, label: label });
    });
    return out;
}

/**
 * Résout les sections de chaque page du manifeste NAV_PAGES.
 * (a) Page courante : scan DOM direct (immédiat, 0 réseau).
 * (b) Autres pages : manifeste inliné NAV_SECTIONS_MANIFEST — ZÉRO fetch.
 *     Si manifest absent (consumer sans build) → [] → fallback gracieux.
 * Retourne Map<path, [{id,label}]>. Reste async pour compatibilité buildSidebar().
 */
/* AUTO-GENERATED NAV SECTIONS START — ne pas éditer à la main (bin/generate-nav-sections.js) */
const NAV_SECTIONS_MANIFEST = {
  "/pages/getting-started.html": [{"id":"overview","label":"Getting Started"},{"id":"install","label":"Installation"},{"id":"first-steps","label":"Premiers pas"},{"id":"header-config","label":"Header avec utilisateur"},{"id":"tokens-usage","label":"Utiliser les tokens"},{"id":"anti-patterns","label":"Bonnes pratiques"}],
  "/pages/fondation.html": [{"id":"colors","label":"Palette de couleurs"},{"id":"typography","label":"Typographie"},{"id":"spacing","label":"Spacing & Rayons"},{"id":"tokens","label":"Tokens CSS"},{"id":"theming","label":"Theming"},{"id":"theme-switcher","label":"Theme Switcher"},{"id":"consommation","label":"Consommation"},{"id":"utilities","label":"Classes utilitaires"},{"id":"brand","label":"Brand identity"},{"id":"iconographie","label":"Iconographie"},{"id":"performance-glass","label":"Performance & Glassmorphism"},{"id":"texture","label":"Texture grain"},{"id":"svg-theme-aware","label":"SVG theme-aware"},{"id":"durations","label":"Durations"},{"id":"easings","label":"Easings"},{"id":"patterns","label":"Patterns canoniques"}],
  "/pages/composants.html": [{"id":"buttons","label":"Boutons"},{"id":"cards","label":"Cards"},{"id":"card-media","label":"Card Media"},{"id":"badges","label":"Badges & Tags"},{"id":"chips","label":"Chips"},{"id":"dividers","label":"Divider / Separator"},{"id":"rating","label":"Rating / Etoiles"},{"id":"avatars","label":"Avatars"},{"id":"segmented-control","label":"Segmented Control"},{"id":"sortable-list","label":"Sortable List"},{"id":"achievements","label":"Achievement Badges"},{"id":"reset-natif","label":"Reset natif"},{"id":"disabled-global","label":"Disabled global"},{"id":"split-button","label":"Split Button"}],
  "/pages/formulaires.html": [{"id":"inputs","label":"Inputs"},{"id":"controls","label":"Controls"},{"id":"login","label":"Login / Auth"},{"id":"calendar","label":"Calendrier"},{"id":"dropdown","label":"Dropdown / Select"},{"id":"file-upload","label":"File Upload"},{"id":"slider","label":"Slider / Range"},{"id":"search-input","label":"Search Input"},{"id":"number-input","label":"Number Input"},{"id":"otp-input","label":"OTP / Pin Input"},{"id":"tag-input","label":"Tag Input"},{"id":"quiz","label":"Quiz / Poll"},{"id":"wizard","label":"Wizard multi-step"},{"id":"inline-edit","label":"Inline Editing"},{"id":"filter-bar","label":"Filter Bar"},{"id":"password-toggle","label":"Password avec révélation"},{"id":"form-validation","label":"Validation a11y"},{"id":"color-picker","label":"Color picker"},{"id":"transfer-list","label":"Transfer list"}],
  "/pages/navigation.html": [{"id":"header-user","label":"Header — Zone utilisateur"},{"id":"nav-components","label":"Navigation"},{"id":"breadcrumbs","label":"Breadcrumbs"},{"id":"stepper","label":"Stepper"},{"id":"bottom-nav","label":"Bottom Navigation"},{"id":"sidebar-rail","label":"Sidebar Rail"},{"id":"action-menu","label":"Action Menu"},{"id":"user-menu","label":"User Menu"}],
  "/pages/data.html": [{"id":"charts","label":"Charts"},{"id":"pie-donut","label":"Pie & Donut Charts"},{"id":"stats","label":"Statistiques"},{"id":"animated-counters","label":"Animated Counters"},{"id":"progress","label":"Progress"},{"id":"progress-tracker","label":"Progress Tracker"},{"id":"gauge","label":"Gauge / Speedometer"},{"id":"usage-meter","label":"Usage Meter"},{"id":"tables","label":"Tables"},{"id":"comparison","label":"Comparison Table"},{"id":"data-grid","label":"Data Grid"},{"id":"tree-view","label":"Tree View"},{"id":"lists","label":"Listes"},{"id":"activity-feed","label":"Activity Feed"},{"id":"risk-matrix","label":"Risk Matrix"},{"id":"server-data-grid","label":"Table server-driven"},{"id":"heatmap-calendar","label":"Heatmap calendrier"},{"id":"virtual-list","label":"Virtual list"},{"id":"graph","label":"Graph"}],
  "/pages/feedback.html": [{"id":"alerts","label":"Alertes"},{"id":"status-tokens","label":"Tokens status (fg / bg / border)"},{"id":"toasts","label":"Toasts"},{"id":"skeleton","label":"Skeleton loading"},{"id":"zone-banner","label":"Zone Banner — KPI"},{"id":"empty-states","label":"Empty States"},{"id":"spinners","label":"Spinners / Loading"},{"id":"auto-save","label":"Auto-save Indicator"},{"id":"upgrade-prompt","label":"Upgrade Prompt — Alerte CTA"},{"id":"pagination","label":"Pagination"},{"id":"comments","label":"Comments / Thread"},{"id":"access-denied","label":"Access Denied — Page 403"},{"id":"mention","label":"Mention @"}],
  "/pages/overlays.html": [{"id":"modals","label":"Modals"},{"id":"drawer","label":"Drawer"},{"id":"bottom-sheet","label":"Bottom Sheet"},{"id":"fab","label":"FAB — Floating Action Button"},{"id":"notification-center","label":"Notification Center"},{"id":"confirm-popover","label":"Confirm Popover"},{"id":"tooltip","label":"Tooltip & Popover"},{"id":"version-notes","label":"Notes de version"}],
  "/pages/divers.html": [{"id":"timeline","label":"Timeline"},{"id":"code","label":"Code blocks"},{"id":"carousel","label":"Carousel / Image Slider"},{"id":"lightbox","label":"Lightbox"},{"id":"video-embed","label":"Video Embed"},{"id":"accordion","label":"Accordion"},{"id":"command-palette","label":"Command Palette"},{"id":"context-menu","label":"Context Menu"},{"id":"copy-button","label":"Copy Button"},{"id":"decision-tree","label":"Decision Tree"},{"id":"before-after","label":"Before / After"},{"id":"prose","label":"Rendu Markdown / Prose"},{"id":"splitter","label":"Splitter / Resizable panels"},{"id":"json-viewer","label":"JSON viewer"},{"id":"diff-viewer","label":"Diff viewer"}],
  "/pages/templates.html": [{"id":"kanban","label":"Kanban Board"},{"id":"roadmap","label":"Roadmap"},{"id":"backlog","label":"Backlog"},{"id":"sprint","label":"Sprint Board"},{"id":"settings-panel","label":"Settings Panel"},{"id":"pricing","label":"Pricing Table"}]
};
/* AUTO-GENERATED NAV SECTIONS END */

async function resolvePageSections() {
    var result = {};
    NAV_PAGES.forEach(function(p) { result[p.path] = []; });

    // (a) Page courante : scan DOM direct (immédiat, 0 réseau).
    //     Sur site.html, .main contient des placeholders vides → 0 section ici.
    //     Source de vérité live : prime sur le manifeste pour la page courante.
    var localSecs = extractSections(document);
    if (localSecs.length) {
        var match = NAV_PAGES.find(function(p) {
            return location.pathname.endsWith(p.path) && !p.flat;
        });
        if (match) result[match.path] = localSecs;
    }

    // (b) Autres pages : manifeste inliné — ZÉRO fetch, immunisé auth-gate/cache/CSP.
    //     Si NAV_SECTIONS_MANIFEST est absent (consumer sans build), fallback → [].
    NAV_PAGES.forEach(function(p) {
        if (p.flat || result[p.path].length) return;
        var manifestSecs = (typeof NAV_SECTIONS_MANIFEST !== 'undefined')
            ? NAV_SECTIONS_MANIFEST[p.path]
            : undefined;
        if (manifestSecs && manifestSecs.length) {
            result[p.path] = manifestSecs;
        }
    });

    return result;
}

/**
 * Génère le HTML d'un lien sidebar.
 */
function linkHtml(href, icon, label) {
    return '<a href="' + href + '" class="sidebar-link" data-href="' + href + '"><span class="icon">' + icon + '</span> ' + label + '</a>';
}

/**
 * Fallback consumer : sidebar vide propre si aucune section n'est résolue.
 * Ne crash jamais.
 */
function renderEmptySidebar(sidebar) {
    sidebar.innerHTML = '<div class="sidebar-footer"><p>msyx.fr — 2026</p></div>';
}

/**
 * Construit la sidebar depuis le DOM (asynchrone).
 * Retourne une Promise pour permettre le chaînage (.finally()) dans DOMContentLoaded.
 */
async function buildSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // 1. Résoudre les sections de chaque page du manifeste.
    var pageSections = await resolvePageSections();

    // 2. FALLBACK CONSUMER : si aucune page n'a pu être résolue → no-op gracieux.
    var anyResolved = NAV_PAGES.some(function(p) {
        return pageSections[p.path] && pageSections[p.path].length;
    });
    if (!anyResolved) { renderEmptySidebar(sidebar); return; }

    // 3. Construire le HTML (filtre + groupes + liens + footer).
    var html = '<div class="sidebar-filter-wrap"><input class="sidebar-filter" type="search" placeholder="Filtrer..." aria-label="Filtrer la navigation" autocomplete="off"></div>';
    var lastTitle = undefined;
    NAV_PAGES.forEach(function(page) {
        // Titre de groupe (dédupliqué : 'Fondation' n'apparaît qu'une fois).
        if (page.title && page.title !== lastTitle) {
            html += '<div class="sidebar-section" data-section-title>' + page.title + '</div>';
            lastTitle = page.title;
        }
        if (page.flat) {
            // Hub et autres liens plats : lien direct, sans sous-sections.
            html += linkHtml(page.path, page.icon, page.label);
            return;
        }
        var secs = pageSections[page.path] || [];
        // Dédup #528 : ne pas émettre le lien parent si la 1ère section porte le même label
        // (ex. getting-started : page.label "Getting Started" == section #overview h2).
        // La section #overview (ancre précise) prime sur le lien parent sans ancre.
        var firstDup = secs.length > 0 && page.label
            && secs[0].label.trim().toLowerCase() === page.label.trim().toLowerCase();
        if (page.label && !firstDup) {
            // Lien parent affiché uniquement si la 1ère section ne le duplique pas.
            html += linkHtml(page.path, page.icon, page.label);
        }
        secs.forEach(function(s) {
            html += linkHtml(page.path + '#' + s.id, page.icon, s.label);
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
    '/pages/composants.html': 'lazy-composants',
    '/pages/formulaires.html': 'lazy-formulaires',
    '/pages/navigation.html': 'lazy-navigation',
    '/pages/data.html': 'lazy-data',
    '/pages/feedback.html': 'lazy-feedback',
    '/pages/overlays.html': 'lazy-overlays',
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
    // buildSidebar est async — chaîner pour garantir que handleInitialHash/scroll-spy
    // voient les liens générés (handleInitialHash lit .sidebar-link[data-href]).
    buildSidebar().finally(function() {
        initScrollSpy();
        if (isSiteHub()) initLazyLoader();
    });
});
