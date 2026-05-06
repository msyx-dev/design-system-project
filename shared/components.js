// components.js — Interactions partagées msyx.design
// Exposes window.__initComponents() pour la re-init SPA après swap de page
//
// ─── Catalogue des fonctions init* ────────────────────────────────────────
//
//  Composant                    Fonction                     Sélecteur principal
//  ──────────────────────────   ──────────────────────────   ───────────────────
//  Tabs                         initComponents()             .tabs
//  Accordion                    initComponents()             .accordion-header
//  Kanban drag & drop           initComponents()             .kanban-board
//  Chips (ajout/suppression)    initChips()                  .chips-input
//  Search inputs                initSearchInputs()           .search-input
//  Range sliders                initSliders()                .slider-track
//  Modals (open/close)          initModals()                 .modal-trigger, .modal
//  Copy buttons                 initCopyButtons()            .copy-btn
//  Theme switcher (select)      initThemeSwitcher()          #theme-switcher
//  Mode switcher (sun/moon)     initModeSwitcher()           .mode-toggle
//  Data grids (tri, filtre)     initDataGrids()              .data-grid
//  Carousel                     initCarousel()               .carousel
//  Rating (étoiles)             initRating()                 .rating
//  Bottom navigation            initBottomNav()              .bottom-nav
//  Number inputs (+/-)          initNumberInputs()           .number-input
//  FAB (floating action button) initFAB()                    .fab
//  Segmented controls           initSegmentedControls()      .segmented-control
//  OTP inputs                   initOTPInputs()              .otp-input
//  Tag inputs                   initTagInputs()              .tag-input
//  Tree view                    initTreeView()               .tree-view
//  Bottom sheet                 initBottomSheet()            .bottom-sheet-trigger
//  Lightbox                     initLightbox()               .lightbox-trigger
//  Context menu                 initContextMenu()            .context-menu-trigger
//  Pie charts (SVG)             initPieCharts()              .pie-chart
//  Gauges (jauge circulaire)    initGauges()                 .gauge
//  Animated counters            initAnimatedCounters()       .counter
//  Progress trackers            initProgressTrackers()       .progress-tracker
//  Sortable lists               initSortableLists()          .sortable-list
//  Video embeds                 initVideoEmbeds()            .video-embed
//  Before / after slider        initBeforeAfter()            .before-after
//  Quiz / poll                  initQuiz()                   .quiz
//  Decision tree                initDecisionTree()           .decision-tree
//  Command palette              initCommandPalette()         .command-palette-trigger
//  Pricing toggle               initPricing()                .pricing-toggle
//  Notification center          initNotificationCenter()     .notification-center
//  Activity feed                initActivityFeed()           .activity-feed
//  Wizard / stepper interactif  initWizard()                 .wizard
//  Inline edit                  initInlineEdit()             .inline-edit
//  Action menu                  initActionMenu()             .action-menu
//  Sidebar rail                 initSidebarRail()            .sidebar-rail
//  Tooltips ARIA                initTooltipsARIA()           [data-tooltip]
//  Auto-save indicator          initAutoSave()               .autosave[data-autosave-demo]
//  Comments / Thread            initComments()               .comment-action-btn[data-reply-trigger]
//  Auth Flows                   initAuthFlows()              .login-strength[data-strength-target]
//  Usage meter                  initUsageMeter()             .usage-meter[data-value]
//  Confirm Popover              initConfirmPopover()         .popover-confirm-wrap
//
// ─── Pattern anti-double-bind ─────────────────────────────────────────────
//  Tous les init* utilisent `element.dataset.bound = '1'` pour éviter
//  les doublons d'event listeners lors des re-inits SPA via reinitAll().
//
// ─── Ajout d'un nouveau composant ─────────────────────────────────────────
//  1. Créer function initNomComposant() avec pattern dataset.bound
//  2. Exposer via window.__initNomComposant = initNomComposant;
//  3. Appeler dans reinitAll() pour compatibilité SPA
//  4. Documenter ci-dessus dans le catalogue
// ──────────────────────────────────────────────────────────────────────────

function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function initComponents() {
    // Tabs — ARIA role=tablist/tab + navigation clavier flèches
    document.querySelectorAll('.tabs').forEach(g => {
        if (g.dataset.bound) return;
        g.dataset.bound = '1';
        g.setAttribute('role', 'tablist');
        const tabs = Array.from(g.querySelectorAll('.tab'));
        tabs.forEach((t, idx) => {
            t.setAttribute('role', 'tab');
            t.setAttribute('tabindex', t.classList.contains('active') ? '0' : '-1');
            t.setAttribute('aria-selected', t.classList.contains('active') ? 'true' : 'false');
            t.addEventListener('click', () => {
                tabs.forEach(x => {
                    x.classList.remove('active');
                    x.setAttribute('tabindex', '-1');
                    x.setAttribute('aria-selected', 'false');
                });
                t.classList.add('active');
                t.setAttribute('tabindex', '0');
                t.setAttribute('aria-selected', 'true');
                t.focus();
            });
            t.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    t.click();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = tabs[(idx + 1) % tabs.length];
                    next.click();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                    prev.click();
                }
            });
        });
    });

    // Accordion — ARIA aria-expanded + role=button
    document.querySelectorAll('.accordion-header').forEach(h => {
        if (h.dataset.bound) return;
        h.dataset.bound = '1';
        h.setAttribute('role', 'button');
        h.setAttribute('tabindex', '0');
        const isOpen = h.parentElement.classList.contains('open');
        h.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        const toggle = () => {
            h.parentElement.classList.toggle('open');
            h.setAttribute('aria-expanded', h.parentElement.classList.contains('open') ? 'true' : 'false');
        };
        h.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
        h.addEventListener('click', toggle);
    });

    // Chart animations
    const chartObs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('chart-visible'); chartObs.unobserve(e.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll('.chart-animated:not(.chart-visible)').forEach(el => chartObs.observe(el));

    // Chart tooltips
    document.querySelectorAll('.chart-bar, .chart-point, .chart-donut-slice').forEach(el => {
        if (el.dataset.bound) return;
        el.dataset.bound = '1';
        const label = el.dataset.label, value = el.dataset.value;
        if (!label || !value) return;
        const container = el.closest('.chart-wrap');
        if (!container) return;
        const tooltip = container.querySelector('.chart-tooltip');
        if (!tooltip) return;
        el.addEventListener('mouseenter', evt => {
            tooltip.textContent = label + ' : ' + value;
            tooltip.classList.add('visible');
            const rect = container.getBoundingClientRect();
            tooltip.style.left = (evt.clientX - rect.left + 10) + 'px';
            tooltip.style.top = (evt.clientY - rect.top - 30) + 'px';
        });
        el.addEventListener('mousemove', evt => {
            const rect = container.getBoundingClientRect();
            tooltip.style.left = (evt.clientX - rect.left + 10) + 'px';
            tooltip.style.top = (evt.clientY - rect.top - 30) + 'px';
        });
        el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
    });

    // Kanban drag & drop
    document.querySelectorAll('.kanban-card').forEach(card => {
        if (card.dataset.bound) return;
        card.dataset.bound = '1';
        card.addEventListener('dragstart', e => { card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over')); });
    });
    document.querySelectorAll('.kanban-column').forEach(col => {
        if (col.dataset.bound) return;
        col.dataset.bound = '1';
        col.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', e => {
            e.preventDefault(); col.classList.remove('drag-over');
            const dragging = document.querySelector('.kanban-card.dragging');
            if (dragging) { col.appendChild(dragging); document.querySelectorAll('.kanban-column').forEach(c => { const cnt = c.querySelectorAll('.kanban-card').length; const b = c.querySelector('.kanban-count'); if (b) b.textContent = cnt; }); }
        });
    });

    // Backlog filters
    document.querySelectorAll('.backlog-filters .btn-filter').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            document.querySelectorAll('.backlog-filters .btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('.backlog-item').forEach(item => { item.classList.toggle('hidden', f !== 'all' && item.dataset.priority !== f); });
        });
    });

    // Burndown animation
    const burnObs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('burndown-visible'); burnObs.unobserve(e.target); } });
    }, { threshold: 0.2 });
    document.querySelectorAll('.burndown-animated:not(.burndown-visible)').forEach(el => burnObs.observe(el));

    // Dropdowns
    document.querySelectorAll('.dropdown').forEach(dd => {
        if (dd.dataset.bound) return;
        dd.dataset.bound = '1';
        const trigger = dd.querySelector('.dropdown-trigger');
        const menu = dd.querySelector('.dropdown-menu');
        if (!trigger || !menu) return;
        trigger.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
            document.querySelectorAll('.dropdown-trigger.open').forEach(t => t.classList.remove('open'));
            if (!isOpen) { menu.classList.add('open'); trigger.classList.add('open'); const s = menu.querySelector('.dropdown-search input'); if (s) s.focus(); }
        });
        menu.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.addEventListener('click', () => {
                if (dd.dataset.multi === 'true') { opt.classList.toggle('selected'); }
                else { menu.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); const v = trigger.querySelector('.dropdown-value'); if (v) v.textContent = opt.textContent.trim(); menu.classList.remove('open'); trigger.classList.remove('open'); }
            });
        });
        const si = menu.querySelector('.dropdown-search input');
        if (si) si.addEventListener('input', () => { const q = si.value.toLowerCase(); menu.querySelectorAll('.dropdown-option').forEach(o => { o.style.display = o.textContent.toLowerCase().includes(q) ? '' : 'none'; }); });
    });

    // Chips
    initChips();

    // Search Inputs
    initSearchInputs();

    // Sliders
    initSliders();

    // Modals
    initModals();

    // Copy Buttons
    initCopyButtons();

    // Carousel
    initCarousel();

    // Data Grids
    initDataGrids();

    // Rating
    initRating();

    // Bottom Navigation
    initBottomNav();

    // Number Inputs
    initNumberInputs();

    // FAB
    initFAB();

    // Segmented Controls
    initSegmentedControls();

    // OTP Inputs
    initOTPInputs();

    // Tag Inputs
    initTagInputs();

    // Tree View
    initTreeView();

    // Bottom Sheet
    initBottomSheet();

    // Lightbox
    initLightbox();

    // Context Menu
    initContextMenu();

    // Pie / Donut Charts
    initPieCharts();

    // Gauge / Speedometer
    initGauges();

    // Animated Counters
    initAnimatedCounters();

    // Progress Trackers
    initProgressTrackers();

    // Sortable Lists
    initSortableLists();

    // Video Embeds
    initVideoEmbeds();

    // Before / After Slider
    initBeforeAfter();

    // Quiz / Poll
    initQuiz();

    // Decision Tree
    initDecisionTree();

    // Tooltips ARIA
    initTooltipsARIA();

    // Command Palette
    initCommandPalette();
}

// Tooltips — role="tooltip" + aria-describedby
function initTooltipsARIA() {
    var uid = 0;
    document.querySelectorAll('.tooltip-wrap').forEach(function(wrap) {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';
        var tip = wrap.querySelector('.tooltip');
        if (!tip) return;
        if (!tip.id) {
            tip.id = 'tooltip-' + (++uid);
        }
        tip.setAttribute('role', 'tooltip');
        var trigger = wrap.querySelector('[aria-label], button, a, [tabindex]') || wrap.firstElementChild;
        if (trigger && trigger !== tip) {
            trigger.setAttribute('aria-describedby', tip.id);
        }
    });
}

// Chips
function initChips() {
    // Suppression : délégation sur chip-close (chips simples et chip-input-item)
    document.querySelectorAll('.chip:not(.chip-filter)').forEach(chip => {
        if (chip.dataset.chipBound) return;
        chip.dataset.chipBound = '1';
        const closeBtn = chip.querySelector('.chip-close');
        if (!closeBtn) return;
        closeBtn.addEventListener('click', () => {
            chip.style.transition = 'opacity 0.18s, transform 0.18s';
            chip.style.opacity = '0';
            chip.style.transform = 'scale(0.8)';
            setTimeout(() => chip.remove(), 180);
        });
    });

    // Filter toggle : délégation sur chip-group
    document.querySelectorAll('.chip-group').forEach(group => {
        if (group.dataset.bound) return;
        group.dataset.bound = '1';
        group.addEventListener('click', e => {
            const filter = e.target.closest('.chip-filter');
            if (!filter) return;
            group.querySelectorAll('.chip-filter').forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
        });
    });

    // Chip input : saisie dynamique
    document.querySelectorAll('.chip-input-wrapper').forEach(wrapper => {
        if (wrapper.dataset.bound) return;
        wrapper.dataset.bound = '1';

        const input = wrapper.querySelector('.chip-input-field');
        if (!input) return;

        function createChip(value) {
            const trimmed = value.trim().replace(/,+$/, '').trim();
            if (!trimmed) return;
            // Anti-doublon
            const existing = Array.from(wrapper.querySelectorAll('.chip-input-item'))
                .map(c => c.textContent.trim().replace('×', '').trim());
            if (existing.includes(trimmed)) return;

            const chip = document.createElement('span');
            chip.className = 'chip chip-input-item';
            chip.dataset.chipBound = '1';
            chip.innerHTML = escapeHTML(trimmed) + ' <button class="chip-close" aria-label="Supprimer ' + escapeHTML(trimmed) + '">&times;</button>';
            chip.querySelector('.chip-close').addEventListener('click', () => {
                chip.style.transition = 'opacity 0.18s, transform 0.18s';
                chip.style.opacity = '0';
                chip.style.transform = 'scale(0.8)';
                setTimeout(() => chip.remove(), 180);
            });
            wrapper.insertBefore(chip, input);
        }

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                createChip(input.value);
                input.value = '';
            } else if (e.key === 'Backspace' && input.value === '') {
                const chips = wrapper.querySelectorAll('.chip-input-item');
                if (chips.length > 0) {
                    const last = chips[chips.length - 1];
                    last.style.transition = 'opacity 0.18s, transform 0.18s';
                    last.style.opacity = '0';
                    last.style.transform = 'scale(0.8)';
                    setTimeout(() => last.remove(), 180);
                }
            }
        });

        // Clic sur le wrapper donne le focus à l'input
        wrapper.addEventListener('click', e => {
            if (e.target === wrapper) input.focus();
        });
    });
}
window.__initChips = initChips;

// Search Inputs
function initSearchInputs() {
    document.querySelectorAll('.search-input-wrap').forEach(wrap => {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';

        const input = wrap.querySelector('.search-input');
        const clearBtn = wrap.querySelector('.search-clear');
        const isSuggestions = wrap.classList.contains('search-with-suggestions');
        const suggestionsEl = isSuggestions ? wrap.querySelector('.search-suggestions') : null;
        const rawSuggestions = isSuggestions ? (wrap.dataset.suggestions || '').split(',').map(s => s.trim()).filter(Boolean) : [];
        let activeIndex = -1;

        function highlightMatch(text, query) {
            if (!query) return document.createTextNode(text);
            const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            const span = document.createElement('span');
            span.innerHTML = text.replace(regex, '<mark>$1</mark>');
            return span;
        }

        function openSuggestions(items, query) {
            if (!suggestionsEl) return;
            suggestionsEl.innerHTML = '';
            activeIndex = -1;
            if (items.length === 0) {
                const li = document.createElement('li');
                li.className = 'search-no-result';
                li.textContent = 'Aucun résultat pour "' + query + '"';
                suggestionsEl.appendChild(li);
            } else {
                items.forEach((item, i) => {
                    const li = document.createElement('li');
                    li.className = 'search-item';
                    li.setAttribute('role', 'option');
                    li.setAttribute('aria-selected', 'false');
                    li.appendChild(highlightMatch(item, query));
                    li.addEventListener('mousedown', e => {
                        e.preventDefault();
                        input.value = item;
                        if (clearBtn) clearBtn.classList.remove('hidden');
                        closeSuggestions();
                        input.focus();
                    });
                    suggestionsEl.appendChild(li);
                });
            }
            suggestionsEl.classList.remove('hidden');
            wrap.setAttribute('aria-expanded', 'true');
        }

        function closeSuggestions() {
            if (!suggestionsEl) return;
            suggestionsEl.classList.add('hidden');
            wrap.setAttribute('aria-expanded', 'false');
            activeIndex = -1;
        }

        function updateActive(index) {
            const items = suggestionsEl ? suggestionsEl.querySelectorAll('.search-item') : [];
            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
                item.setAttribute('aria-selected', i === index ? 'true' : 'false');
            });
        }

        // Clear button visibility
        if (input && clearBtn) {
            input.addEventListener('input', () => {
                const hasValue = input.value.length > 0;
                clearBtn.classList.toggle('hidden', !hasValue);

                if (isSuggestions && suggestionsEl) {
                    const q = input.value.trim();
                    if (q.length === 0) { closeSuggestions(); return; }
                    const filtered = rawSuggestions.filter(s => s.toLowerCase().includes(q.toLowerCase()));
                    openSuggestions(filtered, q);
                }
            });

            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.classList.add('hidden');
                closeSuggestions();
                input.focus();
            });
        }

        // Keyboard navigation
        if (isSuggestions && input && suggestionsEl) {
            input.addEventListener('keydown', e => {
                const items = suggestionsEl.querySelectorAll('.search-item');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIndex = Math.min(activeIndex + 1, items.length - 1);
                    updateActive(activeIndex);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIndex = Math.max(activeIndex - 1, -1);
                    updateActive(activeIndex);
                } else if (e.key === 'Enter') {
                    if (activeIndex >= 0 && items[activeIndex]) {
                        e.preventDefault();
                        input.value = items[activeIndex].textContent;
                        if (clearBtn) clearBtn.classList.remove('hidden');
                        closeSuggestions();
                    }
                } else if (e.key === 'Escape') {
                    closeSuggestions();
                    input.blur();
                }
            });

            input.addEventListener('focus', () => {
                if (input.value.trim().length > 0) {
                    const q = input.value.trim();
                    const filtered = rawSuggestions.filter(s => s.toLowerCase().includes(q.toLowerCase()));
                    openSuggestions(filtered, q);
                }
            });

            input.addEventListener('blur', () => {
                setTimeout(closeSuggestions, 150);
            });
        }
    });
}
window.__initSearchInputs = initSearchInputs;

// Sliders
function initSliders() {
    document.querySelectorAll('.slider-group').forEach(group => {
        if (group.dataset.bound) return;
        group.dataset.bound = '1';
        const track = group.querySelector('.slider-track');
        const numInput = group.querySelector('.slider-value');
        const display = group.querySelector('.slider-value-display');
        if (!track) return;

        function updateFill() {
            const min = +track.min || 0, max = +track.max || 100, val = +track.value;
            const pct = ((val - min) / (max - min)) * 100;
            track.style.setProperty('--slider-fill', pct + '%');
        }

        track.addEventListener('input', () => {
            updateFill();
            if (numInput && numInput.value !== track.value) numInput.value = track.value;
            if (display) display.textContent = track.value;
        });
        if (numInput) {
            numInput.addEventListener('input', () => {
                let v = Math.max(+track.min || 0, Math.min(+track.max || 100, +numInput.value || 0));
                if (+track.value !== v) { track.value = v; }
                updateFill();
            });
        }
        updateFill(); // init fill on load
    });
}

// Toast system
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }
    var icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;', info: '&#8505;' };
    var colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type + ' toast-enter';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span style="color:' + colors[type] + ';font-size:1rem;">' + icons[type] + '</span><span>' + escapeHTML(message) + '</span><button class="toast-close">&times;</button>';
    container.appendChild(toast);
    var closeBtn = toast.querySelector('.toast-close');
    function dismiss() {
        if (toast.parentNode) {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }
    }
    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}
window.__showToast = showToast;

// Modal Dialog
function initModals() {
    document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            var dialogId = btn.dataset.modalTrigger;
            var dialog = document.getElementById(dialogId);
            if (dialog) dialog.showModal();
        });
    });

    document.querySelectorAll('dialog.modal-dialog').forEach(dialog => {
        if (dialog.dataset.bound) return;
        dialog.dataset.bound = '1';

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });

        // Close buttons
        dialog.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => dialog.close());
        });
    });
}

// API programmatique
window.__openModal = function(config) {
    var title = config.title, body = config.body, variant = config.variant, actions = config.actions;
    var dialog = document.getElementById('ds-dynamic-modal');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'ds-dynamic-modal';
        dialog.className = 'modal-dialog';
        document.body.appendChild(dialog);
        dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.close(); });
    }

    var actionsHtml = '';
    if (actions) {
        actionsHtml = '<div class="modal-actions">' + actions.map(function(a) {
            return '<button class="btn btn-' + (a.style || 'secondary') + '" data-modal-close' + (a.onClick ? ' onclick="' + a.onClick + '"' : '') + '>' + a.label + '</button>';
        }).join('') + '</div>';
    } else if (variant === 'confirm') {
        actionsHtml = '<div class="modal-actions"><button class="btn btn-secondary" data-modal-close>Annuler</button><button class="btn btn-primary" data-modal-close>Confirmer</button></div>';
    } else {
        actionsHtml = '<div class="modal-actions"><button class="btn btn-primary" data-modal-close>Fermer</button></div>';
    }

    var bodyContent = config.bodyHTML ? config.bodyHTML : escapeHTML(body || '');
    dialog.innerHTML = '<div class="modal-header"><h3>' + escapeHTML(title || 'Modal') + '</h3><button class="modal-close" data-modal-close aria-label="Fermer">&times;</button></div><div class="modal-body">' + bodyContent + '</div>' + actionsHtml;

    dialog.querySelectorAll('[data-modal-close]').forEach(function(btn) {
        btn.addEventListener('click', function() { dialog.close(); });
    });

    dialog.showModal();
    return dialog;
};

// Copy Buttons
var SVG_CLIPBOARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
var SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function doCopy(btn, text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function() {
        btn.classList.add('copy-btn--success');
        btn.querySelector('.copy-icon').innerHTML = SVG_CHECK;
        setTimeout(function() {
            btn.classList.remove('copy-btn--success');
            btn.querySelector('.copy-icon').innerHTML = SVG_CLIPBOARD;
        }, 2000);
    });
}

function initCopyButtons() {
    // Boutons copy explicites [data-copy]
    document.querySelectorAll('[data-copy]').forEach(function(btn) {
        if (btn.dataset.copyBound) return;
        btn.dataset.copyBound = 'true';
        btn.addEventListener('click', function() {
            doCopy(btn, btn.dataset.copy);
        });
    });

    // Injection automatique dans les .code-block non encore wrappés
    // (ignore ceux déjà dans un .code-block-wrap — bouton statique HTML présent)
    document.querySelectorAll('.code-block').forEach(function(block) {
        if (block.dataset.copyBound) return;
        block.dataset.copyBound = 'true';
        // Si déjà dans un code-block-wrap, le bouton inline est déjà dans le HTML
        var parent = block.parentNode;
        if (parent.classList.contains('code-block-wrap')) return;
        // Extraire le texte brut du code block
        var text = block.innerText || block.textContent || '';
        // Wrapper dans .code-block-wrap
        var wrap = document.createElement('div');
        wrap.className = 'code-block-wrap';
        parent.insertBefore(wrap, block);
        wrap.appendChild(block);
        // Créer le bouton inline
        var inlineBtn = document.createElement('button');
        inlineBtn.className = 'copy-btn copy-btn--inline';
        inlineBtn.setAttribute('aria-label', 'Copier le code');
        inlineBtn.setAttribute('title', 'Copier');
        inlineBtn.innerHTML = '<span class="copy-icon">' + SVG_CLIPBOARD + '</span><span class="copy-tooltip">Copie !</span>';
        wrap.appendChild(inlineBtn);
        inlineBtn.dataset.copyBound = 'true';
        inlineBtn.addEventListener('click', function() {
            doCopy(inlineBtn, text);
        });
    });
}
window.__initCopyButtons = initCopyButtons;

var THEME_CONFIG = {
    msyx:  { modes: ['dark', 'light'], defaultMode: 'dark' },
    acssi: { modes: ['dark', 'light'], defaultMode: 'dark' },
    nhood: { modes: ['dark', 'light'], defaultMode: 'dark' }
};

// Transition douce sur changement theme/mode
function applyThemeTransition(callback) {
    document.documentElement.classList.add('theme-transitioning');
    callback();
    setTimeout(function() {
        document.documentElement.classList.remove('theme-transitioning');
    }, 300);
}

// Noms lisibles des themes/modes pour le toast
var THEME_LABELS = { msyx: 'MSYX', acssi: 'ACSSI', nhood: 'Nhood' };
var MODE_LABELS  = { dark: 'Dark', light: 'Light' };

function initThemeSwitcher() {
    var select = document.getElementById('theme-select');
    if (!select) return;
    var current = document.documentElement.getAttribute('data-theme') || 'msyx';
    select.value = current;
    if (select.dataset.bound) return;
    select.dataset.bound = '1';
    select.addEventListener('change', function() {
        var theme = this.value;
        applyThemeTransition(function() {
            if (theme === 'msyx') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', theme);
            }
            localStorage.setItem('msyx-theme', theme);
            // Check if current mode is compatible with new theme
            var config = THEME_CONFIG[theme] || THEME_CONFIG.msyx;
            var currentMode = document.documentElement.getAttribute('data-mode') || 'dark';
            if (config.modes.indexOf(currentMode) === -1) {
                applyMode(config.defaultMode);
            }
            updateModeButtons();
        });
        if (typeof showToast === 'function') {
            showToast('Theme : ' + (THEME_LABELS[theme] || theme), 'info', 2000);
        }
    });
}
window.__initThemeSwitcher = initThemeSwitcher;

function applyMode(mode) {
    if (mode === 'dark') {
        document.documentElement.removeAttribute('data-mode');
    } else {
        document.documentElement.setAttribute('data-mode', mode);
    }
    localStorage.setItem('msyx-mode', mode);
}

function updateModeButtons() {
    var darkBtn = document.getElementById('mode-dark');
    var lightBtn = document.getElementById('mode-light');
    if (!darkBtn || !lightBtn) return;
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'msyx';
    var currentMode = document.documentElement.getAttribute('data-mode') || 'dark';
    var config = THEME_CONFIG[currentTheme] || THEME_CONFIG.msyx;
    var lightAvailable = config.modes.indexOf('light') !== -1;
    lightBtn.disabled = !lightAvailable;
    lightBtn.title = lightAvailable ? 'Light' : 'Dark only';
    darkBtn.classList.toggle('active', currentMode === 'dark');
    lightBtn.classList.toggle('active', currentMode === 'light');
}

function initModeSwitcher() {
    var darkBtn = document.getElementById('mode-dark');
    var lightBtn = document.getElementById('mode-light');
    if (!darkBtn || !lightBtn) return;
    updateModeButtons();
    if (darkBtn.dataset.bound) return;
    darkBtn.dataset.bound = '1';
    lightBtn.dataset.bound = '1';
    darkBtn.addEventListener('click', function() {
        applyThemeTransition(function() { applyMode('dark'); updateModeButtons(); });
        if (typeof showToast === 'function') showToast('Mode : Dark', 'info', 2000);
    });
    lightBtn.addEventListener('click', function() {
        if (lightBtn.disabled) return;
        applyThemeTransition(function() { applyMode('light'); updateModeButtons(); });
        if (typeof showToast === 'function') showToast('Mode : Light', 'info', 2000);
    });
}
window.__initModeSwitcher = initModeSwitcher;

// Expose for SPA re-init
// ===== DATA GRID =====
var DATA_GRID_ROWS = [
    { composant: 'Button', categorie: 'Composants', statut: 'Stable', sprint: 'Sprint 1', sp: 2, js: false },
    { composant: 'Badge', categorie: 'Composants', statut: 'Stable', sprint: 'Sprint 1', sp: 1, js: false },
    { composant: 'Card', categorie: 'Composants', statut: 'Stable', sprint: 'Sprint 1', sp: 2, js: false },
    { composant: 'Modal', categorie: 'Feedback', statut: 'Stable', sprint: 'Sprint 5', sp: 3, js: true },
    { composant: 'Toast', categorie: 'Feedback', statut: 'Stable', sprint: 'Sprint 3', sp: 3, js: true },
    { composant: 'Tabs', categorie: 'Navigation', statut: 'Stable', sprint: 'Sprint 2', sp: 2, js: true },
    { composant: 'Slider', categorie: 'Formulaires', statut: 'Stable', sprint: 'Sprint 5', sp: 3, js: true },
    { composant: 'Breadcrumbs', categorie: 'Navigation', statut: 'Stable', sprint: 'Sprint 6', sp: 3, js: true },
    { composant: 'Copy Button', categorie: 'Divers', statut: 'Stable', sprint: 'Sprint 6', sp: 2, js: true },
    { composant: 'Chip', categorie: 'Composants', statut: 'En cours', sprint: 'Sprint 6', sp: 2, js: true },
    { composant: 'Data Grid', categorie: 'Data', statut: 'En cours', sprint: 'Sprint 6', sp: 5, js: true },
    { composant: 'Carousel', categorie: 'Composants', statut: 'Planifie', sprint: 'Sprint 6', sp: 3, js: true }
];

function initDataGrids() {
    document.querySelectorAll('.data-grid').forEach(function(grid) {
        if (grid.dataset.bound) return;
        grid.dataset.bound = '1';

        var tbody = grid.querySelector('.data-grid-body');
        var filterInputs = grid.querySelectorAll('.data-grid-filter');
        var sortHeaders = grid.querySelectorAll('.data-grid-sortable');
        var selectAllCb = grid.querySelector('.data-grid-select-all');
        var countEl = grid.closest('.demo-box') ? grid.closest('.demo-box').querySelector('.data-grid-count') : null;
        var selEl = grid.closest('.demo-box') ? grid.closest('.demo-box').querySelector('.data-grid-selection') : null;

        var filterState = {};
        var sortState = { col: null, dir: 'none' };

        function getStatutBadge(statut) {
            var map = { 'Stable': 'badge-success', 'En cours': 'badge-primary', 'Planifie': 'badge-warning', 'Annule': 'badge-danger' };
            var cls = map[statut] || 'badge-info';
            return '<span class="badge ' + cls + '" style="font-size:0.68rem;padding:0.15rem 0.5rem;">' + statut + '</span>';
        }

        function getSortedFiltered() {
            var rows = DATA_GRID_ROWS.slice();
            // Filter
            Object.keys(filterState).forEach(function(col) {
                var val = filterState[col].toLowerCase().trim();
                if (!val) return;
                var colIdx = parseInt(col, 10);
                rows = rows.filter(function(r) {
                    var colKeys = ['composant', 'categorie', 'statut', 'sprint', 'sp', 'js'];
                    var cellVal = String(r[colKeys[colIdx]]).toLowerCase();
                    return cellVal.includes(val);
                });
            });
            // Sort
            if (sortState.col !== null && sortState.dir !== 'none') {
                var colKeys = ['composant', 'categorie', 'statut', 'sprint', 'sp', 'js'];
                var key = colKeys[sortState.col];
                rows.sort(function(a, b) {
                    var av = a[key], bv = b[key];
                    var cmp = typeof av === 'number'
                        ? av - bv
                        : String(av).localeCompare(String(bv), 'fr');
                    return sortState.dir === 'asc' ? cmp : -cmp;
                });
            }
            return rows;
        }

        function renderRows(data) {
            tbody.innerHTML = '';
            data.forEach(function(row) {
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td><input type="checkbox" style="accent-color:var(--accent);cursor:pointer;"></td>' +
                    '<td style="font-weight:500;">' + row.composant + '</td>' +
                    '<td>' + row.categorie + '</td>' +
                    '<td>' + getStatutBadge(row.statut) + '</td>' +
                    '<td><span class="tag">' + row.sprint + '</span></td>' +
                    '<td style="font-weight:600;color:var(--accent-light);">' + row.sp + '</td>' +
                    '<td>' + (row.js ? '<span style="color:var(--warning);font-size:0.8rem;font-weight:600;">JS</span>' : '<span style="color:var(--text-dim);font-size:0.8rem;">—</span>') + '</td>';
                var cb = tr.querySelector('input[type="checkbox"]');
                cb.addEventListener('change', function() {
                    if (cb.checked) {
                        tr.classList.add('selected');
                    } else {
                        tr.classList.remove('selected');
                    }
                    updateSelectAllState();
                    updateFooter();
                });
                tbody.appendChild(tr);
            });
        }

        function updateFooter() {
            var allRows = tbody.querySelectorAll('tr');
            var selRows = tbody.querySelectorAll('tr.selected');
            if (countEl) countEl.textContent = allRows.length + ' / ' + DATA_GRID_ROWS.length + ' lignes';
            if (selEl) {
                if (selRows.length > 0) {
                    selEl.textContent = selRows.length + ' selectionne' + (selRows.length > 1 ? 'es' : 'e');
                    selEl.style.display = '';
                } else {
                    selEl.textContent = '';
                    selEl.style.display = 'none';
                }
            }
        }

        function updateSelectAllState() {
            if (!selectAllCb) return;
            var allCbs = tbody.querySelectorAll('input[type="checkbox"]');
            var checked = tbody.querySelectorAll('input[type="checkbox"]:checked');
            if (checked.length === 0) {
                selectAllCb.checked = false;
                selectAllCb.indeterminate = false;
            } else if (checked.length === allCbs.length) {
                selectAllCb.checked = true;
                selectAllCb.indeterminate = false;
            } else {
                selectAllCb.checked = false;
                selectAllCb.indeterminate = true;
            }
        }

        function refresh() {
            var data = getSortedFiltered();
            renderRows(data);
            updateFooter();
        }

        // Sort handlers
        sortHeaders.forEach(function(th) {
            th.setAttribute('role', 'columnheader');
            th.setAttribute('aria-sort', 'none');
            th.addEventListener('click', function() {
                var col = parseInt(th.dataset.col, 10);
                var currentDir = th.getAttribute('aria-sort');
                var nextDir = currentDir === 'none' ? 'asc' : currentDir === 'asc' ? 'desc' : 'none';
                // Reset all
                sortHeaders.forEach(function(h) {
                    h.setAttribute('aria-sort', 'none');
                    var icon = h.querySelector('.data-grid-sort-icon');
                    if (icon) icon.textContent = '↕';
                });
                th.setAttribute('aria-sort', nextDir);
                var icon = th.querySelector('.data-grid-sort-icon');
                if (icon) icon.textContent = nextDir === 'asc' ? '↑' : nextDir === 'desc' ? '↓' : '↕';
                sortState = { col: nextDir === 'none' ? null : col, dir: nextDir };
                refresh();
            });
        });

        // Filter handlers
        filterInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                filterState[input.dataset.col] = input.value;
                refresh();
            });
        });

        // Select-all handler
        if (selectAllCb) {
            selectAllCb.addEventListener('change', function() {
                var allCbs = tbody.querySelectorAll('input[type="checkbox"]');
                allCbs.forEach(function(cb) {
                    cb.checked = selectAllCb.checked;
                    if (selectAllCb.checked) {
                        cb.closest('tr').classList.add('selected');
                    } else {
                        cb.closest('tr').classList.remove('selected');
                    }
                });
                updateFooter();
            });
        }

        // Initial render
        refresh();
    });
}
window.__initDataGrids = initDataGrids;

function initCarousel() {
    document.querySelectorAll('.carousel').forEach(function(carousel) {
        if (carousel.dataset.bound) return;
        carousel.dataset.bound = '1';

        var track = carousel.querySelector('.carousel-track');
        var slides = carousel.querySelectorAll('.carousel-slide');
        var dotsContainer = carousel.querySelector('.carousel-dots');
        var btnPrev = carousel.querySelector('.carousel-btn-prev');
        var btnNext = carousel.querySelector('.carousel-btn-next');
        if (!track || !slides.length) return;

        // Keyboard accessibility
        if (!carousel.hasAttribute('tabindex')) {
            carousel.setAttribute('tabindex', '0');
        }
        carousel.setAttribute('role', 'region');
        carousel.setAttribute('aria-label', carousel.dataset.label || 'Carrousel');

        var total = slides.length;
        var current = 0;
        var autoplayMs = parseInt(carousel.dataset.autoplay, 10) || 0;
        var timer = null;

        // Build dots
        if (dotsContainer) {
            for (var i = 0; i < total; i++) {
                var dot = document.createElement('button');
                dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-label', 'Slide ' + (i + 1) + ' sur ' + total);
                dot.dataset.index = i;
                dotsContainer.appendChild(dot);
            }
            dotsContainer.addEventListener('click', function(e) {
                var btn = e.target.closest('.carousel-dot');
                if (btn) goTo(parseInt(btn.dataset.index, 10));
            });
        }

        function updateDots() {
            if (!dotsContainer) return;
            dotsContainer.querySelectorAll('.carousel-dot').forEach(function(dot, idx) {
                dot.classList.toggle('active', idx === current);
            });
        }

        function goTo(index) {
            current = ((index % total) + total) % total;
            track.style.transform = 'translateX(-' + current * 100 + '%)';
            updateDots();
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', function() { goTo(current - 1); });
        }
        if (btnNext) {
            btnNext.addEventListener('click', function() { goTo(current + 1); });
        }

        // Auto-play
        function startAutoplay() {
            if (!autoplayMs) return;
            timer = setInterval(function() { goTo(current + 1); }, autoplayMs);
        }
        function stopAutoplay() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        if (autoplayMs) {
            carousel.addEventListener('mouseenter', stopAutoplay);
            carousel.addEventListener('focusin', stopAutoplay);
            carousel.addEventListener('mouseleave', startAutoplay);
            carousel.addEventListener('focusout', function(e) {
                if (!carousel.contains(e.relatedTarget)) startAutoplay();
            });
            startAutoplay();
        }

        // Keyboard navigation
        carousel.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goTo(current - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goTo(current + 1);
            }
        });

        // Touch swipe
        var touchStartX = 0;
        var touchStartY = 0;
        var touchMoved = false;
        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
        }, { passive: true });
        carousel.addEventListener('touchmove', function(e) {
            var dx = e.touches[0].clientX - touchStartX;
            var dy = e.touches[0].clientY - touchStartY;
            if (!touchMoved && Math.abs(dx) > Math.abs(dy)) {
                e.preventDefault();
            }
            touchMoved = true;
        }, { passive: false });
        carousel.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - touchStartX;
            var dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                goTo(dx < 0 ? current + 1 : current - 1);
            }
        }, { passive: true });

        // Cleanup SPA : MutationObserver watches carousel removal
        var observer = new MutationObserver(function() {
            if (!document.body.contains(carousel)) {
                stopAutoplay();
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}
window.__initCarousel = initCarousel;

// Rating
function initRating() {
    var STAR_FULL = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

    document.querySelectorAll('.rating').forEach(function(widget) {
        if (widget.dataset.bound) return;
        widget.dataset.bound = '1';

        var isReadonly = widget.classList.contains('rating--readonly');
        var stars = widget.querySelectorAll('.rating-star');
        var currentValue = parseInt(widget.dataset.value || '0', 10);

        function updateStars(hoverIdx) {
            var idx = hoverIdx !== undefined ? hoverIdx : currentValue;
            stars.forEach(function(star, i) {
                var n = i + 1;
                star.classList.remove('active', 'hover');
                if (hoverIdx !== undefined) {
                    if (n <= hoverIdx) star.classList.add('hover');
                } else {
                    if (n <= currentValue) star.classList.add('active');
                }
            });
        }

        if (!isReadonly) {
            stars.forEach(function(star, i) {
                var n = i + 1;
                star.addEventListener('mouseover', function() { updateStars(n); });
                star.addEventListener('mouseout', function() { updateStars(); });
                star.addEventListener('click', function() {
                    currentValue = n;
                    widget.dataset.value = n;
                    updateStars();
                    widget.dispatchEvent(new CustomEvent('rating:change', { detail: { value: n } }));
                });
                star.setAttribute('aria-label', 'Note ' + n + ' sur 5');
                star.setAttribute('role', 'radio');
            });
            widget.setAttribute('role', 'radiogroup');
            widget.setAttribute('aria-label', 'Notation');
        }

        updateStars();
    });
}
window.__initRating = initRating;

// Bottom Navigation
function initBottomNav() {
    document.querySelectorAll('.bottom-nav').forEach(function(nav) {
        if (nav.dataset.bound) return;
        nav.dataset.bound = '1';

        nav.querySelectorAll('.bottom-nav-item').forEach(function(item) {
            item.addEventListener('click', function() {
                nav.querySelectorAll('.bottom-nav-item').forEach(function(i) {
                    i.classList.remove('active');
                    i.setAttribute('aria-selected', 'false');
                });
                item.classList.add('active');
                item.setAttribute('aria-selected', 'true');
                nav.dispatchEvent(new CustomEvent('bottomnav:change', {
                    detail: { label: item.dataset.label || '' },
                    bubbles: true
                }));
            });
        });
    });
}
window.__initBottomNav = initBottomNav;

// Number Inputs
function initNumberInputs() {
    document.querySelectorAll('.number-input-wrap').forEach(function(wrap) {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';

        var btnDec = wrap.querySelector('.number-input-btn[data-action="dec"]');
        var btnInc = wrap.querySelector('.number-input-btn[data-action="inc"]');
        var field  = wrap.querySelector('.number-input-field');
        if (!btnDec || !btnInc || !field) return;

        var min  = parseFloat(wrap.dataset.min  !== undefined ? wrap.dataset.min  : '-Infinity');
        var max  = parseFloat(wrap.dataset.max  !== undefined ? wrap.dataset.max  : 'Infinity');
        var step = parseFloat(wrap.dataset.step !== undefined ? wrap.dataset.step : '1') || 1;

        function clamp(val) {
            return Math.min(max, Math.max(min, val));
        }

        function round(val) {
            var inv = 1 / step;
            return Math.round(val * inv) / inv;
        }

        function updateButtons(val) {
            btnDec.disabled = val <= min;
            btnInc.disabled = val >= max;
        }

        function getValue() {
            return parseFloat(field.value) || 0;
        }

        function setValue(val) {
            val = clamp(round(val));
            field.value = val;
            updateButtons(val);
            wrap.dispatchEvent(new CustomEvent('numberinput:change', { detail: { value: val }, bubbles: true }));
        }

        btnDec.addEventListener('click', function() {
            setValue(getValue() - step);
        });

        btnInc.addEventListener('click', function() {
            setValue(getValue() + step);
        });

        field.addEventListener('change', function() {
            setValue(getValue());
        });

        field.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowUp')   { e.preventDefault(); setValue(getValue() + step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); setValue(getValue() - step); }
        });

        // Init button state
        updateButtons(getValue());
    });
}
window.__initNumberInputs = initNumberInputs;

// FAB — Floating Action Button
function initFAB() {
    document.querySelectorAll('.fab-menu').forEach(function(menu) {
        if (menu.dataset.bound) return;
        menu.dataset.bound = '1';

        var trigger = menu.querySelector('.fab-trigger');
        if (!trigger) return;

        function openMenu() {
            menu.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closeMenu() {
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (menu.classList.contains('open')) {
                closeMenu();
            } else {
                // Fermer les autres menus FAB ouverts
                document.querySelectorAll('.fab-menu.open').forEach(function(m) {
                    if (m !== menu) {
                        m.classList.remove('open');
                        var t = m.querySelector('.fab-trigger');
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
                openMenu();
            }
        });

        // Fermeture au clic exterieur
        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target)) {
                closeMenu();
            }
        });

        // Fermeture a la touche Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && menu.classList.contains('open')) {
                closeMenu();
                trigger.focus();
            }
        });
    });
}
window.__initFAB = initFAB;

// Segmented Controls
function initSegmentedControls() {
    document.querySelectorAll('.segmented').forEach(function(seg) {
        if (seg.dataset.bound) return;
        seg.dataset.bound = '1';

        var indicator = seg.querySelector('.segmented-indicator');
        var items = seg.querySelectorAll('.segmented-item');
        if (!indicator || !items.length) return;

        function moveIndicator(item) {
            indicator.style.width = item.offsetWidth + 'px';
            indicator.style.transform = 'translateX(' + item.offsetLeft + 'px)';
        }

        function selectItem(item) {
            items.forEach(function(i) {
                i.classList.remove('active');
                i.setAttribute('aria-pressed', 'false');
            });
            item.classList.add('active');
            item.setAttribute('aria-pressed', 'true');
            moveIndicator(item);
            seg.dispatchEvent(new CustomEvent('segmented:change', {
                detail: { value: item.textContent.trim(), index: Array.from(items).indexOf(item) },
                bubbles: true
            }));
        }

        items.forEach(function(item) {
            item.setAttribute('role', 'button');
            item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
            item.addEventListener('click', function() {
                selectItem(item);
            });
            item.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectItem(item);
                }
            });
        });

        // Init indicator sur l'item actif
        var activeItem = seg.querySelector('.segmented-item.active') || items[0];
        if (activeItem) {
            // Attendre que le layout soit pret (requestAnimationFrame)
            requestAnimationFrame(function() {
                moveIndicator(activeItem);
            });
        }
    });
}
window.__initSegmentedControls = initSegmentedControls;

// OTP Inputs
function initOTPInputs() {
    document.querySelectorAll('.otp-group').forEach(function(group) {
        if (group.dataset.bound) return;
        group.dataset.bound = '1';

        var digits = Array.from(group.querySelectorAll('.otp-digit'));
        if (!digits.length) return;

        digits.forEach(function(digit, index) {
            // Mise a jour de la classe filled sur la valeur initiale
            if (digit.value) digit.classList.add('filled');

            digit.addEventListener('input', function() {
                // Ne garder que le dernier caractere saisi (cas colle caractere par caractere)
                var val = digit.value.replace(/[^0-9]/g, '');
                digit.value = val ? val.slice(-1) : '';

                if (digit.value) {
                    digit.classList.add('filled');
                    // Focus sur la case suivante
                    var next = digits[index + 1];
                    if (next) next.focus();
                } else {
                    digit.classList.remove('filled');
                }

                group.dispatchEvent(new CustomEvent('otp:change', {
                    detail: { value: digits.map(function(d) { return d.value; }).join('') },
                    bubbles: true
                }));
            });

            digit.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace') {
                    if (digit.value) {
                        // Effacer la case courante
                        digit.value = '';
                        digit.classList.remove('filled');
                    } else {
                        // Case vide : revenir a la precedente et l'effacer
                        var prev = digits[index - 1];
                        if (prev) {
                            prev.value = '';
                            prev.classList.remove('filled');
                            prev.focus();
                        }
                    }
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft') {
                    var prev = digits[index - 1];
                    if (prev) { e.preventDefault(); prev.focus(); }
                } else if (e.key === 'ArrowRight') {
                    var next = digits[index + 1];
                    if (next) { e.preventDefault(); next.focus(); }
                }
            });

            digit.addEventListener('paste', function(e) {
                e.preventDefault();
                var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (!pasted) return;

                // Distribuer les caracteres sur toutes les cases a partir de l'index courant
                var startIndex = index;
                pasted.split('').forEach(function(char, i) {
                    var target = digits[startIndex + i];
                    if (!target) return;
                    target.value = char;
                    target.classList.add('filled');
                });

                // Focus sur la derniere case remplie ou la derniere case
                var lastFilledIndex = Math.min(startIndex + pasted.length - 1, digits.length - 1);
                var nextEmpty = digits[startIndex + pasted.length];
                if (nextEmpty) {
                    nextEmpty.focus();
                } else {
                    digits[lastFilledIndex].focus();
                }

                group.dispatchEvent(new CustomEvent('otp:change', {
                    detail: { value: digits.map(function(d) { return d.value; }).join('') },
                    bubbles: true
                }));
            });

            // Selectionner le contenu au focus pour faciliter la saisie
            digit.addEventListener('focus', function() {
                digit.select();
            });
        });
    });
}
window.__initOTPInputs = initOTPInputs;

function initTagInputs() {
    document.querySelectorAll('.tag-input-wrap').forEach(function(wrap) {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';

        var input = wrap.querySelector('.tag-input-field');
        if (!input) return;

        var maxTags = parseInt(wrap.dataset.max, 10) || Infinity;

        function getTags() {
            return Array.from(wrap.querySelectorAll('.tag-item'));
        }

        function getTagValues() {
            return getTags().map(function(t) {
                return t.querySelector('.tag-close')
                    ? t.childNodes[0].textContent.trim()
                    : t.textContent.trim();
            });
        }

        function updateInputState() {
            var count = getTags().length;
            if (count >= maxTags) {
                input.disabled = true;
                input.placeholder = 'Limite atteinte';
            } else {
                input.disabled = false;
                input.placeholder = input.getAttribute('data-placeholder') || 'Ajouter un tag...';
            }
            // Met a jour le compteur si present
            var counter = wrap.querySelector('.tag-input-limit');
            if (counter && isFinite(maxTags)) {
                counter.textContent = count + '/' + maxTags;
            }
        }

        // Sauvegarder le placeholder original
        input.setAttribute('data-placeholder', input.placeholder);

        function createTag(value) {
            var trimmed = value.trim().replace(/,+$/, '').trim();
            if (!trimmed) return false;
            // Anti-doublon
            if (getTagValues().includes(trimmed)) return false;
            // Limit
            if (getTags().length >= maxTags) return false;

            var tag = document.createElement('span');
            tag.className = 'tag-item';
            tag.innerHTML = escapeHTML(trimmed) + ' <button class="tag-close" aria-label="Supprimer ' + escapeHTML(trimmed) + '">&times;</button>';

            tag.querySelector('.tag-close').addEventListener('click', function() {
                removeTag(tag);
            });

            // Inserer avant le champ input
            wrap.insertBefore(tag, input);
            updateInputState();
            wrap.dispatchEvent(new CustomEvent('tag:add', { detail: { value: trimmed, tags: getTagValues() }, bubbles: true }));
            return true;
        }

        function removeTag(tag) {
            tag.classList.add('tag-item--removing');
            var val = tag.childNodes[0].textContent.trim();
            setTimeout(function() {
                if (tag.parentNode) tag.parentNode.removeChild(tag);
                updateInputState();
                wrap.dispatchEvent(new CustomEvent('tag:remove', { detail: { value: val, tags: getTagValues() }, bubbles: true }));
            }, 150);
        }

        input.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' || e.key === ',') && !input.disabled) {
                e.preventDefault();
                if (createTag(input.value)) {
                    input.value = '';
                }
            } else if (e.key === 'Backspace' && input.value === '') {
                var tags = getTags();
                if (tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                }
            }
        });

        // Gerer la virgule via input event (cas mobile / composition)
        input.addEventListener('input', function() {
            if (input.value.endsWith(',')) {
                var val = input.value.slice(0, -1);
                if (createTag(val)) {
                    input.value = '';
                } else {
                    input.value = val;
                }
            }
        });

        // Clic sur le wrap focus l'input
        wrap.addEventListener('click', function(e) {
            if (!e.target.classList.contains('tag-close') && !e.target.classList.contains('tag-item')) {
                input.focus();
            }
        });

        updateInputState();
    });
}
window.__initTagInputs = initTagInputs;

// Tree View
function initTreeView() {
    document.querySelectorAll('.tree[role="tree"]').forEach(function(root) {
        if (root.dataset.bound) return;
        root.dataset.bound = '1';

        // Init open/closed state from aria-expanded attributes
        root.querySelectorAll('.tree-branch').forEach(function(branch) {
            var expanded = branch.getAttribute('aria-expanded') === 'true';
            var children = branch.querySelector('.tree-children');
            if (children) {
                if (expanded) {
                    branch.classList.add('open');
                    children.classList.add('open');
                } else {
                    branch.classList.remove('open');
                    children.classList.remove('open');
                }
            }

            var toggle = branch.querySelector(':scope > .tree-toggle');
            if (!toggle || toggle.dataset.bound) return;
            toggle.dataset.bound = '1';

            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                var isOpen = branch.classList.contains('open');
                if (isOpen) {
                    branch.classList.remove('open');
                    branch.setAttribute('aria-expanded', 'false');
                    if (children) children.classList.remove('open');
                } else {
                    branch.classList.add('open');
                    branch.setAttribute('aria-expanded', 'true');
                    if (children) children.classList.add('open');
                }
                // Select the branch item itself on toggle click
                selectItem(root, branch);
            });
        });

        // Leaf click → select
        root.querySelectorAll('.tree-leaf').forEach(function(leaf) {
            if (leaf.dataset.bound) return;
            leaf.dataset.bound = '1';
            leaf.addEventListener('click', function(e) {
                e.stopPropagation();
                selectItem(root, leaf);
            });
        });
    });

    function selectItem(root, item) {
        // Remove selection from all items in this tree
        root.querySelectorAll('.tree-item.selected').forEach(function(el) {
            el.classList.remove('selected');
        });
        item.classList.add('selected');
        root.dispatchEvent(new CustomEvent('treeview:select', {
            detail: { label: (item.querySelector('.tree-label') || {}).textContent || '' },
            bubbles: true
        }));
    }
}
window.__initTreeView = initTreeView;

// Bottom Sheet
function initBottomSheet() {
    // Helpers
    function openSheet(panelId) {
        var panel = document.getElementById(panelId);
        var overlay = document.querySelector('[data-bs-overlay="' + panelId + '"]');
        if (!panel || !overlay) return;
        panel.classList.add('open');
        overlay.classList.add('open');
        panel.focus && panel.focus();
    }

    function closeSheet(panelId) {
        var panel = document.getElementById(panelId);
        var overlay = document.querySelector('[data-bs-overlay="' + panelId + '"]');
        if (!panel || !overlay) return;
        panel.classList.remove('open');
        overlay.classList.remove('open');
    }

    // Trigger buttons
    document.querySelectorAll('.bottom-sheet-trigger').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            var target = btn.dataset.target;
            if (target) openSheet(target);
        });
    });

    // Overlay click → close
    document.querySelectorAll('[data-bs-overlay]').forEach(function(overlay) {
        if (overlay.dataset.bound) return;
        overlay.dataset.bound = '1';
        var panelId = overlay.dataset.bsOverlay;
        overlay.addEventListener('click', function() { closeSheet(panelId); });
    });

    // Close buttons
    document.querySelectorAll('[data-bs-close]').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        var panelId = btn.dataset.bsClose;
        btn.addEventListener('click', function() { closeSheet(panelId); });
    });

    // Escape → close all open sheets
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.bottom-sheet.open').forEach(function(panel) {
            closeSheet(panel.id);
        });
    });

    // Touch drag on handle → swipe down to close (threshold 100px)
    document.querySelectorAll('[data-bs-handle]').forEach(function(handleWrap) {
        if (handleWrap.dataset.bound) return;
        handleWrap.dataset.bound = '1';
        var panelId = handleWrap.dataset.bsHandle;
        var panel = document.getElementById(panelId);
        if (!panel) return;

        var startY = null;
        var currentY = null;

        handleWrap.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            currentY = startY;
            panel.style.transition = 'none';
        }, { passive: true });

        handleWrap.addEventListener('touchmove', function(e) {
            if (startY === null) return;
            currentY = e.touches[0].clientY;
            var delta = currentY - startY;
            if (delta > 0) {
                panel.style.transform = 'translateY(' + delta + 'px)';
            }
        }, { passive: true });

        handleWrap.addEventListener('touchend', function() {
            if (startY === null) return;
            var delta = currentY - startY;
            panel.style.transition = '';
            panel.style.transform = '';
            if (delta > 100) {
                closeSheet(panelId);
            }
            startY = null;
            currentY = null;
        });
    });
}
window.__initBottomSheet = initBottomSheet;

// Lightbox
function initLightbox() {
    var overlay = document.getElementById('lb-overlay');

    // Cree l'overlay une seule fois dans le DOM
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lb-overlay';
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Visionneuse d\'images');
        overlay.innerHTML =
            '<div class="lightbox-img-wrap" id="lb-img-wrap"></div>' +
            '<button class="lightbox-close" id="lb-close" aria-label="Fermer">&#10005;</button>' +
            '<button class="lightbox-btn lightbox-prev" id="lb-prev" aria-label="Image precedente"><svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-chevron-left"/></svg></button>' +
            '<button class="lightbox-btn lightbox-next" id="lb-next" aria-label="Image suivante"><svg class="icon" aria-hidden="true"><use href="/shared/icons/sprite.svg#i-chevron-right"/></svg></button>' +
            '<div class="lightbox-caption" id="lb-caption"></div>' +
            '<div class="lightbox-counter" id="lb-counter"></div>';
        document.body.appendChild(overlay);
    }

    var imgWrap   = document.getElementById('lb-img-wrap');
    var btnClose  = document.getElementById('lb-close');
    var btnPrev   = document.getElementById('lb-prev');
    var btnNext   = document.getElementById('lb-next');
    var caption   = document.getElementById('lb-caption');
    var counter   = document.getElementById('lb-counter');

    var currentGroup  = [];
    var currentIndex  = 0;

    function openLightbox(triggers, idx) {
        currentGroup = Array.from(triggers);
        currentIndex = idx;
        overlay.classList.add('lb-open');
        document.body.style.overflow = 'hidden';
        showImage(currentIndex);
        btnClose.focus();
    }

    function closeLightbox() {
        overlay.classList.remove('lb-open');
        document.body.style.overflow = '';
        // Nettoyer l'image pour la prochaine ouverture
        setTimeout(function() {
            imgWrap.innerHTML = '';
        }, 250);
    }

    function showImage(idx) {
        var trigger = currentGroup[idx];
        var cap = trigger.dataset.caption || '';
        var fullSrc = trigger.dataset.full || '';
        var total = currentGroup.length;

        // Vider le wrap
        imgWrap.innerHTML = '';

        // Determiner le gradient de fond (pour les placeholders)
        var thumbEl = trigger.querySelector('[style]');
        var bg = thumbEl ? thumbEl.style.background : 'linear-gradient(135deg,#3b82f6,#8b5cf6)';
        var label = trigger.getAttribute('aria-label') || '';
        var thumbText = trigger.querySelector('.lightbox-thumb-placeholder') ?
            trigger.querySelector('.lightbox-thumb-placeholder').textContent : '';

        var el;
        if (fullSrc && fullSrc !== '#') {
            // Image reelle
            el = document.createElement('img');
            el.className = 'lightbox-img';
            el.alt = cap;
            imgWrap.appendChild(el);
            el.onload = function() { el.classList.add('lb-img-visible'); };
            el.onerror = function() { el.classList.add('lb-img-visible'); };
            el.src = fullSrc;
        } else {
            // Placeholder gradient (demo sans vraies images)
            el = document.createElement('div');
            el.className = 'lightbox-img-placeholder';
            el.style.background = bg;
            el.style.borderRadius = '12px';
            el.innerHTML = '<div style="font-size:1.4rem;font-weight:600;text-align:center;line-height:1.5;">' + thumbText + '</div>' +
                '<div style="font-size:0.8rem;opacity:0.6;font-family:var(--font-mono,monospace);">Placeholder — pas de fichier image</div>';
            imgWrap.appendChild(el);
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { el.classList.add('lb-img-visible'); });
            });
        }

        caption.textContent = cap;
        caption.style.display = cap ? '' : 'none';

        // Compteur
        if (total > 1) {
            counter.textContent = (idx + 1) + ' / ' + total;
            counter.style.display = '';
        } else {
            counter.style.display = 'none';
        }

        // Boutons prev/next
        if (total <= 1) {
            btnPrev.classList.add('lb-hidden');
            btnNext.classList.add('lb-hidden');
        } else {
            btnPrev.classList.toggle('lb-hidden', idx === 0);
            btnNext.classList.toggle('lb-hidden', idx === total - 1);
        }
    }

    function navigate(dir) {
        var newIdx = currentIndex + dir;
        if (newIdx < 0 || newIdx >= currentGroup.length) return;
        currentIndex = newIdx;
        showImage(currentIndex);
    }

    // Clic overlay → fermer (pas sur l'image)
    if (!overlay.dataset.bound) {
        overlay.dataset.bound = '1';

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeLightbox();
        });

        btnClose.addEventListener('click', closeLightbox);

        btnPrev.addEventListener('click', function(e) {
            e.stopPropagation();
            navigate(-1);
        });

        btnNext.addEventListener('click', function(e) {
            e.stopPropagation();
            navigate(1);
        });

        // Keyboard global (Escape, ArrowLeft, ArrowRight)
        document.addEventListener('keydown', function(e) {
            if (!overlay.classList.contains('lb-open')) return;
            if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
        });
    }

    // Binder les triggers
    document.querySelectorAll('[data-lightbox-group]').forEach(function(gallery) {
        if (gallery.dataset.lbBound) return;
        gallery.dataset.lbBound = '1';

        var groupName = gallery.dataset.lightboxGroup;
        var triggers = gallery.querySelectorAll('.lightbox-trigger');

        triggers.forEach(function(trigger, idx) {
            trigger.addEventListener('click', function() {
                openLightbox(triggers, idx);
            });
            // Accessibilite clavier
            trigger.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(triggers, idx);
                }
            });
        });
    });
}
window.__initLightbox = initLightbox;

// Context Menu
function initContextMenu() {
    var activeMenu = null;

    function hideMenu(menu) {
        if (!menu) return;
        menu.classList.remove('show');
        activeMenu = null;
    }

    function showMenu(menu, x, y) {
        // Hide any previously open menu
        if (activeMenu && activeMenu !== menu) hideMenu(activeMenu);

        menu.classList.add('show');
        activeMenu = menu;

        // Position — check viewport bounds
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        // Temporarily show off-screen to get dimensions
        menu.style.left = '0px';
        menu.style.top = '0px';
        var mw = menu.offsetWidth;
        var mh = menu.offsetHeight;

        var left = x;
        var top = y;

        if (left + mw > vw - 8) left = vw - mw - 8;
        if (top + mh > vh - 8) top = vh - mh - 8;
        if (left < 8) left = 8;
        if (top < 8) top = 8;

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
    }

    // Bind each context target
    document.querySelectorAll('.context-target').forEach(function(target) {
        if (target.dataset.ctxBound) return;
        target.dataset.ctxBound = '1';

        var menuId = target.id.replace('context-', 'context-') + '-menu';
        // Try sibling or linked menu
        var menu = target.nextElementSibling;
        while (menu && !menu.classList.contains('context-menu')) {
            menu = menu.nextElementSibling;
        }
        if (!menu) {
            // fallback: look for data-menu attribute
            var mid = target.dataset.menu;
            if (mid) menu = document.getElementById(mid);
        }
        if (!menu) return;

        target.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showMenu(menu, e.clientX, e.clientY);
        });
    });

    // Close on outside click
    if (!document.body.dataset.ctxOutsideBound) {
        document.body.dataset.ctxOutsideBound = '1';
        document.addEventListener('click', function(e) {
            if (activeMenu && !activeMenu.contains(e.target)) {
                hideMenu(activeMenu);
            }
        });
        // Close on Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeMenu) {
                hideMenu(activeMenu);
            }
        });
        // Close on contextmenu outside a target
        document.addEventListener('contextmenu', function(e) {
            if (activeMenu && !e.target.closest('.context-target')) {
                hideMenu(activeMenu);
            }
        });
    }
}
window.__initContextMenu = initContextMenu;

// Pie / Donut Charts
function initPieCharts() {
    const root = document.documentElement;

    function resolveColor(colorKey, index) {
        const map = { success: '--success', warning: '--warning', danger: '--danger', info: '--info' };
        if (colorKey && map[colorKey]) {
            return getComputedStyle(root).getPropertyValue(map[colorKey]).trim();
        }
        return getComputedStyle(root).getPropertyValue('--chart-' + ((index % 5) + 1)).trim();
    }

    function describeArcPath(cx, cy, r, startAngle, endAngle) {
        // Returns an SVG arc path string for a filled pie segment
        const toRad = a => (a - 90) * Math.PI / 180;
        const x1 = cx + r * Math.cos(toRad(startAngle));
        const y1 = cy + r * Math.sin(toRad(startAngle));
        const x2 = cx + r * Math.cos(toRad(endAngle));
        const y2 = cy + r * Math.sin(toRad(endAngle));
        const large = (endAngle - startAngle) > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    }

    function buildPieChart(chart, values, labels, colors, isMini) {
        const svg = chart.querySelector('svg');
        const legendEl = chart.querySelector('.pie-legend');
        const total = values.reduce((s, v) => s + v, 0);
        const cx = isMini ? 40 : 100;
        const cy = isMini ? 40 : 100;
        const r = isMini ? 36 : 88;

        let currentAngle = 0;
        const segments = [];

        values.forEach((val, i) => {
            const angle = (val / total) * 360;
            const endAngle = currentAngle + angle;
            const color = resolveColor(colors[i], i);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', describeArcPath(cx, cy, r, currentAngle, endAngle));
            path.setAttribute('fill', color);
            path.classList.add('pie-segment');
            path.setAttribute('aria-label', `${labels[i]}: ${val}`);
            path.style.opacity = '0';
            svg.appendChild(path);
            segments.push({ el: path, label: labels[i], color });
            currentAngle = endAngle;
        });

        // Legend
        if (legendEl) {
            legendEl.innerHTML = segments.map((s, i) =>
                `<span class="pie-legend-item" data-idx="${i}">` +
                `<span class="pie-legend-dot" style="background:${s.color};"></span>${s.label}</span>`
            ).join('');

            legendEl.querySelectorAll('.pie-legend-item').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    const idx = +item.dataset.idx;
                    segments.forEach((s, i) => {
                        s.el.style.opacity = i === idx ? '1' : '0.3';
                    });
                    legendEl.querySelectorAll('.pie-legend-item').forEach((li, i) => {
                        li.classList.toggle('dimmed', i !== idx);
                    });
                });
                item.addEventListener('mouseleave', () => {
                    segments.forEach(s => { s.el.style.opacity = '1'; });
                    legendEl.querySelectorAll('.pie-legend-item').forEach(li => li.classList.remove('dimmed'));
                });
            });
        }

        return segments;
    }

    function buildDonutChart(chart, values, labels, colors, isMini) {
        const svg = chart.querySelector('svg');
        const legendEl = chart.querySelector('.pie-legend');
        const total = values.reduce((s, v) => s + v, 0);
        const cx = isMini ? 40 : 100;
        const cy = isMini ? 40 : 100;
        const r = isMini ? 28 : 72;
        const strokeW = isMini ? 14 : 28;
        const circumference = 2 * Math.PI * r;

        let offsetAngle = 0; // in degrees, top = -90
        const segments = [];

        values.forEach((val, i) => {
            const fraction = val / total;
            const dashLen = fraction * circumference;
            const color = resolveColor(colors[i], i);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', color);
            circle.setAttribute('stroke-width', strokeW);
            // rotate via stroke-dashoffset : offset = circumference - (offsetAngle/360)*circumference
            const dashOffset = circumference - (offsetAngle / 360) * circumference;
            circle.setAttribute('stroke-dasharray', `${dashLen} ${circumference}`);
            circle.setAttribute('stroke-dashoffset', dashOffset);
            circle.classList.add('pie-donut-segment');
            circle.setAttribute('aria-label', `${labels[i]}: ${val}`);
            circle.style.opacity = '0';
            // rotate from top : transform-origin at center
            circle.style.transformOrigin = `${cx}px ${cy}px`;
            svg.appendChild(circle);

            segments.push({ el: circle, label: labels[i], color, dashLen, circumference, dashOffset });
            offsetAngle += fraction * 360;
        });

        // Legend
        if (legendEl) {
            legendEl.innerHTML = segments.map((s, i) =>
                `<span class="pie-legend-item" data-idx="${i}">` +
                `<span class="pie-legend-dot" style="background:${s.color};"></span>${s.label}</span>`
            ).join('');

            legendEl.querySelectorAll('.pie-legend-item').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    const idx = +item.dataset.idx;
                    segments.forEach((s, i) => {
                        s.el.style.opacity = i === idx ? '1' : '0.3';
                    });
                    legendEl.querySelectorAll('.pie-legend-item').forEach((li, i) => {
                        li.classList.toggle('dimmed', i !== idx);
                    });
                });
                item.addEventListener('mouseleave', () => {
                    segments.forEach(s => { s.el.style.opacity = '1'; });
                    legendEl.querySelectorAll('.pie-legend-item').forEach(li => li.classList.remove('dimmed'));
                });
            });
        }

        return segments;
    }

    function animateSegments(segments) {
        segments.forEach((s, i) => {
            setTimeout(() => {
                s.el.style.transition = 'opacity 0.4s ease';
                s.el.style.opacity = '1';
            }, i * 80);
        });
    }

    document.querySelectorAll('.pie-chart').forEach(chart => {
        if (chart.dataset.bound) return;
        chart.dataset.bound = '1';

        const rawValues = (chart.dataset.values || '').split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0);
        if (!rawValues.length) return;
        const rawLabels = (chart.dataset.labels || '').split(',').map(l => l.trim());
        const rawColors = (chart.dataset.colors || '').split(',').map(c => c.trim());
        const labels = rawValues.map((_, i) => rawLabels[i] || `Segment ${i + 1}`);
        const colors = rawValues.map((_, i) => rawColors[i] || '');

        const isDonut = chart.classList.contains('pie-chart--donut') || chart.classList.contains('pie-chart--mini');
        const isMini = chart.classList.contains('pie-chart--mini');
        const isDonutType = isDonut;

        let segments;
        if (isDonutType) {
            segments = buildDonutChart(chart, rawValues, labels, colors, isMini);
        } else {
            segments = buildPieChart(chart, rawValues, labels, colors, isMini);
        }

        // Animate on IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateSegments(segments);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        observer.observe(chart);
    });
}
window.__initPieCharts = initPieCharts;

// ===== GAUGE / SPEEDOMETER =====
function initGauges() {
    // Semi-circle arc: M 10 55 A 40 40 0 0 1 90 55
    // Arc length = PI * r = PI * 40 ≈ 125.66
    const ARC_LENGTH = Math.PI * 40;

    function getThresholdColor(pct, thresholds) {
        if (!thresholds) return null;
        const [low, high] = thresholds.split(',').map(Number);
        if (pct <= low) return 'var(--danger)';
        if (pct <= high) return 'var(--warning)';
        return 'var(--success)';
    }

    function animateGauge(gauge) {
        const value = parseFloat(gauge.dataset.value) || 0;
        const max = parseFloat(gauge.dataset.max) || 100;
        const thresholds = gauge.dataset.thresholds || null;
        const pct = Math.min(Math.max(value / max, 0), 1) * 100;

        const fill = gauge.querySelector('.gauge-fill');
        if (!fill) return;

        // Threshold color
        const color = getThresholdColor(pct, thresholds);
        if (color) fill.style.stroke = color;

        // Draw: dasharray = total arc, dashoffset = remaining portion
        const offset = ARC_LENGTH * (1 - pct / 100);
        fill.style.strokeDasharray = ARC_LENGTH;
        fill.style.strokeDashoffset = ARC_LENGTH; // start hidden
        // Force reflow then animate
        fill.getBoundingClientRect();
        fill.style.strokeDashoffset = offset;
    }

    document.querySelectorAll('.gauge').forEach(gauge => {
        if (gauge.dataset.bound) return;
        gauge.dataset.bound = '1';

        // Set initial hidden state
        const fill = gauge.querySelector('.gauge-fill');
        if (fill) {
            fill.style.strokeDasharray = ARC_LENGTH;
            fill.style.strokeDashoffset = ARC_LENGTH;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateGauge(gauge);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        observer.observe(gauge);
    });
}
window.__initGauges = initGauges;

function initAnimatedCounters() {
    if (document.dataset && document.dataset.animatedCountersBound) return;
    const counters = document.querySelectorAll('.counter[data-target]');
    if (!counters.length) return;

    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const DURATION = 1500;

    counters.forEach(counter => {
        if (counter.dataset.bound) return;
        counter.dataset.bound = 'true';

        const target = parseFloat(counter.dataset.target);
        const decimals = parseInt(counter.dataset.decimals || '0', 10);
        const valueEl = counter.querySelector('.counter-value');
        if (!valueEl) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (counter.dataset.counted === 'true') return;
                counter.dataset.counted = 'true';
                observer.disconnect();

                const start = performance.now();
                function tick(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / DURATION, 1);
                    const eased = easeOutQuart(progress);
                    const current = eased * target;
                    valueEl.textContent = decimals > 0
                        ? current.toFixed(decimals)
                        : Math.floor(current).toString();
                    if (progress < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            });
        }, { threshold: 0.3 });

        observer.observe(counter);
    });
}
window.__initAnimatedCounters = initAnimatedCounters;

// ===== PROGRESS TRACKER =====
function initProgressTrackers() {
    // --- Single ring trackers (.progress-tracker) ---
    document.querySelectorAll('.progress-tracker[data-progress]').forEach(tracker => {
        if (tracker.dataset.bound) return;
        tracker.dataset.bound = '1';

        const pct = Math.min(Math.max(parseFloat(tracker.dataset.progress) || 0, 0), 100);
        const steps = parseInt(tracker.dataset.steps || '0', 10);
        const current = parseInt(tracker.dataset.current || '0', 10);

        const svg = tracker.querySelector('svg');
        const fill = tracker.querySelector('.pt-fill');
        if (!svg || !fill) return;

        // Ring geometry — r=62, cx=cy=80, viewBox 0 0 160 160
        const R = 62;
        const CX = 80;
        const CY = 80;
        const circumference = 2 * Math.PI * R;

        // Rotate start to top (-90deg)
        fill.style.transformOrigin = `${CX}px ${CY}px`;
        fill.style.transform = 'rotate(-90deg)';
        fill.setAttribute('stroke-dasharray', circumference);
        fill.setAttribute('stroke-dashoffset', circumference); // hidden initially

        // Step dots
        if (steps > 0) {
            for (let i = 0; i < steps; i++) {
                const angle = (2 * Math.PI * i) / steps - Math.PI / 2;
                const dx = CX + R * Math.cos(angle);
                const dy = CY + R * Math.sin(angle);
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', dx);
                dot.setAttribute('cy', dy);
                dot.setAttribute('r', '5');
                let state = 'pt-step--pending';
                if (i < current - 1) state = 'pt-step--done';
                else if (i === current - 1) state = 'pt-step--active';
                dot.setAttribute('class', `pt-step ${state}`);
                svg.appendChild(dot);
            }
        }

        // Animate on intersection
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                // Force reflow
                fill.getBoundingClientRect();
                const offset = circumference * (1 - pct / 100);
                fill.style.strokeDashoffset = offset;
            });
        }, { threshold: 0.3 });

        observer.observe(tracker);
    });

    // --- Multi-ring trackers (.progress-tracker-multi) ---
    document.querySelectorAll('.progress-tracker-multi[data-rings]').forEach(tracker => {
        if (tracker.dataset.bound) return;
        tracker.dataset.bound = '1';

        let rings;
        try { rings = JSON.parse(tracker.dataset.rings); } catch(e) { return; }
        if (!Array.isArray(rings) || rings.length === 0) return;

        const svg = tracker.querySelector('svg');
        if (!svg) return;

        // Geometry: 3 concentric rings in viewBox 0 0 200 200
        // Radii: 84, 68, 52 (gap of 16 = 7px stroke + 9px spacing)
        const CX = 100, CY = 100;
        const RADII = [84, 68, 52];
        const SW = 7;

        rings.forEach((ring, idx) => {
            const r = RADII[idx] || (84 - idx * 16);
            const pct = Math.min(Math.max(parseFloat(ring.pct) || 0, 0), 100);
            const color = ring.color || 'var(--accent)';
            const circumference = 2 * Math.PI * r;

            // Track
            const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            track.setAttribute('cx', CX);
            track.setAttribute('cy', CY);
            track.setAttribute('r', r);
            track.setAttribute('class', 'pt-track');
            track.setAttribute('stroke-width', SW);
            svg.appendChild(track);

            // Fill
            const fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            fill.setAttribute('cx', CX);
            fill.setAttribute('cy', CY);
            fill.setAttribute('r', r);
            fill.setAttribute('class', 'pt-fill');
            fill.setAttribute('stroke-width', SW);
            fill.style.stroke = color;
            fill.style.transformOrigin = `${CX}px ${CY}px`;
            fill.style.transform = 'rotate(-90deg)';
            fill.setAttribute('stroke-dasharray', circumference);
            fill.setAttribute('stroke-dashoffset', circumference);
            svg.appendChild(fill);

            // Stagger animation per ring
            const delay = idx * 150;
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target);
                    setTimeout(() => {
                        fill.getBoundingClientRect();
                        const offset = circumference * (1 - pct / 100);
                        fill.style.strokeDashoffset = offset;
                    }, delay);
                });
            }, { threshold: 0.3 });

            observer.observe(tracker);
        });
    });
}
window.__initProgressTrackers = initProgressTrackers;

// Sortable List
function initSortableLists() {
    document.querySelectorAll('.sortable-list').forEach(function(list) {
        if (list.dataset.bound) return;
        list.dataset.bound = '1';

        var dragSrc = null;

        function getItems() {
            return Array.from(list.querySelectorAll('.sortable-item'));
        }

        function updateNumbers() {
            if (!list.classList.contains('sortable-list--numbered')) return;
            getItems().forEach(function(item, idx) {
                var num = item.querySelector('.sortable-num');
                if (num) num.textContent = idx + 1;
            });
        }

        // HTML5 Drag & Drop
        getItems().forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                dragSrc = item;
                item.classList.add('dragging');
                item.setAttribute('aria-grabbed', 'true');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', function() {
                item.classList.remove('dragging');
                item.setAttribute('aria-grabbed', 'false');
                list.querySelectorAll('.drag-over').forEach(function(el) {
                    el.classList.remove('drag-over');
                });
                dragSrc = null;
                updateNumbers();
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (item === dragSrc) return;
                list.querySelectorAll('.drag-over').forEach(function(el) {
                    el.classList.remove('drag-over');
                });
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', function() {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                if (!dragSrc || item === dragSrc) return;
                item.classList.remove('drag-over');
                var items = getItems();
                var srcIdx = items.indexOf(dragSrc);
                var tgtIdx = items.indexOf(item);
                if (srcIdx < tgtIdx) {
                    list.insertBefore(dragSrc, item.nextSibling);
                } else {
                    list.insertBefore(dragSrc, item);
                }
                updateNumbers();
            });
        });

        // Touch support via pointer events
        var pointerDragSrc = null;
        var pointerClone = null;
        var pointerOffsetX = 0;
        var pointerOffsetY = 0;

        getItems().forEach(function(item) {
            var handle = item.querySelector('.sortable-handle');
            var target = handle || item;

            target.addEventListener('pointerdown', function(e) {
                if (e.pointerType === 'mouse') return; // handled by HTML5 DnD
                e.preventDefault();
                pointerDragSrc = item;
                item.classList.add('dragging');
                item.setAttribute('aria-grabbed', 'true');

                var rect = item.getBoundingClientRect();
                pointerOffsetX = e.clientX - rect.left;
                pointerOffsetY = e.clientY - rect.top;

                pointerClone = item.cloneNode(true);
                pointerClone.style.cssText = [
                    'position:fixed',
                    'pointer-events:none',
                    'z-index:9999',
                    'width:' + rect.width + 'px',
                    'opacity:0.85',
                    'left:' + (e.clientX - pointerOffsetX) + 'px',
                    'top:' + (e.clientY - pointerOffsetY) + 'px',
                    'transition:none'
                ].join(';');
                document.body.appendChild(pointerClone);
            });
        });

        document.addEventListener('pointermove', function(e) {
            if (!pointerDragSrc || !pointerClone) return;
            pointerClone.style.left = (e.clientX - pointerOffsetX) + 'px';
            pointerClone.style.top = (e.clientY - pointerOffsetY) + 'px';

            list.querySelectorAll('.drag-over').forEach(function(el) {
                el.classList.remove('drag-over');
            });
            var items = getItems();
            var target = null;
            items.forEach(function(it) {
                if (it === pointerDragSrc) return;
                var rect = it.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    target = it;
                }
            });
            if (target) target.classList.add('drag-over');
        }, { passive: true });

        document.addEventListener('pointerup', function(e) {
            if (!pointerDragSrc) return;
            if (pointerClone) {
                document.body.removeChild(pointerClone);
                pointerClone = null;
            }

            list.querySelectorAll('.drag-over').forEach(function(el) {
                el.classList.remove('drag-over');
            });

            var items = getItems();
            var target = null;
            items.forEach(function(it) {
                if (it === pointerDragSrc) return;
                var rect = it.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    target = it;
                }
            });

            if (target) {
                var srcIdx = items.indexOf(pointerDragSrc);
                var tgtIdx = items.indexOf(target);
                if (srcIdx < tgtIdx) {
                    list.insertBefore(pointerDragSrc, target.nextSibling);
                } else {
                    list.insertBefore(pointerDragSrc, target);
                }
            }

            pointerDragSrc.classList.remove('dragging');
            pointerDragSrc.setAttribute('aria-grabbed', 'false');
            pointerDragSrc = null;
            updateNumbers();
        });
    });
}
window.__initSortableLists = initSortableLists;

// ===== VIDEO EMBEDS =====
function initVideoEmbeds() {
    document.querySelectorAll('.video-embed').forEach(embed => {
        if (embed.dataset.bound) return;
        embed.dataset.bound = '1';

        const overlay = embed.querySelector('.video-embed-overlay');
        if (!overlay) return;

        const activate = () => {
            const src = embed.dataset.src;
            if (!src) return;
            embed.classList.add('loaded');
            const iframe = document.createElement('iframe');
            iframe.src = src + '?autoplay=1';
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('allow', 'autoplay; encrypted-media');
            iframe.setAttribute('title', embed.getAttribute('aria-label') || 'Video');
            embed.appendChild(iframe);
        };

        overlay.addEventListener('click', activate);
        overlay.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
            }
        });
    });
}
window.__initVideoEmbeds = initVideoEmbeds;

function initBeforeAfter() {
    document.querySelectorAll('.before-after').forEach(container => {
        if (container.dataset.bound) return;
        container.dataset.bound = '1';

        const before = container.querySelector('.before-after-before');
        const handle = container.querySelector('.before-after-handle');
        if (!before || !handle) return;

        let dragging = false;

        function applyPercent(percent) {
            const clamped = Math.min(95, Math.max(5, percent));
            before.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
            handle.style.left = clamped + '%';
        }

        function getPercent(clientX) {
            const rect = container.getBoundingClientRect();
            return ((clientX - rect.left) / rect.width) * 100;
        }

        // Mouse events
        container.addEventListener('mousedown', e => {
            dragging = true;
            applyPercent(getPercent(e.clientX));
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            applyPercent(getPercent(e.clientX));
        });
        document.addEventListener('mouseup', () => { dragging = false; });

        // Touch events
        container.addEventListener('touchstart', e => {
            dragging = true;
            applyPercent(getPercent(e.touches[0].clientX));
        }, { passive: true });
        document.addEventListener('touchmove', e => {
            if (!dragging) return;
            applyPercent(getPercent(e.touches[0].clientX));
        }, { passive: true });
        document.addEventListener('touchend', () => { dragging = false; });
    });
}
window.__initBeforeAfter = initBeforeAfter;

// ===== QUIZ / POLL =====
function initQuiz() {
    document.querySelectorAll('.quiz').forEach(quiz => {
        if (quiz.dataset.bound) return;
        quiz.dataset.bound = '1';

        const mode = quiz.dataset.mode || 'quiz';
        const questions = Array.from(quiz.querySelectorAll('.quiz-question'));
        const progressBar = quiz.querySelector('.quiz-progress-bar');
        const progressWrap = quiz.querySelector('.quiz-progress');
        const resultEl = quiz.querySelector('.quiz-result');
        const scoreEl = quiz.querySelector('.quiz-score');
        const restartBtn = quiz.querySelector('.quiz-restart');

        let currentIndex = 0;
        let score = 0;

        function updateProgress(index) {
            if (!progressBar || !progressWrap) return;
            const pct = Math.round(((index + 1) / questions.length) * 100);
            progressBar.style.width = pct + '%';
            progressWrap.setAttribute('aria-valuenow', pct);
        }

        function showQuestion(index) {
            questions.forEach((q, i) => {
                q.classList.toggle('active', i === index);
            });
            if (progressBar) updateProgress(index);
        }

        function disableOptions(questionEl) {
            questionEl.querySelectorAll('input[type="radio"]').forEach(r => {
                r.disabled = true;
            });
        }

        function handleQuizAnswer(questionEl, selectedValue) {
            const correct = parseInt(questionEl.dataset.correct, 10);
            const isCorrect = parseInt(selectedValue, 10) === correct;
            const feedbackEl = questionEl.querySelector('.quiz-feedback');
            const options = questionEl.querySelectorAll('.quiz-option');

            disableOptions(questionEl);

            options.forEach(opt => {
                const radio = opt.querySelector('input[type="radio"]');
                const val = parseInt(radio.value, 10);
                if (val === correct) opt.classList.add('correct');
                if (radio.checked && !isCorrect) opt.classList.add('wrong');
                if (radio.checked) opt.classList.add('selected');
            });

            if (feedbackEl) {
                feedbackEl.textContent = isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.';
                feedbackEl.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'wrong');
            }

            if (isCorrect) score++;

            setTimeout(() => {
                currentIndex++;
                if (currentIndex < questions.length) {
                    showQuestion(currentIndex);
                } else {
                    showResult();
                }
            }, 1000);
        }

        function showResult() {
            questions.forEach(q => q.classList.remove('active'));
            if (resultEl) {
                resultEl.classList.add('show');
            }
            if (scoreEl) {
                const pct = Math.round((score / questions.length) * 100);
                scoreEl.textContent = score + '/' + questions.length + ' — ' + pct + '%';
            }
        }

        function resetQuiz() {
            score = 0;
            currentIndex = 0;

            questions.forEach(q => {
                q.classList.remove('active');
                q.querySelectorAll('input[type="radio"]').forEach(r => {
                    r.checked = false;
                    r.disabled = false;
                });
                q.querySelectorAll('.quiz-option').forEach(o => {
                    o.classList.remove('correct', 'wrong', 'selected');
                });
                const fb = q.querySelector('.quiz-feedback');
                if (fb) {
                    fb.textContent = '';
                    fb.className = 'quiz-feedback';
                }
            });

            if (resultEl) resultEl.classList.remove('show');
            showQuestion(0);
        }

        // Poll mode: fake results on selection
        function handlePollAnswer(questionEl, selectedValue) {
            const options = questionEl.querySelectorAll('.quiz-option');
            const labels = Array.from(options).map(o => o.querySelector('span').textContent);
            const total = options.length;

            disableOptions(questionEl);
            options.forEach(opt => {
                const radio = opt.querySelector('input[type="radio"]');
                if (radio.checked) opt.classList.add('selected');
            });

            // Generate fake random percentages that sum to 100
            const rawVotes = labels.map((_, i) => {
                if (parseInt(selectedValue, 10) === i) return 30 + Math.floor(Math.random() * 30);
                return 5 + Math.floor(Math.random() * 20);
            });
            const total_votes = rawVotes.reduce((a, b) => a + b, 0);
            const pcts = rawVotes.map(v => Math.round((v / total_votes) * 100));

            const pollResults = questionEl.querySelector('.quiz-poll-results');
            if (!pollResults) return;

            pollResults.innerHTML = '';
            labels.forEach((label, i) => {
                const bar = document.createElement('div');
                bar.className = 'quiz-poll-bar';
                bar.innerHTML =
                    '<div class="quiz-poll-fill" style="width:0%"></div>' +
                    '<span class="quiz-poll-label">' + label + '</span>' +
                    '<span class="quiz-poll-pct">' + pcts[i] + '%</span>';
                pollResults.appendChild(bar);
            });

            pollResults.classList.add('show');

            // Animate fills after paint
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    pollResults.querySelectorAll('.quiz-poll-fill').forEach((fill, i) => {
                        fill.style.width = pcts[i] + '%';
                    });
                });
            });
        }

        // Bind radio change events
        questions.forEach(questionEl => {
            questionEl.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.disabled) return;
                    if (mode === 'quiz') {
                        handleQuizAnswer(questionEl, radio.value);
                    } else if (mode === 'poll') {
                        handlePollAnswer(questionEl, radio.value);
                    }
                });
            });
        });

        // Restart button
        if (restartBtn) {
            restartBtn.addEventListener('click', resetQuiz);
        }

        // Init: show first question
        showQuestion(0);
    });
}
window.__initQuiz = initQuiz;

// ===== DECISION TREE =====
function initDecisionTree() {
    document.querySelectorAll('.dtree').forEach(function(dtree) {
        if (dtree.dataset.bound) return;
        dtree.dataset.bound = '1';

        var resetBtn = dtree.querySelector('.dtree-reset');

        dtree.addEventListener('click', function(e) {
            var choice = e.target.closest('.dtree-choice');
            if (!choice) return;

            // Ignore si deja selectionne
            if (choice.classList.contains('selected')) return;

            var currentNode = choice.closest('.dtree-node');
            if (!currentNode) return;

            // Marquer le choix selectionne, desactiver les autres
            var siblings = currentNode.querySelectorAll('.dtree-choice');
            siblings.forEach(function(btn) {
                btn.disabled = true;
                btn.classList.remove('selected');
            });
            choice.classList.add('selected');

            // Afficher le connecteur associe a ce noeud
            var connector = dtree.querySelector('.dtree-connector[data-from="' + currentNode.id + '"]');
            if (connector) connector.classList.add('visible');

            // Afficher le noeud suivant
            var nextId = choice.getAttribute('data-next');
            if (!nextId) return;
            var nextNode = dtree.querySelector('#' + nextId);
            if (!nextNode) return;
            nextNode.classList.add('active');

            // Si le noeud suivant est un resultat, afficher le bouton reset
            if (nextNode.classList.contains('dtree-node--result') && resetBtn) {
                resetBtn.style.display = '';
            }
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                // Masquer tous les noeuds sauf le premier
                dtree.querySelectorAll('.dtree-node').forEach(function(node, idx) {
                    if (idx === 0) {
                        node.classList.add('active');
                    } else {
                        node.classList.remove('active');
                    }
                    // Ré-activer les boutons et enlever la selection
                    node.querySelectorAll('.dtree-choice').forEach(function(btn) {
                        btn.disabled = false;
                        btn.classList.remove('selected');
                    });
                });
                // Masquer tous les connecteurs
                dtree.querySelectorAll('.dtree-connector').forEach(function(c) {
                    c.classList.remove('visible');
                });
                // Masquer le reset
                resetBtn.style.display = 'none';
            });
        }
    });
}
window.__initDecisionTree = initDecisionTree;

// ===== COMMAND PALETTE =====
function initCommandPalette() {
    // Singleton : injecté une seule fois dans body
    if (document.getElementById('cmd-overlay')) return;

    // Construire l'index flat depuis NAV_SECTIONS
    var index = [];
    if (typeof NAV_SECTIONS !== 'undefined') {
        NAV_SECTIONS.forEach(function(section) {
            section.links.forEach(function(link) {
                index.push({ label: link.label, icon: link.icon, href: link.href, category: section.title || 'Hub' });
            });
        });
    }

    // Actions spéciales
    var ACTIONS = [
        { label: 'Tout charger (Ctrl+F)', icon: '&#128269;', action: 'load-all', category: 'Actions' },
        { label: 'Toggle sidebar', icon: '&#9776;', action: 'toggle-sidebar', category: 'Actions' },
        { label: 'Toggle dark/light', icon: '&#9790;', action: 'toggle-mode', category: 'Actions' }
    ];

    // Injecter l'overlay dans le body
    var overlay = document.createElement('div');
    overlay.id = 'cmd-overlay';
    overlay.className = 'cmd-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Palette de commandes');
    overlay.innerHTML =
        '<div class="cmd-palette" role="combobox" aria-expanded="false" aria-haspopup="listbox">'
        + '<div class="cmd-input-wrap">'
        +   '<span class="cmd-input-icon" aria-hidden="true">&#128269;</span>'
        +   '<input class="cmd-input" type="text" placeholder="Rechercher une page, commande..." autocomplete="off" aria-label="Recherche" aria-controls="cmd-listbox" aria-autocomplete="list">'
        +   '<div class="cmd-kbd"><kbd>Esc</kbd></div>'
        + '</div>'
        + '<div class="cmd-results" id="cmd-listbox" role="listbox" aria-label="Résultats"></div>'
        + '<div class="cmd-footer" aria-hidden="true">'
        +   '<span>&#8593;&#8595; Naviguer</span>'
        +   '<span>&#8629; Ouvrir</span>'
        +   '<span>Esc Fermer</span>'
        + '</div>'
        + '</div>';
    document.body.appendChild(overlay);

    var input = overlay.querySelector('.cmd-input');
    var results = overlay.querySelector('.cmd-results');
    var activeIdx = -1;

    function getItems() {
        return results.querySelectorAll('.cmd-item[data-idx]');
    }

    function setActive(idx) {
        var items = getItems();
        items.forEach(function(it) { it.classList.remove('active'); it.setAttribute('aria-selected', 'false'); });
        if (idx >= 0 && idx < items.length) {
            items[idx].classList.add('active');
            items[idx].setAttribute('aria-selected', 'true');
            items[idx].scrollIntoView({ block: 'nearest' });
            input.setAttribute('aria-activedescendant', items[idx].id);
        } else {
            input.removeAttribute('aria-activedescendant');
        }
        activeIdx = idx;
    }

    function renderResults(q) {
        var query = (q || '').toLowerCase().trim();
        results.innerHTML = '';
        activeIdx = -1;
        input.removeAttribute('aria-activedescendant');

        // Construire liste filtrée
        var matched = [];
        var allItems = index.concat(ACTIONS);

        if (query === '') {
            // Index A-Z
            matched = index.slice().sort(function(a, b) { return a.label.localeCompare(b.label, 'fr'); });
            // Ajouter actions en fin
            matched = matched.concat(ACTIONS);
        } else {
            allItems.forEach(function(item) {
                if (item.label.toLowerCase().includes(query) || (item.category && item.category.toLowerCase().includes(query))) {
                    matched.push(item);
                }
            });
        }

        if (!matched.length) {
            results.innerHTML = '<div class="cmd-empty">Aucun résultat pour <strong>' + escapeHTML(q) + '</strong></div>';
            return;
        }

        // Grouper par catégorie
        var groups = {};
        var groupOrder = [];
        matched.forEach(function(item) {
            var cat = item.category || 'Autre';
            if (!groups[cat]) { groups[cat] = []; groupOrder.push(cat); }
            groups[cat].push(item);
        });

        var globalIdx = 0;
        groupOrder.forEach(function(cat) {
            var titleEl = document.createElement('div');
            titleEl.className = 'cmd-group-title';
            titleEl.textContent = cat;
            results.appendChild(titleEl);

            groups[cat].forEach(function(item) {
                var el = document.createElement('div');
                el.className = 'cmd-item';
                el.setAttribute('role', 'option');
                el.setAttribute('aria-selected', 'false');
                el.id = 'cmd-item-' + globalIdx;
                el.dataset.idx = globalIdx;
                if (item.href) el.dataset.href = item.href;
                if (item.action) el.dataset.action = item.action;
                el.innerHTML = '<span class="cmd-item-icon" aria-hidden="true">' + item.icon + '</span>'
                    + '<span class="cmd-item-text">' + escapeHTML(item.label) + '</span>'
                    + '<span class="cmd-item-shortcut">' + escapeHTML(item.category || '') + '</span>';
                el.addEventListener('click', function() { activateItem(el); });
                results.appendChild(el);
                globalIdx++;
            });
        });

        // Sélectionner le premier résultat
        if (globalIdx > 0) setActive(0);
    }

    function activateItem(el) {
        if (!el) return;
        var href = el.dataset.href;
        var action = el.dataset.action;
        closeOverlay();
        if (href) {
            if (typeof navigateTo === 'function') { navigateTo(href); }
            else { location.href = href; }
        } else if (action === 'load-all') {
            if (typeof loadAllSections === 'function') loadAllSections();
        } else if (action === 'toggle-sidebar') {
            var sb = document.getElementById('sidebar');
            if (sb) sb.classList.toggle('open');
        } else if (action === 'toggle-mode') {
            var btn = document.getElementById('mode-dark');
            var html = document.documentElement;
            var current = html.getAttribute('data-mode');
            if (current === 'light') {
                html.setAttribute('data-mode', 'dark');
                localStorage.setItem('msyx-mode', 'dark');
            } else {
                html.setAttribute('data-mode', 'light');
                localStorage.setItem('msyx-mode', 'light');
            }
        }
    }

    function openOverlay() {
        overlay.classList.add('open');
        input.value = '';
        renderResults('');
        input.focus();
    }

    function closeOverlay() {
        overlay.classList.remove('open');
    }

    // Clic sur fond
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeOverlay();
    });

    // Input
    input.addEventListener('input', function() {
        renderResults(input.value);
    });

    // Navigation clavier
    input.addEventListener('keydown', function(e) {
        var items = getItems();
        if (e.key === 'Escape') {
            e.preventDefault();
            closeOverlay();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(Math.min(activeIdx + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(Math.max(activeIdx - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            var active = results.querySelector('.cmd-item.active');
            activateItem(active);
        }
    });

    // Raccourci global Cmd+K / Ctrl+K
    if (!document.body.dataset.cmdPaletteBound) {
        document.body.dataset.cmdPaletteBound = '1';
        document.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (overlay.classList.contains('open')) { closeOverlay(); }
                else { openOverlay(); }
            }
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                closeOverlay();
            }
        });
    }
}
window.__initCommandPalette = initCommandPalette;

// Pricing Table
function initPricing() {
    document.querySelectorAll('.pricing-toggle-switch').forEach(function(sw) {
        if (sw.dataset.bound) return;
        sw.dataset.bound = '1';

        var grid = sw.closest('.pricing-section') || document.querySelector('.pricing-grid');
        var labelMonthly = sw.parentElement ? sw.parentElement.querySelector('[data-label="monthly"]') : null;
        var labelYearly = sw.parentElement ? sw.parentElement.querySelector('[data-label="yearly"]') : null;

        function syncLabels() {
            var isYearly = sw.classList.contains('yearly');
            if (labelMonthly) { labelMonthly.classList.toggle('active', !isYearly); }
            if (labelYearly) { labelYearly.classList.toggle('active', isYearly); }
        }

        function updatePrices(isYearly) {
            var scope = sw.closest('.pricing-section') || document;
            scope.querySelectorAll('[data-price-monthly]').forEach(function(el) {
                el.textContent = isYearly ? el.dataset.priceYearly : el.dataset.priceMonthly;
            });
            syncLabels();
        }

        sw.setAttribute('role', 'switch');
        sw.setAttribute('aria-checked', sw.classList.contains('yearly') ? 'true' : 'false');
        sw.setAttribute('tabindex', '0');
        syncLabels();

        var toggle = function() {
            sw.classList.toggle('yearly');
            var isYearly = sw.classList.contains('yearly');
            sw.setAttribute('aria-checked', isYearly ? 'true' : 'false');
            updatePrices(isYearly);
        };

        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
        });
    });
}
window.__initPricing = initPricing;

// Notification Center
function initNotificationCenter() {
    document.querySelectorAll('.notif-center').forEach(function(center) {
        if (center.dataset.bound) return;
        center.dataset.bound = '1';

        var trigger = center.querySelector('.notif-trigger');
        var panel = center.querySelector('.notif-panel');
        var markAllBtn = center.querySelector('.notif-mark-all');
        if (!trigger || !panel) return;

        function countUnread() {
            return center.querySelectorAll('.notif-item--unread').length;
        }

        function updateBadge() {
            var badge = trigger.querySelector('.notif-trigger-count');
            if (!badge) return;
            var n = countUnread();
            badge.textContent = n > 0 ? (n > 9 ? '9+' : String(n)) : '';
            badge.style.display = n > 0 ? '' : 'none';
        }

        function openPanel() {
            panel.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closePanel() {
            panel.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        updateBadge();

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (panel.classList.contains('open')) { closePanel(); } else { openPanel(); }
        });

        // Mark individual as read
        panel.querySelectorAll('.notif-read-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var item = btn.closest('.notif-item');
                if (item) { item.classList.remove('notif-item--unread'); }
                updateBadge();
            });
        });

        // Click on item → mark read
        panel.querySelectorAll('.notif-item').forEach(function(item) {
            item.addEventListener('click', function() {
                item.classList.remove('notif-item--unread');
                updateBadge();
            });
        });

        // Mark all
        if (markAllBtn) {
            markAllBtn.addEventListener('click', function() {
                center.querySelectorAll('.notif-item--unread').forEach(function(i) {
                    i.classList.remove('notif-item--unread');
                });
                updateBadge();
            });
        }

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!center.contains(e.target)) { closePanel(); }
        });

        // Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && panel.classList.contains('open')) { closePanel(); trigger.focus(); }
        });
    });
}
window.__initNotificationCenter = initNotificationCenter;

// Activity Feed
function initActivityFeed() {
    document.querySelectorAll('.activity-feed').forEach(function(feed) {
        if (feed.dataset.bound) return;
        feed.dataset.bound = '1';

        var filters = feed.querySelectorAll('.activity-filter-chip');
        var loadMoreBtn = feed.querySelector('.activity-load-more-btn');
        var hiddenItems = feed.querySelectorAll('.activity-item.initially-hidden');

        filters.forEach(function(chip) {
            chip.addEventListener('click', function() {
                filters.forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');

                var filter = chip.dataset.filter || 'all';
                feed.querySelectorAll('.activity-item').forEach(function(item) {
                    if (filter === 'all') {
                        item.classList.remove('hidden');
                    } else {
                        var type = item.dataset.type || '';
                        if (type === filter) {
                            item.classList.remove('hidden');
                        } else {
                            item.classList.add('hidden');
                        }
                    }
                });
            });
        });

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function() {
                var hidden = feed.querySelectorAll('.activity-item.initially-hidden');
                hidden.forEach(function(item) { item.classList.remove('initially-hidden'); });
                loadMoreBtn.closest('.activity-load-more').style.display = 'none';
            });
        }
    });
}
window.__initActivityFeed = initActivityFeed;

// Wizard multi-step
function initWizard() {
    document.querySelectorAll('.wizard').forEach(function(wiz) {
        if (wiz.dataset.bound) return;
        wiz.dataset.bound = '1';

        var steps = wiz.querySelectorAll('.wizard-step');
        var panels = wiz.querySelectorAll('.wizard-panel');
        var prevBtn = wiz.querySelector('.wizard-prev');
        var nextBtn = wiz.querySelector('.wizard-next');
        var indicator = wiz.querySelector('.wizard-step-indicator');
        var current = 0;
        var total = panels.length;

        function goTo(n) {
            steps[current].classList.remove('active');
            panels[current].classList.remove('active');
            if (n > current) steps[current].classList.add('completed');
            else steps[current].classList.remove('completed');
            current = n;
            steps[current].classList.add('active');
            panels[current].classList.add('active');
            steps[current].setAttribute('aria-current', 'step');
            steps.forEach(function(s, i) { if (i !== current) s.removeAttribute('aria-current'); });
            if (prevBtn) prevBtn.disabled = current === 0;
            if (nextBtn) {
                if (current === total - 1) {
                    nextBtn.textContent = 'Terminer';
                } else {
                    nextBtn.innerHTML = 'Suivant &#8594;';
                }
            }
            if (indicator) indicator.textContent = 'Étape ' + (current + 1) + ' / ' + total;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (current > 0) goTo(current - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (current < total - 1) {
                    goTo(current + 1);
                } else {
                    // Final step — reset
                    steps.forEach(function(s) { s.classList.remove('completed', 'active'); });
                    goTo(0);
                }
            });
        }

        goTo(0);
    });
}
window.__initWizard = initWizard;

// Inline Editing
function initInlineEdit() {
    document.querySelectorAll('.editable-field[data-editable]').forEach(function(field) {
        if (field.dataset.bound) return;
        field.dataset.bound = '1';

        var textEl = field.querySelector('.editable-text');
        var inputWrap = field.querySelector('.editable-input-wrap');
        var inputEl = field.querySelector('.editable-input');
        var saveBtn = field.querySelector('.editable-btn-save');
        var cancelBtn = field.querySelector('.editable-btn-cancel');
        var saveDelay = parseInt(field.dataset.saveDelay || '0', 10);
        if (!textEl || !inputWrap || !inputEl) return;

        function startEdit() {
            var currentText = textEl.textContent.trim().replace(/\s*[\u270E\u9998\uFE0F].*$/, '').trim();
            inputEl.value = currentText;
            textEl.classList.add('hidden');
            inputWrap.classList.add('active');
            inputEl.focus();
            inputEl.select();
        }

        function stopEdit() {
            textEl.classList.remove('hidden');
            inputWrap.classList.remove('active');
        }

        function saveEdit() {
            var newVal = inputEl.value.trim();
            if (!newVal) { stopEdit(); return; }
            if (saveDelay > 0 && saveBtn) {
                saveBtn.classList.add('loading');
                saveBtn.textContent = '…';
                setTimeout(function() {
                    saveBtn.classList.remove('loading');
                    saveBtn.innerHTML = '&#10003;';
                    textEl.childNodes[0].textContent = newVal + ' ';
                    stopEdit();
                }, saveDelay);
            } else {
                textEl.childNodes[0].textContent = newVal + ' ';
                stopEdit();
            }
        }

        textEl.addEventListener('click', startEdit);
        textEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); }
        });

        if (saveBtn) saveBtn.addEventListener('click', saveEdit);
        if (cancelBtn) cancelBtn.addEventListener('click', stopEdit);

        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { stopEdit(); }
        });
    });
}
window.__initInlineEdit = initInlineEdit;

// Action Menu
function initActionMenu() {
    document.querySelectorAll('.action-menu-wrap').forEach(function(wrap) {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';

        var trigger = wrap.querySelector('.action-menu-trigger');
        var menu = wrap.querySelector('.action-menu');
        if (!trigger || !menu) return;

        function openMenu() {
            menu.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }
        function closeMenu() {
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = menu.classList.contains('open');
            // Close all other action menus
            document.querySelectorAll('.action-menu.open').forEach(function(m) { m.classList.remove('open'); });
            document.querySelectorAll('.action-menu-trigger[aria-expanded="true"]').forEach(function(t) { t.setAttribute('aria-expanded', 'false'); });
            if (!isOpen) openMenu();
        });

        menu.querySelectorAll('.action-menu-item').forEach(function(item) {
            item.addEventListener('click', function() { closeMenu(); });
        });
    });

    // Global close on outside click (idempotent via named handler not needed — handled in DOMContentLoaded once)
}
window.__initActionMenu = initActionMenu;

// Sidebar Rail
function initSidebarRail() {
    document.querySelectorAll('.rail-demo').forEach(function(demo) {
        if (demo.dataset.bound) return;
        demo.dataset.bound = '1';

        var sidebar = demo.querySelector('.rail-sidebar');
        var toggle = demo.querySelector('.rail-toggle');
        if (!sidebar || !toggle) return;

        toggle.addEventListener('click', function() {
            var collapsed = sidebar.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            toggle.setAttribute('aria-label', collapsed ? 'Développer la sidebar' : 'Réduire la sidebar');
        });
    });
}
window.__initSidebarRail = initSidebarRail;

// Risk Matrix
function initRiskMatrix() {
    var LEVEL_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Elev&eacute;', critical: 'Critique' };

    function scoreLevel(score, maxScore) {
        var ratio = score / maxScore;
        if (ratio <= 0.16) return 'low';
        if (ratio <= 0.36) return 'medium';
        if (ratio <= 0.64) return 'high';
        return 'critical';
    }

    function initials(label) {
        if (!label) return '?';
        var words = label.trim().split(/\s+/);
        if (words.length === 1) return label.slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    function escapeAttr(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Shared tooltip element (one per matrix)
    function createTooltip() {
        var tt = document.createElement('div');
        tt.className = 'risk-tooltip';
        document.body.appendChild(tt);
        return tt;
    }

    document.querySelectorAll('.risk-matrix:not([data-bound])').forEach(function(matrix) {
        matrix.dataset.bound = '1';

        var size = parseInt(matrix.getAttribute('data-size') || '5', 10);
        var labelX = matrix.getAttribute('data-label-x') || 'Impact';
        var labelY = matrix.getAttribute('data-label-y') || 'Probabilit&eacute;';
        var maxScore = size * size;

        // Collect risk items
        var items = Array.from(matrix.querySelectorAll('.risk-item'));
        items.forEach(function(it) { it.remove(); });

        // Build cell map: key = "prob_impact" → array of item data
        var cellMap = {};
        items.forEach(function(it) {
            var prob = parseInt(it.getAttribute('data-prob') || '1', 10);
            var impact = parseInt(it.getAttribute('data-impact') || '1', 10);
            var key = prob + '_' + impact;
            if (!cellMap[key]) cellMap[key] = [];
            cellMap[key].push({
                label: it.getAttribute('data-label') || 'Risque',
                level: it.getAttribute('data-level') || 'medium',
                owner: it.getAttribute('data-owner') || '',
                detail: it.getAttribute('data-detail') || '',
                prob: prob,
                impact: impact
            });
        });

        // Build outer wrapper
        var wrap = document.createElement('div');
        wrap.className = 'risk-matrix-wrap';

        // Y axis label
        var axisY = document.createElement('div');
        axisY.className = 'risk-axis-y';
        axisY.innerHTML = labelY + ' &uarr;';
        wrap.appendChild(axisY);

        // Inner (grid + x axis)
        var inner = document.createElement('div');
        inner.className = 'risk-matrix-inner';

        // Grid: (size+1) columns (col 0 = row labels) × (size+1) rows (row size+1 = col labels)
        var grid = document.createElement('div');
        grid.className = 'risk-grid';
        grid.style.gridTemplateColumns = '24px repeat(' + size + ', 1fr)';
        grid.style.gridTemplateRows = 'repeat(' + size + ', 1fr) 24px';

        // Build cells
        // row 1..size = prob from high to low (prob=size at row 1, prob=1 at row size)
        for (var row = 1; row <= size; row++) {
            var prob = size - row + 1; // inverted: row1=prob5, rowN=prob1

            // Row label (col 0)
            var rowLabel = document.createElement('div');
            rowLabel.className = 'risk-row-label';
            rowLabel.textContent = prob;
            rowLabel.style.gridColumn = '1';
            rowLabel.style.gridRow = '' + row;
            grid.appendChild(rowLabel);

            // Cells for each impact col
            for (var col = 1; col <= size; col++) {
                var impact = col; // col1=impact1, colN=impactN
                var score = prob * impact;
                var scoreLabel = scoreLevel(score, maxScore);

                var cell = document.createElement('div');
                cell.className = 'risk-cell';
                cell.setAttribute('data-score', scoreLabel);
                cell.style.gridColumn = '' + (col + 1);
                cell.style.gridRow = '' + row;

                var key = prob + '_' + impact;
                var dotItems = cellMap[key] || [];
                var MAX_DOTS = 3;

                dotItems.forEach(function(itemData, idx) {
                    if (idx >= MAX_DOTS) return;
                    var dot = document.createElement('div');
                    dot.className = 'risk-dot risk-dot-hidden';
                    dot.setAttribute('data-level', itemData.level);
                    dot.setAttribute('tabindex', '0');
                    dot.setAttribute('role', 'button');
                    dot.setAttribute('aria-label', itemData.label + ' — niveau ' + (LEVEL_LABELS[itemData.level] || itemData.level));
                    dot.dataset.riskLabel = itemData.label;
                    dot.dataset.riskLevel = itemData.level;
                    dot.dataset.riskOwner = itemData.owner;
                    dot.dataset.riskDetail = itemData.detail;
                    dot.dataset.riskProb = itemData.prob;
                    dot.dataset.riskImpact = itemData.impact;
                    dot.style.setProperty('--i', '' + idx);
                    // Collision offset
                    if (idx > 0) dot.style.marginLeft = '-8px';
                    dot.textContent = initials(itemData.label);
                    cell.appendChild(dot);
                });

                // Overflow badge if > MAX_DOTS
                if (dotItems.length > MAX_DOTS) {
                    var overflow = document.createElement('div');
                    overflow.className = 'risk-dot risk-dot-overflow risk-dot-hidden';
                    overflow.style.marginLeft = '-8px';
                    overflow.setAttribute('aria-hidden', 'true');
                    overflow.textContent = '+' + (dotItems.length - MAX_DOTS);
                    cell.appendChild(overflow);
                }

                grid.appendChild(cell);
            }
        }

        // Col labels row (row = size+1)
        // Empty corner
        var corner = document.createElement('div');
        corner.style.gridColumn = '1';
        corner.style.gridRow = '' + (size + 1);
        grid.appendChild(corner);

        for (var c = 1; c <= size; c++) {
            var colLabel = document.createElement('div');
            colLabel.className = 'risk-col-label';
            colLabel.textContent = c;
            colLabel.style.gridColumn = '' + (c + 1);
            colLabel.style.gridRow = '' + (size + 1);
            grid.appendChild(colLabel);
        }

        inner.appendChild(grid);

        // X axis label
        var axisX = document.createElement('div');
        axisX.className = 'risk-axis-x';
        axisX.innerHTML = labelX + ' &rarr;';
        inner.appendChild(axisX);

        wrap.appendChild(inner);
        matrix.appendChild(wrap);

        // Tooltip (shared per matrix)
        var tooltip = createTooltip();

        function showTooltip(dot, e) {
            var lvl = dot.dataset.riskLevel || 'medium';
            var owner = dot.dataset.riskOwner;
            tooltip.innerHTML =
                '<div class="risk-tooltip-title">' + escapeAttr(dot.dataset.riskLabel) + '</div>' +
                '<div class="risk-tooltip-row">' +
                  '<span class="risk-tooltip-badge ' + lvl + '">' + (LEVEL_LABELS[lvl] || lvl) + '</span>' +
                  (owner ? '<span class="risk-tooltip-owner">' + escapeAttr(owner) + '</span>' : '') +
                '</div>' +
                '<div class="risk-tooltip-hint">Clic pour le d&eacute;tail complet</div>';
            tooltip.classList.add('visible');
            positionTooltip(e);
        }

        function positionTooltip(e) {
            if (!e) return;
            var x = e.clientX + 14, y = e.clientY - 10;
            var tw = tooltip.offsetWidth || 200, th = tooltip.offsetHeight || 80;
            if (x + tw > window.innerWidth - 8) x = e.clientX - tw - 14;
            if (y + th > window.innerHeight - 8) y = e.clientY - th - 10;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        }

        function hideTooltip() {
            tooltip.classList.remove('visible');
        }

        function openDetail(dot) {
            var lvl = dot.dataset.riskLevel || 'medium';
            var prob = dot.dataset.riskProb;
            var impact = dot.dataset.riskImpact;
            var bodyHTML =
                '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
                  '<tr><td style="padding:0.4rem 0.6rem;color:var(--text-muted);width:35%">Niveau</td>' +
                  '<td style="padding:0.4rem 0.6rem;"><span class="risk-tooltip-badge ' + lvl + '">' + (LEVEL_LABELS[lvl] || lvl) + '</span></td></tr>' +
                  '<tr><td style="padding:0.4rem 0.6rem;color:var(--text-muted)">Probabilit&eacute;</td>' +
                  '<td style="padding:0.4rem 0.6rem;">' + escapeAttr(prob) + ' / ' + size + '</td></tr>' +
                  '<tr><td style="padding:0.4rem 0.6rem;color:var(--text-muted)">Impact</td>' +
                  '<td style="padding:0.4rem 0.6rem;">' + escapeAttr(impact) + ' / ' + size + '</td></tr>' +
                  (dot.dataset.riskOwner ? '<tr><td style="padding:0.4rem 0.6rem;color:var(--text-muted)">Responsable</td><td style="padding:0.4rem 0.6rem;">' + escapeAttr(dot.dataset.riskOwner) + '</td></tr>' : '') +
                  (dot.dataset.riskDetail ? '<tr><td style="padding:0.4rem 0.6rem;color:var(--text-muted);vertical-align:top;">Description</td><td style="padding:0.4rem 0.6rem;">' + escapeAttr(dot.dataset.riskDetail) + '</td></tr>' : '') +
                '</table>';
            if (window.__openModal) {
                window.__openModal({
                    title: dot.dataset.riskLabel || 'Risque',
                    bodyHTML: bodyHTML,
                    actions: [
                        { label: 'Modifier', style: 'secondary' },
                        { label: 'Fermer', style: 'primary' }
                    ]
                });
            }
        }

        // Bind events on all dots
        grid.querySelectorAll('.risk-dot:not(.risk-dot-overflow)').forEach(function(dot) {
            dot.addEventListener('mouseenter', function(e) { showTooltip(dot, e); });
            dot.addEventListener('mousemove', function(e) { positionTooltip(e); });
            dot.addEventListener('mouseleave', function() { hideTooltip(); });
            dot.addEventListener('focus', function(e) { showTooltip(dot, e); });
            dot.addEventListener('blur', function() { hideTooltip(); });
            dot.addEventListener('click', function() { hideTooltip(); openDetail(dot); });
            dot.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hideTooltip(); openDetail(dot); }
            });
        });

        // Animate dots on scroll (IntersectionObserver)
        var dotObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var allDots = Array.from(entry.target.querySelectorAll('.risk-dot.risk-dot-hidden'));
                    allDots.forEach(function(d, i) {
                        setTimeout(function() {
                            d.classList.remove('risk-dot-hidden');
                            d.classList.add('risk-dot-visible');
                        }, i * 60);
                    });
                    dotObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        dotObs.observe(matrix);

        // SPA fix: if matrix is already visible, trigger animation immediately
        var rect = matrix.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            var allDots = Array.from(matrix.querySelectorAll('.risk-dot.risk-dot-hidden'));
            allDots.forEach(function(d, i) {
                setTimeout(function() {
                    d.classList.remove('risk-dot-hidden');
                    d.classList.add('risk-dot-visible');
                }, i * 60);
            });
            dotObs.unobserve(matrix);
        }
    });
}
window.__initRiskMatrix = initRiskMatrix;

// ===== AUTO-SAVE INDICATOR =====
function initAutoSave() {
    document.querySelectorAll('.autosave[data-autosave-demo]').forEach(function(el) {
        if (el.dataset.bound) return;
        el.dataset.bound = '1';
        var btn = el.querySelector('[data-autosave-trigger]');
        if (!btn) return;
        var states = ['saving', 'saved', 'unsaved'];
        var labels = { saving: 'Enregistrement...', saved: 'Enregistre', unsaved: 'Modifications non sauvegardees' };
        var icons = {
            saving: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="2" stroke-dasharray="8 6" stroke-linecap="round"/></svg>',
            saved: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            unsaved: '<span class="autosave-dot"></span>'
        };
        var idx = 0;
        function applyState(state) {
            el.className = 'autosave autosave--' + state;
            var iconEl = el.querySelector('.autosave-icon');
            var textEl = el.querySelector('.autosave-text');
            if (iconEl) iconEl.innerHTML = icons[state];
            if (textEl) textEl.textContent = labels[state];
        }
        applyState(states[idx]);
        btn.addEventListener('click', function() {
            idx = (idx + 1) % states.length;
            applyState(states[idx]);
        });
    });
}
window.__initAutoSave = initAutoSave;

// ===== COMMENTS / THREAD =====
function initComments() {
    document.querySelectorAll('.comment-action-btn[data-reply-trigger]').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            var comment = btn.closest('.comment');
            if (!comment) return;
            var form = comment.querySelector('.comment-reply-form');
            if (!form) return;
            form.classList.toggle('open');
            if (form.classList.contains('open')) {
                var inp = form.querySelector('.comment-reply-input');
                if (inp) inp.focus();
            }
        });
    });
    document.querySelectorAll('.comment-action-btn[data-like-trigger]').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            btn.classList.toggle('active');
            var countEl = btn.querySelector('.like-count');
            if (countEl) {
                var n = parseInt(countEl.textContent, 10) || 0;
                countEl.textContent = btn.classList.contains('active') ? n + 1 : Math.max(0, n - 1);
            }
        });
    });
    document.querySelectorAll('.comment-reply-form .btn-ghost').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            var form = btn.closest('.comment-reply-form');
            if (form) form.classList.remove('open');
        });
    });
}
window.__initComments = initComments;

// ===== AUTH FLOWS =====
function initAuthFlows() {
    // Password strength
    document.querySelectorAll('.login-strength[data-strength-target]').forEach(function(el) {
        if (el.dataset.bound) return;
        el.dataset.bound = '1';
        var targetId = el.dataset.strengthTarget;
        var input = document.getElementById(targetId);
        if (!input) return;
        var fill = el.querySelector('.login-strength-fill');
        var label = el.querySelector('.login-strength-label');
        var levels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
        function calcStrength(v) {
            var s = 0;
            if (v.length >= 8) s++;
            if (/[A-Z]/.test(v)) s++;
            if (/[0-9]/.test(v)) s++;
            if (/[^A-Za-z0-9]/.test(v)) s++;
            return s;
        }
        input.addEventListener('input', function() {
            var lvl = calcStrength(input.value);
            if (fill) fill.setAttribute('data-level', input.value.length === 0 ? '0' : lvl);
            if (fill) fill.style.width = input.value.length === 0 ? '0' : '';
            if (label) label.textContent = input.value.length === 0 ? '' : levels[lvl] || '';
        });
    });
    // Step navigation
    document.querySelectorAll('[data-auth-step-to]').forEach(function(btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            var container = btn.closest('.login-card, .login-preview, [data-auth-container]');
            if (!container) return;
            var target = btn.dataset.authStepTo;
            container.querySelectorAll('.login-step').forEach(function(s) { s.classList.remove('active'); });
            var next = container.querySelector('.login-step[data-step="' + target + '"]');
            if (next) next.classList.add('active');
        });
    });
}
window.__initAuthFlows = initAuthFlows;

// ===== USAGE METER =====
function initUsageMeter() {
    var obs = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            var meter = entry.target;
            var fill = meter.querySelector('.usage-fill');
            if (!fill) return;
            var pct = parseFloat(meter.dataset.value) || 0;
            setTimeout(function() { fill.style.width = pct + '%'; }, 80);
            obs.unobserve(meter);
        });
    }, { threshold: 0.3 }) : null;

    document.querySelectorAll('.usage-meter[data-value]').forEach(function(meter) {
        if (meter.dataset.bound) return;
        meter.dataset.bound = '1';
        var fill = meter.querySelector('.usage-fill');
        if (!fill) return;
        fill.style.width = '0';
        if (obs) {
            obs.observe(meter);
            // Fallback: si le meter est déjà visible dans le viewport, appliquer immédiatement
            var rect = meter.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                var pct = parseFloat(meter.dataset.value) || 0;
                setTimeout(function() { fill.style.width = pct + '%'; }, 80);
                obs.unobserve(meter);
            }
        } else {
            var pct = parseFloat(meter.dataset.value) || 0;
            fill.style.width = pct + '%';
        }
    });
}
window.__initUsageMeter = initUsageMeter;

// ===== CONFIRM POPOVER =====
function initConfirmPopover() {
    document.querySelectorAll('.popover-confirm-wrap').forEach(function(wrap) {
        if (wrap.dataset.bound) return;
        wrap.dataset.bound = '1';
        var trigger = wrap.querySelector('[data-confirm-trigger]');
        var popover = wrap.querySelector('.popover-confirm');
        var cancelBtn = wrap.querySelector('[data-confirm-cancel]');
        var confirmBtn = wrap.querySelector('[data-confirm-ok]');
        if (!trigger || !popover) return;

        function openPop() {
            // Close others
            document.querySelectorAll('.popover-confirm.open').forEach(function(p) {
                if (p !== popover) p.classList.remove('open');
            });
            popover.classList.toggle('open');
        }

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            openPop();
        });

        if (cancelBtn) cancelBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            popover.classList.remove('open');
        });

        if (confirmBtn) confirmBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            popover.classList.remove('open');
            var cb = wrap.dataset.onConfirm;
            if (cb && typeof window[cb] === 'function') window[cb]();
        });
    });

    // Global close on outside click
    if (!document.__confirmPopoverGlobal) {
        document.__confirmPopoverGlobal = true;
        document.addEventListener('click', function() {
            document.querySelectorAll('.popover-confirm.open').forEach(function(p) { p.classList.remove('open'); });
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.popover-confirm.open').forEach(function(p) { p.classList.remove('open'); });
            }
        });
    }
}
window.__initConfirmPopover = initConfirmPopover;

// reinitAll — appelle TOUS les init* pour compatibilité lazy-load et SPA
function reinitAll() {
    initComponents();
    initPricing();
    initNotificationCenter();
    initActivityFeed();
    initWizard();
    initInlineEdit();
    initActionMenu();
    initSidebarRail();
    initRiskMatrix();
    initAutoSave();
    initComments();
    initAuthFlows();
    initUsageMeter();
    initConfirmPopover();
}
window.__initComponents = reinitAll;

// Close dropdowns and action menus on outside click (once)
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.dropdown-trigger.open').forEach(t => t.classList.remove('open'));
    document.querySelectorAll('.action-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.action-menu-trigger[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));
});

// Close action menus on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.action-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.action-menu-trigger[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));
    }
});

document.addEventListener('DOMContentLoaded', reinitAll);
