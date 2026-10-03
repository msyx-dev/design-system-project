import { test, expect } from "@playwright/test";

const PAGES = [
  { slug: "fondation", path: "/pages/fondation.html", title: "Fondation" },
  { slug: "composants", path: "/pages/composants.html", title: "Composants" },
  { slug: "navigation", path: "/pages/navigation.html", title: "Navigation" },
  {
    slug: "formulaires",
    path: "/pages/formulaires.html",
    title: "Formulaires",
  },
  { slug: "data", path: "/pages/data.html", title: "Data" },
  { slug: "templates", path: "/pages/templates.html", title: "Templates" },
  { slug: "feedback", path: "/pages/feedback.html", title: "Feedback" },
  {
    slug: "user-feedback",
    path: "/pages/user-feedback.html",
    title: "User Feedback",
  },
  { slug: "overlays", path: "/pages/overlays.html", title: "Overlays" },
  // divers.html : le <title> du <head> est "Avancé — msyx.design" (et non "Divers")
  { slug: "divers", path: "/pages/divers.html", title: "Avancé" },
] as const;

// Matrice : 10 pages x 10 projets (#851 — MSYX 4 projects x toutes sections,
// ACSSI/Nhood/Auchan 2 projects desktop x sections sentinelles, cf.
// SENTINEL_SECTIONS plus bas). Depuis #286, capture PAR SECTION (fullPage
// retiré — hauteur fullPage non déterministe sur pages longues).
// Naming baseline : <slug>__<section-id>.png
// Le titre attendu sert de garde-fou anti-régression Bug 1 (#286) : si le
// harness retombe sur index.html, l'assertion de titre echoue immediatement.

type Theme = "msyx" | "acssi" | "nhood" | "auchan" | "noel";
type Mode = "dark" | "light";

const parseProjectName = (name: string): { theme: Theme; mode: Mode } => {
  const parts = name.split("-");
  return { theme: parts[0] as Theme, mode: parts[1] as Mode };
};

// --- Matrice reduite (#851) ---
// MSYX (theme de reference) capture TOUTES les sections de chaque page —
// aucune perte de couverture. Les themes secondaires (ACSSI/Nhood/Auchan)
// ne capturent que les sections "sentinelles" listees ici : celles ou un
// token de theme peut s'exprimer STRUCTURELLEMENT (une taille, une bordure,
// un espacement qui varie) — le seul risque que la VR couvre et que rien
// d'autre ne couvre. Le contraste, la completude des tokens et la
// separabilite des teintes ne sont PAS des criteres de selection : deja
// couverts par bin/check-categorical-palette.js + les audits a11y.
// Regle complete + comment etendre a un futur theme : docs/DS-PRINCIPLES.md §VR.
const SENTINEL_SECTIONS: Partial<
  Record<(typeof PAGES)[number]["slug"], string[]>
> = {
  fondation: ["colors", "palette-categorielle", "theming"],
  composants: [
    "buttons",
    "split-button",
    "badges",
    "chips",
    "cards",
    "card-media",
    "segmented-control",
  ],
  navigation: ["action-menu"],
  formulaires: ["inputs", "controls", "calendar"],
  data: ["charts", "pie-donut"],
  templates: ["pricing"],
  feedback: ["alerts"],
  overlays: ["modals"],
  divers: ["diff-viewer"],
  // user-feedback : aucune section sentinelle — la page ne comporte que
  // #user-feedback-intro et #user-feedback-flow, deja couvertes par les
  // sentinelles inputs/modals sur d'autres pages (#851).
};

const setThemeAndMode = async (
  page: import("@playwright/test").Page,
  theme: Theme,
  mode: Mode,
) => {
  await page.addInitScript(
    ({ t, m }: { t: string; m: string }) => {
      try {
        localStorage.setItem("msyx-theme", t);
        localStorage.setItem("msyx-mode", m);
      } catch {}
    },
    { t: theme, m: mode },
  );
};

// --- Garde-fou stabilité VR (#286) ---
// `animations: "disabled"` (playwright.config.ts) ne neutralise QUE les
// animations CSS. Le carrousel (divers.html #carousel) tourne via JS
// (components.js initCarousel, data-autoplay) → impossible de capturer
// deux screenshots consécutifs stables ("Failed to take two consecutive
// stable screenshots"). On retire data-autoplay AVANT l'init JS pour
// figer le carrousel sur la 1re slide, de façon déterministe, sans
// masquer le composant (la VR couvre toujours le carrousel).
const freezeJsAnimations = async (page: import("@playwright/test").Page) => {
  await page.addInitScript(() => {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        document
          .querySelectorAll<HTMLElement>(".carousel[data-autoplay]")
          .forEach((c) => c.removeAttribute("data-autoplay"));
        // Animated counters (.counter[data-target]) : la valeur affichée
        // dépend de la frame de capture (animation JS 0→cible, non figée par
        // animations:"disabled" qui ne touche que CSS/WAAPI). On pré-règle la
        // valeur FINALE + data-counted='true' AVANT initAnimatedCounters :
        // son observer voit counted=true → skip → baseline déterministe
        // (chiffres finaux, représentatifs). Anti-flaky VR #515.
        document
          .querySelectorAll<HTMLElement>(".counter[data-target]")
          .forEach((c) => {
            const target = parseFloat(c.dataset.target || "0");
            const decimals = parseInt(c.dataset.decimals || "0", 10);
            const valueEl = c.querySelector<HTMLElement>(".counter-value");
            if (valueEl) {
              valueEl.textContent =
                decimals > 0
                  ? target.toFixed(decimals)
                  : Math.floor(target).toString();
            }
            c.dataset.counted = "true";
          });
      },
      { once: true },
    );
  });
};

// --- Décor festif figé (#998) ---
// Thème Noël : le décor (shared/nav.js ensureFestiveDecor) recouvre les sections
// capturées — sapin `.festive-character` + lumières `.tree-lights`, guirlande
// `.garland-bulb`, ornements `.ornament`, neige `.snowfall::before/::after`
// (shared/css/components/festive.css : animations `infinite`, la plupart avec
// `animation-delay`, dont `characterBob`/`snowfallDrift` pilotées en translate/
// transform). `animations: "disabled"` ne les neutralise pas de façon fiable :
// Playwright appelle `Animation.cancel()` sur chaque animation infinie à
// l'instant de la capture puis `Animation.play()` au nettoyage
// (playwright-core/lib/server/screenshotter.js, `infiniteAnimationsToResume`) —
// l'état capturé dépend donc de la course entre ce cancel et le rendu, et
// varie d'une exécution à l'autre (mesure : 3 captures distinctes du sapin
// sur 40 sous `animations:"disabled"`, cf. PR #998).
// On RETIRE donc les animations du décor de la feuille de style (`animation:
// none`) au lieu de compter sur le cancel : l'état est alors une pure fonction
// du CSS — celui du repos sans animation, qui est l'état qu'un cancel réussi
// produit. Le décor reste VISIBLE (aucun `display:none`) : seules les animations
// sont retirées, la VR couvre toujours sa forme et ses couleurs.
// Sélecteurs ciblés (pas de `*`) : les autres animations du DS gardent le
// traitement `animations: "disabled"` inchangé, leurs baselines aussi.
const FESTIVE_DECOR_SELECTORS = [
  ".snowfall",
  ".snowfall::before",
  ".snowfall::after",
  ".garland-bulb",
  ".ornament",
  ".festive-character",
  ".tree-lights circle",
];
const FESTIVE_CLOSEST =
  "#ds-festive-decor, .snowfall, .garland, .ornaments, .festive-character, .tree-lights";

const freezeFestiveDecor = async (page: import("@playwright/test").Page) => {
  await page.addStyleTag({
    content: `${FESTIVE_DECOR_SELECTORS.join(",\n")} { animation: none !important; }`,
  });
  // Garde-fou : si festive.css gagne une animation sur une classe que la liste
  // ci-dessus ne couvre pas, on échoue ICI au lieu de réintroduire en silence
  // une capture non déterministe (même esprit que neutralizeVersionBadge, #977).
  const stillAnimated = await page.evaluate((closest) => {
    return document
      .getAnimations()
      .filter((a) => {
        if (!(a instanceof CSSAnimation)) return false;
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && !!target.closest(closest);
      })
      .map((a) => (a as CSSAnimation).animationName);
  }, FESTIVE_CLOSEST);
  expect(
    stillAnimated,
    "décor festif : animation(s) encore active(s) après freezeFestiveDecor — FESTIVE_DECOR_SELECTORS a dérivé de festive.css (#998)",
  ).toEqual([]);
};

// --- Indicateur de segmented figé (#1021) ---
// `.segmented-indicator` est positionné en JS (shared/components.js
// initSegmentedControls : `width` + `transform` mesurés sur l'item actif) puis
// animé par `transition: transform/width 0.3s` (navigation.css). Deux sources de
// non-déterminisme pour la capture `composants#segmented-control` :
// 1. la transition : `animations: "disabled"` de Playwright ne neutralise que les
//    animations en cours à l'instant de la capture, pas la valeur d'arrivée d'une
//    transition relancée après coup (resynchronisation tardive) — on la RETIRE
//    donc de la feuille de style (`transition: none`), comme `freezeFestiveDecor`
//    (#998) retire les animations du décor ;
// 2. la mesure : la largeur d'un item dépend de la police web (font-display:swap).
//    Mesurée avant le swap, l'indicateur gardait la largeur de la police de repli
//    (mesuré en CI : seul le bord droit de l'indicateur variait, 13 à 31 px de
//    large, 7 à 9 fois plus sur ACSSI/Montserrat). Le composant se resynchronise
//    désormais par ResizeObserver ; le banc NE recalcule PAS la géométrie à sa
//    place (cela masquerait un défaut produit), il CONTRÔLE que l'indicateur
//    coïncide avec l'item actif et échoue bruyamment sinon.
// Contrat repris par #1016 (mode « liens ») : si le lien courant est marqué
// autrement que par `.active` (ex. `aria-current`), étendre SEGMENTED_ACTIVE_SELECTOR
// (liste de sélecteurs) au lieu de contourner le garde-fou.
const SEGMENTED_INDICATOR_SELECTOR = ".segmented-indicator";
const SEGMENTED_ACTIVE_SELECTOR = ".segmented-item.active";
const SEGMENTED_INDICATOR_TOLERANCE_PX = 1;

const freezeSegmentedIndicators = async (
  page: import("@playwright/test").Page,
) => {
  await page.addStyleTag({
    content: `${SEGMENTED_INDICATOR_SELECTOR} { transition: none !important; }`,
  });
  const drift = await page.evaluate(
    async ({ ind, act, tol }) => {
      // Deux frames : laisse passer les callbacks ResizeObserver en attente
      // (livrés au rendu) avant de mesurer — sinon on contrôlerait l'état
      // d'avant la resynchronisation, pas l'état qui sera capturé.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return Array.from(document.querySelectorAll(".segmented")).flatMap(
        (seg) => {
          const i = seg.querySelector(`:scope > ${ind}`);
          const a = seg.querySelector(act);
          if (!i || !a) return [];
          const ri = i.getBoundingClientRect();
          const ra = a.getBoundingClientRect();
          const dw = Math.abs(ri.width - ra.width);
          const dx = Math.abs(ri.left - ra.left);
          return dw > tol || dx > tol
            ? [
                `${seg.getAttribute("aria-label")}: dw=${dw.toFixed(1)} dx=${dx.toFixed(1)}`,
              ]
            : [];
        },
      );
    },
    {
      ind: SEGMENTED_INDICATOR_SELECTOR,
      act: SEGMENTED_ACTIVE_SELECTOR,
      tol: SEGMENTED_INDICATOR_TOLERANCE_PX,
    },
  );
  expect(
    drift,
    "segmented-control : indicateur désaligné de l'item actif avant capture (#1021)",
  ).toEqual([]);
};

test.describe("Visual regression — full matrix (par section)", () => {
  for (const { slug, path, title } of PAGES) {
    test(`${slug}`, async ({ page }, testInfo) => {
      // Une page = N captures de section (jusqu'à ~18 sur feedback.html).
      // Le défaut 30s est trop court pour les pages longues → timeout.
      // 120s couvre la page la plus dense avec marge (ce n'est PAS un
      // élargissement de tolérance de diff, juste un budget temps réaliste).
      test.setTimeout(120_000);

      const { theme, mode } = parseProjectName(testInfo.project.name);
      const isReferenceMatrix = theme === "msyx";
      const sentinels = SENTINEL_SECTIONS[slug] ?? [];

      // #851 : theme secondaire sans section sentinelle sur cette page —
      // aucune capture possible, inutile de charger la page.
      test.skip(
        !isReferenceMatrix && sentinels.length === 0,
        `${slug} : aucune section sentinelle pour ce theme secondaire (#851)`,
      );

      await setThemeAndMode(page, theme, mode);
      await freezeJsAnimations(page);
      await page.goto(path, { waitUntil: "networkidle" });

      // Fix tooling VR (#669) : masque le header fixe (.site-header) — son badge de version
      // churnait les captures des sections plus hautes que le viewport a chaque bump.
      await page.addStyleTag({
        content: ".site-header { display: none !important; }",
      });
      await freezeFestiveDecor(page);

      // --- Garde-fou anti-régression Bug 1 (#286) ---
      // index.html a un <title> different : si le flag -s revient ou que
      // serve.json est mal configure, ce test echoue ICI, pas en silence.
      // Pattern de titre DS : "<Titre> — msyx.design". On ancre sur "<Titre> —"
      // (et non \b : "Avancé" finit par "é", non-\w → \b ne matche pas).
      await expect(page).toHaveTitle(new RegExp(`^${title} —`));

      await page.waitForFunction(
        () => document.fonts && document.fonts.status === "loaded",
      );
      // Stabilisation : laisse le scroll-spy + lazy-init JS se poser
      await page.waitForTimeout(300);

      // #1021 : indicateur de segmented sans transition + contrôle de cohérence
      // géométrique avant capture (no-op sur les pages sans indicateur).
      await freezeSegmentedIndicators(page);

      // Énumère toutes les sections de la page (pattern HTML stable :
      // .main > section[id]). Une baseline par section.
      const sectionIds = await page
        .locator(".main > section[id]")
        .evaluateAll((els) => els.map((e) => e.id));

      expect(
        sectionIds.length,
        `${slug} : aucune <section id> trouvée — page mal chargée ?`,
      ).toBeGreaterThan(0);

      // #851 : MSYX capture toutes les sections (matrice de référence).
      // Thèmes secondaires : uniquement les sections sentinelles — garde-fou
      // explicite si SENTINEL_SECTIONS dérive du DOM réel (id renommé/retiré).
      let idsToCapture = sectionIds;
      if (!isReferenceMatrix) {
        for (const id of sentinels) {
          expect(
            sectionIds,
            `${slug} : section sentinelle "${id}" introuvable dans le DOM — SENTINEL_SECTIONS a dérivé (#851)`,
          ).toContain(id);
        }
        idsToCapture = sectionIds.filter((id) => sentinels.includes(id));
      }

      for (const sectionId of idsToCapture) {
        const section = page.locator(`#${sectionId}`);
        await section.scrollIntoViewIfNeeded();

        // --- Garde-fou stabilité dimensionnelle (#286) ---
        // Certaines sections (ex. feedback.html #alerts) voient leur
        // hauteur de rendu osciller de ±1-3 px entre deux frames (settle
        // sub-pixel tardif après scroll/fonts). toHaveScreenshot échoue
        // alors en "Failed to take two consecutive stable screenshots".
        // On attend ici que la hauteur soit identique sur 2 mesures
        // consécutives avant de capturer : stabilisation déterministe,
        // ciblée, SANS toucher threshold/maxDiffPixels/maxDiffPixelRatio.
        let prevH = -1;
        for (let i = 0; i < 10; i++) {
          const box = await section.boundingBox();
          const h = box ? Math.round(box.height) : -1;
          if (h === prevH) break;
          prevH = h;
          await page.waitForTimeout(120);
        }

        // #795 : expect.soft (pas expect dur) — la modif de pages/fondation.html
        // #utilities change sa hauteur de baseline ; un expect dur interromprait
        // la boucle et empêcherait la vérification des sections suivantes de
        // cette page sur ce run (cascade documentée dans le runbook VR du repo).
        await expect
          .soft(section)
          .toHaveScreenshot(`${slug}__${sectionId}.png`, {
            // Marge de temps pour les sections denses (le défaut 5s peut être
            // juste sur une section très haute) — pas un élargissement de
            // tolérance de diff, juste un budget de retry réaliste.
            timeout: 15_000,
          });
      }
    });
  }
});

// --- Capture dédiée du header (#977) ---
// Les captures de sections masquent .site-header (#669, plus haut) : sans ce
// bloc, le header n'est couvert par aucun test visuel. Recensement #977 : le
// seul élément du header qui varie d'un run à l'autre est le numéro du badge
// de version (const VERSION, shared/nav.js, rendu en nœud texte direct du
// bouton .header-version-badge). On remplace ce texte par une constante AVANT
// la capture : la largeur du badge ne dépend plus de la version, rien ne bouge.
// `mask` de Playwright est écarté volontairement : sa boîte couvre la boîte
// RÉELLE du badge, dont la largeur suit la chaîne de version (2.99 → 2.100,
// police proportionnelle) — une release suffirait à dépasser maxDiffPixels.
const HEADER_VERSION_PLACEHOLDER = "v0.0.0";

const neutralizeVersionBadge = async (
  page: import("@playwright/test").Page,
) => {
  const replaced = await page.evaluate((placeholder) => {
    const badge = document.querySelector(".site-header .header-version-badge");
    if (!badge) return 0;
    let count = 0;
    badge.childNodes.forEach((node) => {
      if (
        node.nodeType === Node.TEXT_NODE &&
        /^\s*v\d+\.\d+\.\d+/.test(node.textContent ?? "")
      ) {
        node.textContent = placeholder;
        count++;
      }
    });
    return count;
  }, HEADER_VERSION_PLACEHOLDER);
  // Garde-fou : si nav.js restructure le badge (numéro déplacé dans un <span>,
  // badge retiré…), on échoue ICI au lieu de capturer le vrai numéro en silence.
  expect(
    replaced,
    "header : numéro de version introuvable dans .header-version-badge — neutralizeVersionBadge a dérivé de shared/nav.js (#977)",
  ).toBe(1);
};

test.describe("Visual regression — header (#977)", () => {
  test("header", async ({ page }, testInfo) => {
    const { theme, mode } = parseProjectName(testInfo.project.name);
    // Matrice de référence MSYX uniquement (dark/light × desktop/mobile) —
    // le header mobile diffère réellement (layout.css, compaction < 640px).
    test.skip(
      theme !== "msyx",
      "header : capturé sur la matrice de référence MSYX uniquement (#977)",
    );

    await setThemeAndMode(page, theme, mode);
    // Page support : config MSYX_HEADER statique (user 'Preview', count 3).
    await page.goto("/pages/navigation.html", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/^Navigation —/);
    await page.waitForFunction(
      () => document.fonts && document.fonts.status === "loaded",
    );
    await page.waitForTimeout(300);

    // Header fixe + backdrop-filter : on capture à scrollY = 0, sans scroll.
    await neutralizeVersionBadge(page);

    await expect
      .soft(page.locator(".site-header"))
      .toHaveScreenshot("header__site-header.png", { timeout: 15_000 });
  });
});
