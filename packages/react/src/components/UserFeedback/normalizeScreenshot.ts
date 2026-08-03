// normalizeScreenshot.ts — normalisation de la pièce jointe du feedback (#803)
//
// DOM-ONLY dans les CORPS de fonctions (createImageBitmap, <canvas>, toBlob) —
// AUCUN accès DOM au CHARGEMENT du module, donc importable sous Node/jsdom sans
// polyfill (même règle que shared/graph/io/export-png.js).
//
// Découpage volontaire (critère d'acceptation #803) : `planAttempts()` est PUR et
// testable sans canvas ; `decode`/`encode` sont INJECTABLES. jsdom n'implémente ni
// canvas ni toBlob : sans ce seam, l'algorithme serait intestable.

/** Plafond de taille du fichier PRODUIT (512 Ko) — imposé par #803. */
export const DEFAULT_MAX_BYTES = 512 * 1024;
/** Plus grand côté maximum du fichier produit, en pixels. */
export const DEFAULT_MAX_DIMENSION = 1600;
/** Format cible — NON configurable (c'est le sujet même de #803). */
export const TARGET_MIME = "image/webp";

/**
 * Échelle de tentatives : BORNÉE (5 encodages max) et déterministe. Un ajustement
 * piloté par la taille mesurée (dichotomie sur la qualité) serait plus « optimal »
 * mais non reproductible en test et sans borne de latence — sur une capture 4K,
 * chaque encodage coûte ~100 ms.
 */
const LADDER: ReadonlyArray<{ scale: number; quality: number }> = [
  { scale: 1, quality: 0.82 },
  { scale: 1, quality: 0.65 },
  { scale: 0.75, quality: 0.65 },
  { scale: 0.55, quality: 0.6 },
  { scale: 0.4, quality: 0.5 },
];

export interface ScreenshotAttempt {
  width: number;
  height: number;
  quality: number;
}

/** Cause d'échec — pilote le message utilisateur, PAS un canal consumer. */
export type ScreenshotFailureReason = "decode" | "unsupported" | "too-large";

export class ScreenshotNormalizeError extends Error {
  readonly reason: ScreenshotFailureReason;
  constructor(reason: ScreenshotFailureReason, message: string) {
    super(message);
    this.name = "ScreenshotNormalizeError";
    this.reason = reason;
  }
}

/** Source décodée : dimensions intrinsèques + surface dessinable. */
export interface ScreenshotSource {
  width: number;
  height: number;
  drawable: CanvasImageSource;
}

/** Réglages exposés aux consumers (prop `normalizeScreenshot`). */
export interface ScreenshotNormalizeConfig {
  /** Plafond de taille du fichier produit, en octets. @default 512 * 1024 */
  maxBytes?: number;
  /** Plus grand côté maximum, en pixels. @default 1600 */
  maxDimension?: number;
}

export interface ScreenshotNormalizeOptions extends ScreenshotNormalizeConfig {
  /** @internal seam de test — décode le fichier. Défaut : createImageBitmap / <img>. */
  decode?: (file: Blob) => Promise<ScreenshotSource>;
  /**
   * @internal seam de test — encode en WebP aux dimensions demandées.
   * DOIT rendre `null` si le navigateur n'a pas produit du WebP.
   */
  encode?: (
    source: ScreenshotSource,
    width: number,
    height: number,
    quality: number,
  ) => Promise<Blob | null>;
}

/**
 * PUR — calcule la suite de tentatives pour une image de `width`×`height`.
 * Le premier palier applique le cadrage `maxDimension` (l'image n'est jamais
 * agrandie : `fit` est plafonné à 1), les suivants réduisent dimension et qualité.
 * Aucune dimension ne descend sous 1 px.
 */
export function planAttempts({
  width,
  height,
  maxDimension,
}: {
  width: number;
  height: number;
  maxDimension: number;
}): ScreenshotAttempt[] {
  const longest = Math.max(width, height);
  const fit = longest > maxDimension ? maxDimension / longest : 1;
  const baseW = Math.max(1, Math.round(width * fit));
  const baseH = Math.max(1, Math.round(height * fit));
  return LADDER.map(({ scale, quality }) => ({
    width: Math.max(1, Math.round(baseW * scale)),
    height: Math.max(1, Math.round(baseH * scale)),
    quality,
  }));
}

/** `photo.png` → `photo.webp` ; un nom sans extension reçoit simplement `.webp`. */
function toWebpFile(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^./\\]+$/, "") || "capture";
  return new File([blob], `${base}.webp`, { type: TARGET_MIME });
}

/**
 * Normalise une pièce jointe image en WebP redimensionné sous `maxBytes`.
 *
 * Rend un `File` (jamais un `Blob` nu) : `.name`/`.type` restent exploitables par
 * les consumers qui font `formData.append('f', screenshot, screenshot.name)`.
 * Lève `ScreenshotNormalizeError` sur les 3 causes d'échec — l'appelant NE DOIT PAS
 * retomber sur le fichier brut (cf. décision 5 du groom).
 */
export async function normalizeScreenshot(
  file: File,
  options: ScreenshotNormalizeOptions = {},
): Promise<File> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const decode = options.decode ?? decodeImage;
  const encode = options.encode ?? encodeWebp;

  let source: ScreenshotSource;
  try {
    source = await decode(file);
  } catch {
    throw new ScreenshotNormalizeError("decode", "Image illisible.");
  }

  try {
    // Court-circuit : déjà conforme → aucun ré-encodage (pas de perte de génération).
    if (
      file.type === TARGET_MIME &&
      file.size <= maxBytes &&
      Math.max(source.width, source.height) <= maxDimension
    ) {
      return file;
    }

    const attempts = planAttempts({
      width: source.width,
      height: source.height,
      maxDimension,
    });

    for (const attempt of attempts) {
      const blob = await encode(
        source,
        attempt.width,
        attempt.height,
        attempt.quality,
      );
      // `null` = le navigateur n'a pas produit du WebP. Inutile d'itérer : la
      // cause est le format, pas la taille.
      if (blob === null) {
        throw new ScreenshotNormalizeError(
          "unsupported",
          "Encodage WebP non pris en charge par ce navigateur.",
        );
      }
      if (blob.size <= maxBytes) return toWebpFile(blob, file.name);
    }

    throw new ScreenshotNormalizeError(
      "too-large",
      "Plafond inatteignable après réduction.",
    );
  } finally {
    // Un ImageBitmap 4K immobilise ~33 Mo — libéré quel que soit le chemin de sortie.
    const drawable = source.drawable as { close?: () => void };
    if (typeof drawable?.close === "function") drawable.close();
  }
}

// ─── Implémentations navigateur (défauts) ────────────────────────────────────

async function decodeImage(file: Blob): Promise<ScreenshotSource> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, drawable: bitmap };
  }
  // Repli <img> (navigateurs sans createImageBitmap, ex. Safari < 15).
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<ScreenshotSource>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          drawable: img,
        });
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function encodeWebp(
  source: ScreenshotSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source.drawable, 0, 0, width, height);
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      // ⚠️ La spec HTML impose au navigateur de retomber sur `image/png` quand le
      // type demandé est inconnu — `toBlob` ne rend PAS `null`. Sans le contrôle
      // de `blob.type`, on livrerait un PNG étiqueté WebP : exactement le défaut
      // dénoncé par #803.
      (blob) => resolve(blob && blob.type === TARGET_MIME ? blob : null),
      TARGET_MIME,
      quality,
    );
  });
}
