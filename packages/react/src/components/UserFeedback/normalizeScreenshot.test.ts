// normalizeScreenshot.test.ts — 13 tests, ZÉRO canvas (#803).
//
// `planAttempts` est PUR : testé directement, sans aucun seam. `normalizeScreenshot`
// est testé via `decode`/`encode` INJECTÉS (factices) — jsdom n'implémente ni
// `canvas` ni `toBlob`, donc aucun de ces tests n'a besoin d'un vrai navigateur.

import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_DIMENSION,
  normalizeScreenshot,
  planAttempts,
  ScreenshotNormalizeError,
  type ScreenshotSource,
} from "./normalizeScreenshot";

/** Source factice — `drawable` n'est jamais déréférencé par les tests (encode est mocké). */
function fakeSource(
  width: number,
  height: number,
  drawable: unknown = null,
): ScreenshotSource {
  return { width, height, drawable: drawable as ScreenshotSource["drawable"] };
}

/** `decode` factice — ne touche jamais au DOM. */
function fakeDecode(width: number, height: number, drawable?: unknown) {
  return vi.fn(async () => fakeSource(width, height, drawable));
}

/** `encode` factice piloté par une file de tailles (en octets) à produire, dans l'ordre. */
function fakeEncodeSizes(sizes: number[]) {
  const queue = [...sizes];
  return vi.fn(async () => {
    const size = queue.shift();
    if (size === undefined) {
      throw new Error("fakeEncodeSizes: plus de taille programmée");
    }
    return new Blob([new Uint8Array(size)], { type: "image/webp" });
  });
}

describe("planAttempts — pur, sans canvas (#803)", () => {
  it("1. 3840×2160 / maxDimension 1600 → exactement les 5 tuples de la trace figée", () => {
    const attempts = planAttempts({
      width: 3840,
      height: 2160,
      maxDimension: 1600,
    });
    expect(attempts).toEqual([
      { width: 1600, height: 900, quality: 0.82 },
      { width: 1600, height: 900, quality: 0.65 },
      { width: 1200, height: 675, quality: 0.65 },
      { width: 880, height: 495, quality: 0.6 },
      { width: 640, height: 360, quality: 0.5 },
    ]);
  });

  it("2. image plus petite que maxDimension (800×600) → 1re tentative = 800×600 (jamais d'agrandissement)", () => {
    const attempts = planAttempts({
      width: 800,
      height: 600,
      maxDimension: 1600,
    });
    expect(attempts[0]).toEqual({ width: 800, height: 600, quality: 0.82 });
  });

  it("3. image 1×1 → aucune dimension < 1", () => {
    const attempts = planAttempts({ width: 1, height: 1, maxDimension: 1600 });
    for (const attempt of attempts) {
      expect(attempt.width).toBeGreaterThanOrEqual(1);
      expect(attempt.height).toBeGreaterThanOrEqual(1);
    }
  });

  it("4. invariant — toujours 5 tentatives, jamais croissantes (dimension ou qualité)", () => {
    const attempts = planAttempts({
      width: 3840,
      height: 2160,
      maxDimension: 1600,
    });
    expect(attempts).toHaveLength(5);
    for (let i = 1; i < attempts.length; i++) {
      expect(attempts[i].width).toBeLessThanOrEqual(attempts[i - 1].width);
      expect(attempts[i].height).toBeLessThanOrEqual(attempts[i - 1].height);
      expect(attempts[i].quality).toBeLessThanOrEqual(attempts[i - 1].quality);
    }
  });
});

describe("normalizeScreenshot — orchestration, decode/encode injectés (#803)", () => {
  it("5. court-circuit WebP déjà conforme (200 Ko, 800×600) → rend LA MÊME instance de File, encode jamais appelé", async () => {
    const file = new File([new Uint8Array(200 * 1024)], "deja-bon.webp", {
      type: "image/webp",
    });
    const decode = fakeDecode(800, 600);
    const encode = fakeEncodeSizes([]);

    const result = await normalizeScreenshot(file, { decode, encode });

    expect(result).toBe(file);
    expect(encode).not.toHaveBeenCalled();
  });

  it("6. gagne au 1er essai → 1 appel à encode, résultat type image/webp", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    const decode = fakeDecode(3840, 2160);
    const encode = fakeEncodeSizes([100 * 1024]);

    const result = await normalizeScreenshot(file, { decode, encode });

    expect(encode).toHaveBeenCalledTimes(1);
    expect(result.type).toBe("image/webp");
  });

  it("7. gagne au 3e essai (900/700/400 Ko) → 3 appels, résultat = 400 Ko", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    const decode = fakeDecode(3840, 2160);
    const encode = fakeEncodeSizes([900 * 1024, 700 * 1024, 400 * 1024]);

    const result = await normalizeScreenshot(file, { decode, encode });

    expect(encode).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(400 * 1024);
  });

  it("8. encode rend null → lève ScreenshotNormalizeError reason=unsupported, encode appelé UNE SEULE fois", async () => {
    const file = new File([new Uint8Array(1024)], "photo.png", {
      type: "image/png",
    });
    const decode = fakeDecode(800, 600);
    const encode = vi.fn(async () => null);

    const promise = normalizeScreenshot(file, { decode, encode });

    await expect(promise).rejects.toBeInstanceOf(ScreenshotNormalizeError);
    await expect(promise).rejects.toMatchObject({ reason: "unsupported" });
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("9. les 5 essais dépassent le plafond → lève reason=too-large, encode appelé EXACTEMENT 5 fois (borne prouvée)", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    const decode = fakeDecode(3840, 2160);
    const encode = fakeEncodeSizes([
      600 * 1024,
      600 * 1024,
      600 * 1024,
      600 * 1024,
      600 * 1024,
    ]);

    const promise = normalizeScreenshot(file, { decode, encode });

    await expect(promise).rejects.toBeInstanceOf(ScreenshotNormalizeError);
    await expect(promise).rejects.toMatchObject({ reason: "too-large" });
    expect(encode).toHaveBeenCalledTimes(5);
  });

  it("10. decode lève → reason=decode, encode jamais appelé", async () => {
    const file = new File([new Uint8Array(1024)], "photo.png", {
      type: "image/png",
    });
    const decode = vi.fn(async () => {
      throw new Error("boom");
    });
    const encode = fakeEncodeSizes([]);

    const promise = normalizeScreenshot(file, { decode, encode });

    await expect(promise).rejects.toBeInstanceOf(ScreenshotNormalizeError);
    await expect(promise).rejects.toMatchObject({ reason: "decode" });
    expect(encode).not.toHaveBeenCalled();
  });

  it("11. renommage — Capture 2026-08-03.png → Capture 2026-08-03.webp ; nom sans extension → <nom>.webp", async () => {
    const decode = fakeDecode(800, 600);

    const file1 = new File(
      [new Uint8Array(1024 * 1024)],
      "Capture 2026-08-03.png",
      { type: "image/png" },
    );
    const encode1 = fakeEncodeSizes([100 * 1024]);
    const result1 = await normalizeScreenshot(file1, {
      decode,
      encode: encode1,
    });
    expect(result1.name).toBe("Capture 2026-08-03.webp");

    const file2 = new File([new Uint8Array(1024 * 1024)], "sansextension", {
      type: "image/png",
    });
    const encode2 = fakeEncodeSizes([100 * 1024]);
    const result2 = await normalizeScreenshot(file2, {
      decode,
      encode: encode2,
    });
    expect(result2.name).toBe("sansextension.webp");
  });

  it("12. maxBytes/maxDimension surchargés (200 Ko / 800 px) → plan basé sur 800 px, seuil de succès à 200 Ko", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    const decode = fakeDecode(3840, 2160);
    let capturedWidth: number | null = null;
    const encode = vi.fn(async (_source, width: number) => {
      capturedWidth = width;
      return new Blob([new Uint8Array(150 * 1024)], { type: "image/webp" });
    });

    const result = await normalizeScreenshot(file, {
      decode,
      encode,
      maxBytes: 200 * 1024,
      maxDimension: 800,
    });

    expect(capturedWidth).toBe(800);
    expect(result.size).toBeLessThanOrEqual(200 * 1024);
  });

  it("13. libération mémoire — drawable.close() appelé, y compris quand la normalisation lève", async () => {
    const close = vi.fn();
    const decode = fakeDecode(800, 600, { close });
    const encodeOk = fakeEncodeSizes([100 * 1024]);

    const file = new File([new Uint8Array(1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    await normalizeScreenshot(file, { decode, encode: encodeOk });
    expect(close).toHaveBeenCalledTimes(1);

    close.mockClear();
    const encodeFail = vi.fn(async () => null);
    await expect(
      normalizeScreenshot(file, { decode, encode: encodeFail }),
    ).rejects.toBeInstanceOf(ScreenshotNormalizeError);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("normalizeScreenshot — constantes exportées (#803)", () => {
  it("DEFAULT_MAX_BYTES = 512 Ko, DEFAULT_MAX_DIMENSION = 1600 px", () => {
    expect(DEFAULT_MAX_BYTES).toBe(512 * 1024);
    expect(DEFAULT_MAX_DIMENSION).toBe(1600);
  });
});
