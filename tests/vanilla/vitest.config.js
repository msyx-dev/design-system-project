// Config Vitest dediee a la suite "vanilla" (#744) -- shared/components.js.
//
// Scope volontairement restreint a tests/vanilla/**/*.test.js : les fichiers
// tests/regression/*.test.js existants sont des scripts node "assert-maison"
// (pas de describe/it), executes directement via `node <fichier>.test.js`
// (cf. scripts npm test:graph-*) -- on ne veut PAS que vitest les ramasse.
//
// environment: 'node' (pas 'jsdom') : chaque test gere lui-meme sa propre
// instance jsdom via tests/vanilla/helpers/load-components.js, pour un
// controle explicite du cycle de vie DOM (une fenetre par test, aucun
// environnement global partage/magique). Voir commentaire de ce helper.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/vanilla/**/*.test.js'],
    environment: 'node',
    globals: false,
    watch: false,
  },
});
