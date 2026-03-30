// Shared component interactions for msyx.design
// Exposes window.__initComponents() for SPA re-init after page swap

function initComponents() {
    // Tabs
    document.querySelectorAll('.tabs').forEach(g => {
        if (g.dataset.bound) return;
        g.dataset.bound = '1';
        g.querySelectorAll('.tab').forEach(t => {
            t.setAttribute('role', 'tab');
            t.setAttribute('tabindex', '0');
            t.addEventListener('click', () => {
                g.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
            });
            t.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    g.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
                    t.classList.add('active');
                }
            });
        });
    });

    // Accordion
    document.querySelectorAll('.accordion-header').forEach(h => {
        if (h.dataset.bound) return;
        h.dataset.bound = '1';
        h.setAttribute('role', 'button');
        h.setAttribute('tabindex', '0');
        h.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                h.parentElement.classList.toggle('open');
            }
        });
        h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
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
            chip.innerHTML = `${trimmed} <button class="chip-close" aria-label="Supprimer ${trimmed}">&times;</button>`;
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
    toast.innerHTML = '<span style="color:' + colors[type] + ';font-size:1rem;">' + icons[type] + '</span><span>' + message + '</span><button class="toast-close">&times;</button>';
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

    dialog.innerHTML = '<div class="modal-header"><h3>' + (title || 'Modal') + '</h3><button class="modal-close" data-modal-close aria-label="Fermer">&times;</button></div><div class="modal-body">' + (body || '') + '</div>' + actionsHtml;

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
    acssi: { modes: ['dark'],          defaultMode: 'dark' },
    nhood: { modes: ['dark', 'light'], defaultMode: 'dark' }
};

function initThemeSwitcher() {
    var select = document.getElementById('theme-select');
    if (!select) return;
    var current = document.documentElement.getAttribute('data-theme') || 'msyx';
    select.value = current;
    if (select.dataset.bound) return;
    select.dataset.bound = '1';
    select.addEventListener('change', function() {
        var theme = this.value;
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
        applyMode('dark');
        updateModeButtons();
    });
    lightBtn.addEventListener('click', function() {
        if (lightBtn.disabled) return;
        applyMode('light');
        updateModeButtons();
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
                dot.setAttribute('aria-label', 'Slide ' + (i + 1));
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
            tag.innerHTML = trimmed + ' <button class="tag-close" aria-label="Supprimer ' + trimmed + '">&times;</button>';

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
            '<button class="lightbox-btn lightbox-prev" id="lb-prev" aria-label="Image precedente">&#8249;</button>' +
            '<button class="lightbox-btn lightbox-next" id="lb-next" aria-label="Image suivante">&#8250;</button>' +
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

window.__initComponents = initComponents;

// Close dropdowns on outside click (once)
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.dropdown-trigger.open').forEach(t => t.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', () => {
    initComponents();
});
