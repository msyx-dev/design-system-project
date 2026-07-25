// json.js — round-trip JSON versionne, format pivot natif du moteur (#664, I6)
// DOM-free, pur. `import(export(model)) ≡ model` : GraphModel#toJSON() garantit deja
// un deep-clone exact (#665, enrichi #675 pour l'historique) ; ce module assemble
// export (toJSON) + import (migration + constructeur, lui-meme lenient via toModel())
// derriere une API IO nommee explicitement pour les consumers (#664).
import { GraphModel } from '../model/index.js';
import { migrateGraphData, CURRENT_SCHEMA_VERSION } from './schema.js';

export { CURRENT_SCHEMA_VERSION, migrateGraphData };

/**
 * @param {GraphModel} model
 * @returns {Object} GraphData JSON-serialisable, deep-clone (delegue a GraphModel#toJSON()).
 * @throws {TypeError} si `model` n'est pas une instance de GraphModel
 */
export function exportGraphJSON(model) {
  if (!(model instanceof GraphModel)) {
    throw new TypeError('exportGraphJSON(model) attend une instance de GraphModel');
  }
  return model.toJSON();
}

/**
 * @param {Object} data - GraphData (JSON pivot, potentiellement schemaVersion ancien)
 * @returns {GraphModel} nouvelle instance — migree si necessaire (cf. schema.js),
 *   puis normalisee de facon lenient par le constructeur GraphModel (toModel()).
 */
export function importGraphJSON(data) {
  return new GraphModel(migrateGraphData(data));
}
