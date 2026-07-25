// dot.js — parseur maison d'un SOUS-ENSEMBLE de DOT/Graphviz (#664, I6 export/import)
// DOM-free, pur, testable Node. 0 dependance (perimetre #664 : "petit parseur
// maison"). Ne pretend PAS couvrir la grammaire DOT complete — cf. section
// "Non supporte" ci-dessous, documentee explicitement plutot que de mal-interpreter
// silencieusement (chaque construction non geree est soit une erreur propre (throw),
// soit ignoree + reportee dans `warnings[]`, JAMAIS un silence total).
//
// ---- Supporte ----
//   - En-tete `(strict )?(digraph|graph) NOM? {`
//   - Instructions noeud : `id;` ou `id [label="texte"];`
//   - Instructions arete : `a -> b;` (digraph) ou `a -- b;` (graph), avec
//     `[label="texte"]` optionnel. Noeuds crees IMPLICITEMENT s'ils n'ont pas de
//     declaration explicite (comportement Graphviz standard).
//   - Identifiants nus (`[A-Za-z_][\w]*`) ou entre guillemets (`"a b"`).
//   - Commentaires `// ligne` et `/* bloc */` (retires avant parsing).
//
// ---- NON supporte (documente, pas simule) ----
//   - `subgraph { ... }` / clusters — instruction ENTIEREMENT ignoree + warning.
//   - Attributs par defaut `node [...]` / `edge [...]` / `graph [...]` — ignores + warning.
//   - Attributs de graphe globaux isoles (`rankdir=LR;`) — ignores + warning.
//   - Chaines d'aretes `a -> b -> c` (plusieurs operateurs dans une seule
//     instruction) — instruction ENTIERE ignoree + warning (ecrire une arete par
//     instruction).
//   - Ports/compass (`a:port`, `a:port:n`) — le port est retire (le noeud de base
//     est conserve) + warning, jamais de throw.
//   - Attributs autres que `label` (color, shape, style, rankdir...) — ignores
//     individuellement, regroupes dans UN warning recapitulatif.
//   - HTML-like labels (`<...>`), commentaires `#`, `=` multi-lignes sans guillemets.
//   - Entree syntaxiquement invalide (pas d'en-tete `digraph`/`graph`, accolades non
//     equilibrees) -> `Error` levee explicitement (echec propre, pas de graphe partiel).

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Trouve l'index de l'accolade fermante correspondant a `openIdx` (str[openIdx] === '{'),
 * en ignorant le contenu des chaines entre guillemets. -1 si non equilibree. */
function findMatchingBrace(str, openIdx) {
  let depth = 0;
  let inString = false;
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (ch === '"' && str[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Decoupe un corps de graphe en instructions top-level, separees par `;` ou saut de
 * ligne — MAIS jamais a l'interieur d'une chaine entre guillemets, d'un bloc `{...}`
 * (subgraph) ou d'une liste d'attributs `[...]` multi-lignes (profondeur combinee). */
function splitStatements(body) {
  const statements = [];
  let buf = '';
  let depth = 0;
  let inString = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      buf += ch;
      if (ch === '"' && body[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      buf += ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      buf += ch;
      continue;
    }
    if (depth === 0 && (ch === ';' || ch === '\n')) {
      if (buf.trim()) statements.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) statements.push(buf.trim());
  return statements;
}

function unquote(raw) {
  const s = (raw || '').trim();
  const m = /^"((?:[^"\\]|\\.)*)"$/.exec(s);
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return s;
}

/** contenu d'un `[ ... ]` demarrant a `bracketIdx` (premier `]` rencontre — les
 * listes d'attributs DOT ne s'imbriquent pas, cf. limite documentee en tete). */
function extractBracketContent(stmt, bracketIdx) {
  const end = stmt.indexOf(']', bracketIdx);
  if (end === -1) return '';
  return stmt.slice(bracketIdx + 1, end);
}

/** Extrait les paires `key=value` d'un contenu d'attribut-list. Seul `label` est
 * porte ; les autres cles sont recensees dans `ignoredKeys` (warning recapitulatif
 * poste par l'appelant, evite le bruit d'un warning par attribut). */
function parseAttrList(content) {
  const result = { label: undefined, ignoredKeys: [] };
  if (!content) return result;
  const re = /([A-Za-z_][\w]*)\s*=\s*("(?:[^"\\]|\\.)*"|[^,\]\s]+)/g;
  let m;
  while ((m = re.exec(content))) {
    const key = m[1];
    const value = unquote(m[2]);
    if (key.toLowerCase() === 'label') result.label = value;
    else result.ignoredKeys.push(key);
  }
  return result;
}

/** Retire un suffixe `:port` ou `:port:compass` d'un identifiant (non supporte). */
function stripPort(id) {
  const idx = id.indexOf(':');
  if (idx === -1) return { id, hadPort: false };
  return { id: id.slice(0, idx), hadPort: true };
}

/**
 * @param {string} source - texte DOT complet
 * @returns {{nodes:Array, edges:Array, warnings:string[]}} GraphData nu (pret pour
 *   `new GraphModel(...)`) + avertissements des constructions ignorees (jamais
 *   silencieux, cf. en-tete).
 * @throws {Error} entree vide/non-textuelle, en-tete `digraph`/`graph` introuvable,
 *   ou accolades non equilibrees — echec PROPRE plutot qu'un graphe partiel/faux.
 */
export function parseDOT(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('parseDOT: entree vide ou non textuelle');
  }

  const stripped = stripComments(source);
  const headerRe = /(strict\s+)?(digraph|graph)\s*([A-Za-z_][\w]*|"(?:[^"\\]|\\.)*")?\s*\{/i;
  const headerMatch = headerRe.exec(stripped);
  if (!headerMatch) {
    throw new Error('parseDOT: en-tete "digraph"/"graph { ... }" introuvable (sous-ensemble non reconnu)');
  }

  const openIdx = headerMatch.index + headerMatch[0].length - 1;
  const closeIdx = findMatchingBrace(stripped, openIdx);
  if (closeIdx === -1) {
    throw new Error('parseDOT: accolades non equilibrees');
  }
  const body = stripped.slice(openIdx + 1, closeIdx);

  const warnings = [];
  const nodeOrder = [];
  const nodeLabels = new Map();
  const edgesRaw = [];
  const ignoredAttrKeys = new Set();

  function registerNode(rawToken) {
    const { id: stripped2, hadPort } = stripPort(unquote(rawToken));
    const id = stripped2.trim();
    if (!id) return '';
    if (hadPort) warnings.push(`parseDOT: port ("${rawToken.trim()}") non supporte, noeud conserve sans port`);
    if (!nodeOrder.includes(id)) nodeOrder.push(id);
    return id;
  }

  splitStatements(body).forEach((stmt) => {
    if (!stmt) return;

    if (/^(subgraph\b|\{)/i.test(stmt)) {
      warnings.push('parseDOT: sous-graphe ("subgraph { ... }") non supporte, instruction ignoree');
      return;
    }
    if (/^(node|edge|graph)\s*\[/i.test(stmt)) {
      const kw = /^(node|edge|graph)/i.exec(stmt)[1];
      warnings.push(`parseDOT: attributs par defaut ("${kw} [...]") non supportes, ignores`);
      return;
    }

    const bracketIdx = stmt.indexOf('[');
    const head = (bracketIdx === -1 ? stmt : stmt.slice(0, bracketIdx)).trim();
    const attrsContent = bracketIdx === -1 ? '' : extractBracketContent(stmt, bracketIdx);

    const opMatches = head.match(/->|--/g) || [];

    if (opMatches.length >= 2) {
      warnings.push(`parseDOT: chaine d'aretes ("${head}") non supportee (une seule arete par instruction), ignoree`);
      return;
    }

    if (opMatches.length === 1) {
      const op = opMatches[0];
      const idx = head.indexOf(op);
      const rawSource = head.slice(0, idx);
      const rawTarget = head.slice(idx + op.length);
      const source = registerNode(rawSource);
      const target = registerNode(rawTarget);
      if (!source || !target) {
        warnings.push(`parseDOT: arete mal formee ("${head}"), ignoree`);
        return;
      }
      const { label, ignoredKeys } = parseAttrList(attrsContent);
      ignoredKeys.forEach((k) => ignoredAttrKeys.add(k));
      edgesRaw.push({ source, target, directed: op === '->', label });
      return;
    }

    // Assignation d'attribut de graphe global isolee (ex. `rankdir=LR;`) : un seul
    // '=', pas de '[' — distincte d'une instruction noeud simple (qui n'a pas de '=').
    if (!attrsContent && /^[A-Za-z_][\w]*\s*=\s*\S+$/.test(head)) {
      warnings.push(`parseDOT: attribut de graphe global ("${head}") non supporte, ignore`);
      return;
    }

    // Instruction noeud simple, avec attribut-list optionnelle.
    const id = registerNode(head);
    if (!id) return; // instruction vide/blanche apres nettoyage
    const { label, ignoredKeys } = parseAttrList(attrsContent);
    ignoredKeys.forEach((k) => ignoredAttrKeys.add(k));
    if (label != null) nodeLabels.set(id, label);
  });

  if (ignoredAttrKeys.size) {
    warnings.push(`parseDOT: attribut(s) ignore(s) (seul "label" est supporte) : ${Array.from(ignoredAttrKeys).join(', ')}`);
  }

  const nodes = nodeOrder.map((id) => ({ data: nodeLabels.has(id) ? { id, label: nodeLabels.get(id) } : { id } }));
  const edges = edgesRaw.map((e) => ({
    data: { source: e.source, target: e.target, directed: e.directed, ...(e.label != null ? { label: e.label } : {}) },
  }));

  return { nodes, edges, warnings };
}
