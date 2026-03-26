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

var THEME_CONFIG = {
    msyx:  { modes: ['dark', 'light'], defaultMode: 'dark' },
    acssi: { modes: ['dark'],          defaultMode: 'dark' }
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

// Sidebar toggle (once)
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    initComponents();
});
