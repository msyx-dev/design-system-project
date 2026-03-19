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
