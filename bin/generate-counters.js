#!/usr/bin/env node
/**
 * generate-counters.js — Compteur de composants dérivé du registre (#707)
 * Design System msyx.fr — bin/generate-counters.js v1.0
 *
 * Usage :
 *   node bin/generate-counters.js          # Génère et écrit site.html + docs/ARCHITECTURE.md
 *   node bin/generate-counters.js --check  # Valide sans écrire (mode CI, exit 1 si drift)
 *
 * Source de vérité (tranchée #707) : shared/components-registry.json,
 * entrées dont `kind === "component"` (les kind:module/pattern/layout/utility
 * ne sont PAS des composants UI — ils ne comptent pas dans le compteur hero).
 *
 * Met à jour 3 emplacements textuels qui doivent tous refléter ce compteur :
 *   - site.html  : meta description ("N composants, …")
 *   - site.html  : hero-stat (<div class="number">N</div> … Composants)
 *   - site.html  : footer ("N composants")
 *   - docs/ARCHITECTURE.md : en-tête ("**N composants UI**")
 *
 * Même philosophie que bin/generate-nav-sections.js / bin/generate-version-notes.js :
 * la MÊME fonction de transformation sert à la génération ET au --check
 * (comparaison texte-à-texte) → idempotence garantie, 0 flakiness.
 *
 * Pas de marqueurs AUTO-GENERATED ici : contrairement à nav.js (bloc JS dédié),
 * le compteur est disséminé dans du texte HTML/Markdown existant (attribut meta,
 * texte de hero, prose d'en-tête) — on cible chaque emplacement par regex ancrée
 * sur son contexte immédiat (même approche que shared/check-counters.sh).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CHECK_MODE = process.argv.includes('--check');

// ─── Chemins ──────────────────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(__filename);
const ROOT = path.resolve(SCRIPT_DIR, '..');
const REGISTRY_PATH = path.join(ROOT, 'shared', 'components-registry.json');
const SITE_PATH = path.join(ROOT, 'site.html');
const ARCHITECTURE_PATH = path.join(ROOT, 'docs', 'ARCHITECTURE.md');

// ─── Source de vérité ───────────────────────────────────────────────────────

function countComponents() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(raw);
  const list = Array.isArray(registry) ? registry : registry.components;
  if (!Array.isArray(list)) {
    throw new Error('shared/components-registry.json : liste "components" introuvable.');
  }
  return list.filter((c) => c && c.kind === 'component').length;
}

// ─── Transformations texte (idempotentes) ──────────────────────────────────

// site.html contient 3 occurrences textuelles indépendantes du compteur.
function updateSiteHtml(html, count) {
  let out = html;
  let hits = 0;

  // 1. Meta description : `content="… N composants, …"`
  const metaRe = /(<meta name="description" content="[^"]*?)\d+( composants)/;
  if (metaRe.test(out)) { out = out.replace(metaRe, (m, pre, suf) => pre + count + suf); hits++; }

  // 2. Hero stat : `<div class="number">N</div><div class="label">Composants</div>`
  const heroRe = /(<div class="number">)\d+(<\/div><div class="label">Composants<\/div>)/;
  if (heroRe.test(out)) { out = out.replace(heroRe, (m, pre, suf) => pre + count + suf); hits++; }

  // 3. Footer : `… N composants …`
  const footerRe = /(<footer>.*?)\d+( composants)/;
  if (footerRe.test(out)) { out = out.replace(footerRe, (m, pre, suf) => pre + count + suf); hits++; }

  if (hits !== 3) {
    throw new Error(
      'site.html : ' + hits + '/3 emplacements du compteur composants trouvés (attendu 3 : ' +
      'meta description, hero-stat, footer). Structure du fichier modifiée ?'
    );
  }
  return out;
}

// docs/ARCHITECTURE.md : compteur en tête ("**N composants UI**").
function updateArchitectureMd(md, count) {
  const re = /\*\*\d+ composants UI\*\*/;
  if (!re.test(md)) {
    throw new Error('docs/ARCHITECTURE.md : motif "**N composants UI**" introuvable en en-tête.');
  }
  return md.replace(re, '**' + count + ' composants UI**');
}

// ─── Main ───────────────────────────────────────────────────────────────────

(function main() {
  try {
    console.log('[generate-counters] Mode: ' + (CHECK_MODE ? '--check (CI)' : 'génération'));

    const count = countComponents();
    console.log('[generate-counters] Composants (kind:component, registre) : ' + count);

    const siteBefore = fs.readFileSync(SITE_PATH, 'utf8');
    const siteAfter = updateSiteHtml(siteBefore, count);

    const archBefore = fs.readFileSync(ARCHITECTURE_PATH, 'utf8');
    const archAfter = updateArchitectureMd(archBefore, count);

    if (CHECK_MODE) {
      const errors = [];
      if (siteAfter !== siteBefore) {
        errors.push('site.html : compteur composants désynchronisé du registre (attendu ' + count + ').');
      }
      if (archAfter !== archBefore) {
        errors.push('docs/ARCHITECTURE.md : compteur composants désynchronisé du registre (attendu ' + count + ').');
      }
      if (errors.length) {
        console.error('\n[ERREUR --check] Compteurs désynchronisés :');
        errors.forEach((e) => console.error('  ' + e));
        console.error('\nLancez :\n  node bin/generate-counters.js\npuis committez site.html / docs/ARCHITECTURE.md.');
        process.exit(1);
      }
      console.log('\n[OK] Compteurs à jour (site.html + docs/ARCHITECTURE.md).');
      process.exit(0);
    }

    fs.writeFileSync(SITE_PATH, siteAfter, 'utf8');
    fs.writeFileSync(ARCHITECTURE_PATH, archAfter, 'utf8');

    // Idempotence : une 2e passe ne doit rien changer.
    const site2 = updateSiteHtml(fs.readFileSync(SITE_PATH, 'utf8'), count);
    const arch2 = updateArchitectureMd(fs.readFileSync(ARCHITECTURE_PATH, 'utf8'), count);
    if (site2 !== fs.readFileSync(SITE_PATH, 'utf8') || arch2 !== fs.readFileSync(ARCHITECTURE_PATH, 'utf8')) {
      throw new Error('Idempotence KO — re-génération produit un résultat différent.');
    }

    console.log('\n[OK] site.html + docs/ARCHITECTURE.md mis à jour — compteur composants = ' + count + '.');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] ' + err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
