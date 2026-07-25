// schema.js — schemaVersion + point d'entree de migration au load (#664, I6 export/import)
// DOM-free, pur, testable Node (meme idiome que model/to-model.js).
//
// Le format de serialisation JSON du moteur (GraphModel#toJSON()) etait "PROVISOIRE"
// depuis #658/#665 ("schemaVersion PROVISOIRE — non fige avant round-trip nexus").
// #664 fige explicitement CURRENT_SCHEMA_VERSION = 1 (re-export de
// model/to-model.js#SCHEMA_VERSION, SOURCE UNIQUE — pas de 2e constante qui pourrait
// diverger) et ajoute le CROCHET de migration : meme si aucune migration n'est encore
// connue (V1 unique a ce jour), le point d'entree existe pour la 1re evolution de
// format SANS reecrire les appelants (importGraphJSON(), cf. json.js).
import { SCHEMA_VERSION } from '../model/to-model.js';

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION; // = 1, fige (#664)

/**
 * Mapping schemaVersion -> fonction de migration vers schemaVersion+1.
 * AUCUNE entree a ce jour (V1 unique). Exemple de forme attendue pour une future
 * migration 1 -> 2 : `MIGRATIONS[1] = (data) => ({ ...data, nodes: data.nodes.map(...) })`.
 * @type {Object<number, (data:Object)=>Object>}
 */
const MIGRATIONS = {};

/**
 * Applique la chaine de migrations connue jusqu'a CURRENT_SCHEMA_VERSION. Ne leve
 * jamais d'exception :
 *   - schemaVersion absent -> traite comme CURRENT_SCHEMA_VERSION (meme defaut que
 *     toModel(), cf. model/to-model.js).
 *   - schemaVersion CONNU mais < CURRENT -> migrations appliquees en chaine.
 *   - schemaVersion > CURRENT (format plus recent que ce build) OU palier de
 *     migration inconnu -> renvoye TEL QUEL (GraphModel reste "forward-tolerant",
 *     cf. graph-model.js invariants). Pas de perte de donnees silencieuse : les cles
 *     inconnues du pivot restent portees par `data{}` (semantique libre du modele).
 * @param {Object} data - GraphData brut (potentiellement schemaVersion ancien)
 * @returns {Object} GraphData migre — nouvel objet, jamais de mutation en place
 */
export function migrateGraphData(data) {
  const src = data && typeof data === 'object' ? data : {};
  let version = typeof src.schemaVersion === 'number' ? src.schemaVersion : CURRENT_SCHEMA_VERSION;
  let out = { ...src, schemaVersion: version };
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (typeof step !== 'function') break; // palier inconnu -> arrete, laisse forward-tolerant
    out = { ...step(out), schemaVersion: version + 1 };
    version += 1;
  }
  return out;
}
