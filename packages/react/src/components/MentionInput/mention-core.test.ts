import { describe, it, expect } from "vitest";
import {
  applyMention,
  caretRectToDropdownStyle,
  detectMentionToken,
  filterMentions,
  normalizeSuggestion,
  splitAroundCaret,
  type NormalizedMention,
} from "./mention-core";

describe("MentionInput — mention-core (fonctions pures)", () => {
  describe("detectMentionToken", () => {
    it("détecte le @ en début de chaîne", () => {
      expect(detectMentionToken("@ali", 4)).toEqual({
        start: 0,
        end: 4,
        query: "ali",
      });
    });

    it("détecte le @ précédé d'un espace", () => {
      expect(detectMentionToken("bonjour @al", 11)).toEqual({
        start: 8,
        end: 11,
        query: "al",
      });
    });

    it("@ seul (query vide) ouvre quand même le dropdown", () => {
      expect(detectMentionToken("bonjour @", 9)).toEqual({
        start: 8,
        end: 9,
        query: "",
      });
    });

    it("@ collé à un mot n'est pas un token", () => {
      expect(detectMentionToken("mail@domaine", 12)).toBeNull();
    });

    it("caret avant la fin de la valeur reste dans le token", () => {
      expect(detectMentionToken("@ali suite", 4)).toEqual({
        start: 0,
        end: 4,
        query: "ali",
      });
    });

    it("un espace après le query clôt le token", () => {
      expect(detectMentionToken("@ali ", 5)).toBeNull();
    });

    it("limite connue : \\w n'accepte pas les accents (V4, NE PAS corriger silencieusement)", () => {
      expect(detectMentionToken("@émi", 4)).toBeNull();
    });
  });

  describe("filterMentions", () => {
    const items: NormalizedMention[] = [
      "Alice Martin",
      "Bob Durand",
      "Carla Nguyen",
    ].map((s) => normalizeSuggestion(s));

    it("filtre insensible à la casse", () => {
      expect(filterMentions(items, "AL").map((i) => i.value)).toEqual([
        "Alice Martin",
      ]);
    });

    it("matche aussi en milieu de chaîne", () => {
      expect(filterMentions(items, "rand").map((i) => i.value)).toEqual([
        "Bob Durand",
      ]);
    });

    it("query vide renvoie tout", () => {
      expect(filterMentions(items, "")).toHaveLength(3);
    });
  });

  describe("applyMention", () => {
    it("insère la mention + espace final, double espace assumé avant le reste (parité vanilla)", () => {
      const result = applyMention(
        "hey @al fin",
        { start: 4, end: 7, query: "al" },
        "Alice Martin",
      );
      expect(result).toEqual({
        value: "hey @Alice Martin  fin",
        caret: 18,
      });
    });

    it("insertion en fin de chaîne : espace final, caret = value.length", () => {
      const result = applyMention(
        "hey @al",
        { start: 4, end: 7, query: "al" },
        "Alice Martin",
      );
      expect(result.value.endsWith(" ")).toBe(true);
      expect(result.caret).toBe(result.value.length);
    });
  });

  describe("splitAroundCaret", () => {
    it("caret en fin de chaîne : marqueur de repli '.'", () => {
      expect(splitAroundCaret("abc", 3)).toEqual({
        before: "abc",
        marker: ".",
        after: "",
      });
    });

    it("caret au milieu : marqueur = caractère suivant", () => {
      expect(splitAroundCaret("abc", 1)).toEqual({
        before: "a",
        marker: "b",
        after: "c",
      });
    });
  });

  describe("caretRectToDropdownStyle", () => {
    it("sans scroll : top = top+height, left = left", () => {
      expect(
        caretRectToDropdownStyle({ top: 40, left: 12, height: 18 }, 0, 0),
      ).toEqual({ top: "58px", left: "12px" });
    });

    it("déduit le scroll", () => {
      expect(
        caretRectToDropdownStyle({ top: 40, left: 12, height: 18 }, 10, 4),
      ).toEqual({ top: "48px", left: "8px" });
    });
  });
});
