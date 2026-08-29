import { KeyboardEvent, ReactNode } from "react";

export interface PricingFeature {
  /** Clé React. */
  id: string;
  /** Libellé de la feature (`.pricing-feature`). */
  label: ReactNode;
  /**
   * Icône affichée dans `.pricing-feature-icon` — composez `<Icon name="check">`
   * (le glyphe "x" n'existe pas dans le primitif `Icon` interne, #713 : aucune
   * icône de croix dans `IconName`) ou toute icône de votre choix. Obligatoire :
   * le composant reste data-driven, il ne décide jamais quelle icône représente
   * une feature activée/désactivée.
   */
  icon: ReactNode;
  /** `.pricing-feature--disabled` — feature non incluse dans le plan. */
  disabled?: boolean;
}

export interface PricingPlan {
  /** Clé React. */
  id: string;
  /** `.pricing-plan` (nom du plan, ex. "Pro"). */
  name: ReactNode;
  /** Montant affiché en facturation mensuelle. */
  priceMonthly: number;
  /** Montant affiché en facturation annuelle (équivalent mensuel remisé). */
  priceYearly: number;
  /** `.pricing-desc`. */
  description?: ReactNode;
  features: PricingFeature[];
  /**
   * Contenu de `.pricing-cta` — composez `<Button variant="primary" fullWidth>`
   * ou `<Button variant="secondary" fullWidth>` (déjà portés, `fullWidth`
   * pose `width:100%` — identique à `style="width:100%;"` du vanilla).
   */
  cta: ReactNode;
  /** `.pricing-card--recommended` + `.pricing-card-badge`. */
  recommended?: boolean;
  /** Libellé du badge recommandé. @default "Recommandé" (ignoré si `recommended` est faux). */
  recommendedLabel?: ReactNode;
  /** Symbole/texte devant le montant (`.pricing-price-currency`). @default "€" */
  currency?: ReactNode;
  /** Suffixe après le montant (`.pricing-price-period`), identique quel que soit le mode. @default "/ mois" */
  period?: ReactNode;
}

export interface PricingProps {
  plans: PricingPlan[];
  /** Mode annuel actif — piloté par le parent, aucun état interne. */
  yearly: boolean;
  /** Appelé au clic/`Espace`/`Entrée` sur le switch. */
  onYearlyChange: (yearly: boolean) => void;
  /** `.pricing-toggle-label[data-label="monthly"]`. @default "Mensuel" */
  monthlyLabel?: ReactNode;
  /** `.pricing-toggle-label[data-label="yearly"]`. @default "Annuel" */
  yearlyLabel?: ReactNode;
  /** `.pricing-badge` — remise annuelle. Omis → pas de badge. */
  discountBadge?: ReactNode;
  /** `aria-label` du switch. @default "Basculer facturation annuelle" */
  toggleLabel?: string;
  /** Classes additionnelles sur `.pricing-grid`. */
  className?: string;
}

/**
 * Pricing — Grille de tarification du Design System msyx.fr
 * (`pages/templates.html` #pricing, calque `initPricing` —
 * `shared/components.js:4352-4392`).
 *
 * Émet le markup canonique (`components/pricing.css`) :
 * ```html
 * <div class="pricing-toggle">
 *   <span class="pricing-toggle-label active" data-label="monthly">Mensuel</span>
 *   <button class="pricing-toggle-switch" role="switch" aria-checked="false">
 *   <span class="pricing-toggle-label" data-label="yearly">Annuel</span>
 *   <span class="pricing-badge">-20%</span>
 * </div>
 * <div class="pricing-grid">
 *   <div class="pricing-card[ pricing-card--recommended]">
 *     <span class="pricing-card-badge">Recommandé</span>
 *     <div class="pricing-plan">Pro</div>
 *     <div class="pricing-price">
 *       <span class="pricing-price-currency">€</span>
 *       <span class="pricing-price-amount">19</span>
 *       <span class="pricing-price-period">/ mois</span>
 *     </div>
 *     <p class="pricing-desc">…</p>
 *     <ul class="pricing-features">
 *       <li class="pricing-feature[ pricing-feature--disabled]">
 *         <span class="pricing-feature-icon">…</span>…
 *       </li>
 *     </ul>
 *     <div class="pricing-cta">…</div>
 *   </div>
 * </div>
 * ```
 *
 * **Seul composant du lot templates avec un vrai comportement** (`docs/DS-PRINCIPLES.md`
 * §8.1) : bascule mensuel/annuel. **Entièrement contrôlé** — `yearly` est piloté par
 * le parent (aucun état interne), comme `<ThemeToggle>` (`mode`/`onToggle`) : le
 * vanilla toggle `.pricing-toggle-switch.yearly` lui-même via `classList.toggle`,
 * ici la classe découle directement de la prop. Montant affiché = `priceYearly`
 * si `yearly`, sinon `priceMonthly` (calque `updatePrices()` qui lit
 * `data-price-monthly`/`data-price-yearly` — remplacé par un rendu conditionnel
 * React, pas de `data-*` nécessaire côté composant contrôlé).
 *
 * `role="switch"` + `aria-checked` posés à l'identique du vanilla (déjà présents
 * dans `initPricing`). Clavier : `Espace`/`Entrée` togglent (calque
 * `sw.addEventListener('keydown', …)`).
 *
 * **Composition** : `cta` (bouton) et `icon` de chaque feature sont fournis par
 * le parent — composez `<Button>`/`<Icon>` déjà portés plutôt que de réémettre
 * leurs classes ici. Le composant ne connaît aucune politique de prix/plan, il
 * assemble uniquement les données reçues.
 *
 * SSR-safe : aucun accès `window`/`document`.
 */
export function Pricing({
  plans,
  yearly,
  onYearlyChange,
  monthlyLabel = "Mensuel",
  yearlyLabel = "Annuel",
  discountBadge,
  toggleLabel = "Basculer facturation annuelle",
  className,
}: PricingProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onYearlyChange(!yearly);
    }
  }

  const switchClasses = ["pricing-toggle-switch", yearly ? "yearly" : null]
    .filter(Boolean)
    .join(" ");

  const gridClasses = ["pricing-grid", className].filter(Boolean).join(" ");

  return (
    <>
      <div className="pricing-toggle">
        <span
          className={
            !yearly ? "pricing-toggle-label active" : "pricing-toggle-label"
          }
          data-label="monthly"
        >
          {monthlyLabel}
        </span>
        <button
          type="button"
          className={switchClasses}
          role="switch"
          aria-checked={yearly}
          aria-label={toggleLabel}
          onClick={() => onYearlyChange(!yearly)}
          onKeyDown={handleKeyDown}
        />
        <span
          className={
            yearly ? "pricing-toggle-label active" : "pricing-toggle-label"
          }
          data-label="yearly"
        >
          {yearlyLabel}
        </span>
        {discountBadge != null && (
          <span className="pricing-badge">{discountBadge}</span>
        )}
      </div>

      <div className={gridClasses}>
        {plans.map((plan) => {
          const cardClasses = [
            "pricing-card",
            plan.recommended ? "pricing-card--recommended" : null,
          ]
            .filter(Boolean)
            .join(" ");
          const amount = yearly ? plan.priceYearly : plan.priceMonthly;

          return (
            <div key={plan.id} className={cardClasses}>
              {plan.recommended && (
                <span className="pricing-card-badge">
                  {plan.recommendedLabel ?? "Recommandé"}
                </span>
              )}
              <div className="pricing-plan">{plan.name}</div>
              <div className="pricing-price">
                <span className="pricing-price-currency">
                  {plan.currency ?? "€"}
                </span>
                <span className="pricing-price-amount">{amount}</span>
                <span className="pricing-price-period">
                  {plan.period ?? "/ mois"}
                </span>
              </div>
              {plan.description && (
                <p className="pricing-desc">{plan.description}</p>
              )}
              <ul className="pricing-features">
                {plan.features.map((feature) => (
                  <li
                    key={feature.id}
                    className={
                      feature.disabled
                        ? "pricing-feature pricing-feature--disabled"
                        : "pricing-feature"
                    }
                  >
                    <span className="pricing-feature-icon">
                      {feature.icon}
                    </span>
                    {feature.label}
                  </li>
                ))}
              </ul>
              <div className="pricing-cta">{plan.cta}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

Pricing.displayName = "Pricing";
