// lighthouserc.cjs — Lighthouse CI config (DS v2.54.0)
// Scope: 1 page × 3 themes × 2 modes = 6 runs, warn-only mode
// THEME_CONFIG (components.js): msyx/acssi/nhood — modes: ['dark','light'] pour les 3
// Multi-themes extension: #241

'use strict';

const BASE_URL = 'http://localhost:3001/pages/composants.html';

// 3 themes × 2 modes = 6 runs (tous valides d'après THEME_CONFIG)
const THEME_MODES = [
  { theme: 'msyx',  mode: 'dark'  },
  { theme: 'msyx',  mode: 'light' },
  { theme: 'acssi', mode: 'dark'  },
  { theme: 'acssi', mode: 'light' },
  { theme: 'nhood', mode: 'dark'  },
  { theme: 'nhood', mode: 'light' },
];

const urls = THEME_MODES.map(
  ({ theme, mode }) => `${BASE_URL}?theme=${theme}&mode=${mode}`
);

module.exports = {
  ci: {
    collect: {
      url: urls,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless',
        // Theme/mode appliqués via query param → script inline anti-FOUC dans composants.html
        // Le script lit ?theme=X&mode=Y et l'écrit dans localStorage avant le render
      },
      // Use Playwright's Chromium if available (CI and local dev)
      chromePath: process.env.CHROMIUM_PATH || undefined,
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        // Performance metrics — warn-only (block mode planifié post-S31)
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
