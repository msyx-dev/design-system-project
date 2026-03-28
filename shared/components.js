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

    // Sliders
    initSliders();

    // Modals
    initModals();

    // Copy Buttons
    initCopyButtons();
}

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
        document.body.appendChild(container);
    }
    var icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;', info: '&#8505;' };
    var colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type + ' toast-enter';
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
window.__initComponents = initComponents;

// Close dropdowns on outside click (once)
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.dropdown-trigger.open').forEach(t => t.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', () => {
    initComponents();
});
