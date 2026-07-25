#!/usr/bin/env node
/**
 * generate-counters.js — Compteurs de la page d'accueil dérivés (#707)
 * Design System msyx.fr — bin/generate-counters.js v2.0
 *
 * Usage :
 *   node bin/generate-counters.js          # Génère et écrit site.html + docs/ARCHITECTURE.md
 *   node bin/generate-counters.js --check  # Valide sans écrire (mode CI, exit 1 si drift)
 *
 * Dérive et synchronise 3 familles de valeurs disséminées dans site.html
 * (et, pour le compteur composants, docs/ARCHITECTURE.md) :
 *
 * 1. Compteur de composants — source de vérité tranchée #707 :
 *    shared/components-registry.json, entrées `kind === "component"`
 *    (les kind:module/pattern/layout/utility ne sont PAS des composants UI).
 *    Écrit dans : site.html (meta description, hero-stat, footer) +
 *    docs/ARCHITECTURE.md (en-tête "**N composants UI**").
 *
 * 2. Compteurs de sections par hub-card — source de vérité : nombre réel de
 *    `<section id="...">` dans chaque pages/<slug>.html (même logique de
 *    comptage que l'historique shared/check-counters.sh, issue #380).
 *    Écrit dans : site.html (`<span class="hub-card-count">N sections</span>`
 *    de chaque hub-card, dans l'ordre d'apparition).
 *
 * 3. Version affichée sur la page d'accueil — source de vérité : `const
 *    VERSION` de shared/nav.js (== @ds-version, cf. shared/check-versions.sh).
 *    Écrit dans : site.html (fin de la meta description + début du footer).
 *
 * Même philosophie que bin/generate-nav-sections.js / bin/generate-version-notes.js :
 * la MÊME fonction de transformation sert à la génération ET au --check
 * (comparaison texte-à-texte) → idempotence garantie, 0 flakiness.
 *
 * Pas de marqueurs AUTO-GENERATED ici : contrairement à nav.js (bloc JS dédié),
 * ces valeurs sont disséminées dans du texte HTML/Markdown existant (attribut
 * meta, texte de hero, prose d'en-tête, spans de hub-card) — on cible chaque
 * emplacement par regex ancrée sur son contexte immédiat (même approche que
 * shared/check-counters.sh).
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
const NAV_JS_PATH = path.join(ROOT, 'shared', 'nav.js');
const PAGES_DIR = path.join(ROOT, 'pages');

// ─── Sources de vérité ──────────────────────────────────────────────────────

function countComponents() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const registry = JSON.parse(raw);
  const list = Array.isArray(registry) ? registry : registry.components;
  if (!Array.isArray(list)) {
    throw new Error('shared/components-registry.json : liste "components" introuvable.');
  }
  return list.filter((c) => c && c.kind === 'component').length;
}

function getVersion() {
  const navJs = fs.readFileSync(NAV_JS_PATH, 'utf8');
  const m = navJs.match(/const\s+VERSION\s*=\s*'([0-9]+\.[0-9]+\.[0-9]+)'/);
  if (!m) throw new Error("shared/nav.js : \"const VERSION = '…'\" introuvable.");
  return m[1];
}

// Nombre réel de sections d'une page — même logique que l'historique
// shared/check-counters.sh : grep -cE '<section[^>]*\bid="[^"]+"' (compte
// TOUTES les occurrences du motif dans le fichier, pas seulement `.main >
// section[id]` — volontairement identique à l'origine, cf. #707).
function countPageSections(slug) {
  const pagePath = path.join(PAGES_DIR, slug + '.html');
  if (!fs.existsSync(pagePath)) {
    throw new Error('pages/' + slug + '.html introuvable (référencé par un hub-card de site.html).');
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  const matches = html.match(/<section[^>]*\bid="[^"]+"/g);
  return matches ? matches.length : 0;
}

// ─── Transformations texte (idempotentes) ──────────────────────────────────

function updateComponentCount(html, count) {
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

function updateVersion(html, version) {
  let out = html;
  let hits = 0;

  // Meta description : `… glassmorphism et gradients. vX.Y.Z">`
  const metaRe = /(<meta name="description" content="[^"]*?)v\d+\.\d+\.\d+(")/;
  if (metaRe.test(out)) { out = out.replace(metaRe, (m, pre, suf) => pre + 'v' + version + suf); hits++; }

  // Footer : `<footer><p>msyx.design vX.Y.Z …`
  const footerRe = /(<footer><p>msyx\.design )v\d+\.\d+\.\d+/;
  if (footerRe.test(out)) { out = out.replace(footerRe, (m, pre) => pre + 'v' + version); hits++; }

  if (hits !== 2) {
    throw new Error(
      'site.html : ' + hits + '/2 emplacements de la version trouvés (attendu 2 : ' +
      'meta description, footer). Structure du fichier modifiée ?'
    );
  }
  return out;
}

function updateHubCardCounts(html) {
  const hrefRe = /class="hub-card"/g;
  const expected = (html.match(hrefRe) || []).length;
  if (expected === 0) {
    throw new Error('site.html : aucune hub-card (class="hub-card") trouvée.');
  }

  let hits = 0;
  const blockRe = /(<a href="\/pages\/([a-z-]+)\.html" class="hub-card">[\s\S]*?<span class="hub-card-count">)\d+( sections<\/span>)/g;
  const out = html.replace(blockRe, (m, pre, slug, suf) => {
    hits++;
    const real = countPageSections(slug);
    return pre + real + suf;
  });

  if (hits !== expected) {
    throw new Error(
      'site.html : ' + hits + '/' + expected + ' hub-card-count synchronisés — structure du fichier modifiée ?'
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

function transform(siteHtml, archMd, count, version) {
  let site = updateComponentCount(siteHtml, count);
  site = updateVersion(site, version);
  site = updateHubCardCounts(site);
  const arch = updateArchitectureMd(archMd, count);
  return { site, arch };
}

// ─── Main ───────────────────────────────────────────────────────────────────

(function main() {
  try {
    console.log('[generate-counters] Mode: ' + (CHECK_MODE ? '--check (CI)' : 'génération'));

    const count = countComponents();
    const version = getVersion();
    console.log('[generate-counters] Composants (kind:component, registre) : ' + count);
    console.log('[generate-counters] Version (shared/nav.js const VERSION) : ' + version);

    const siteBefore = fs.readFileSync(SITE_PATH, 'utf8');
    const archBefore = fs.readFileSync(ARCHITECTURE_PATH, 'utf8');
    const { site: siteAfter, arch: archAfter } = transform(siteBefore, archBefore, count, version);

    if (CHECK_MODE) {
      const errors = [];
      if (siteAfter !== siteBefore) {
        errors.push('site.html : compteurs/version désynchronisés (composants=' + count + ', version=' + version + ').');
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
    const site2 = transform(
      fs.readFileSync(SITE_PATH, 'utf8'),
      fs.readFileSync(ARCHITECTURE_PATH, 'utf8'),
      count,
      version
    );
    if (
      site2.site !== fs.readFileSync(SITE_PATH, 'utf8') ||
      site2.arch !== fs.readFileSync(ARCHITECTURE_PATH, 'utf8')
    ) {
      throw new Error('Idempotence KO — re-génération produit un résultat différent.');
    }

    console.log(
      '\n[OK] site.html + docs/ARCHITECTURE.md mis à jour — composants = ' + count + ', version = ' + version + '.'
    );
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] ' + err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
