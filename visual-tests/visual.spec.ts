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

type Theme = "msyx" | "acssi" | "nhood" | "auchan";
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
        // ciblée, SANS toucher threshold/maxDiffPixelRatio.
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
