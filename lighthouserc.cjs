// lighthouserc.cjs — Lighthouse CI config (DS v2.53.0)
// Scope: 1 page × 1 theme (MSYX dark), warn-only mode
// Multi-themes extension planned in #241

'use strict';

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3001/pages/composants.html'],
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless',
        // MSYX dark is the default theme (no localStorage manipulation needed)
        // data-theme="msyx" data-mode="dark" are defaults in HTML
      },
      // Use Playwright's Chromium if available (CI and local dev)
      chromePath: process.env.CHROMIUM_PATH || undefined,
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        // Performance metrics — warn-only on first ticket, block mode planned in #241
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
