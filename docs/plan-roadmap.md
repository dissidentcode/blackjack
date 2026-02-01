# Blackjack Roadmap

Prioritized improvements organized by value and effort. This is the persistent plan of record — it survives context clears and session boundaries. All slash commands update this file as work is completed.

## Status Key
- [x] Completed
- [ ] Not started
- [~] In progress

---

## Tier 1: Quick Wins — COMPLETED
- [x] Remove dead code (`balance -= 0`, unused `chipRow` ref)
- [x] Dealer blackjack early check
- [x] Repeat-last-bet (Rebet) button
- [x] Keyboard shortcuts (H/S/D, 1-4, Enter, C/Escape, R)

## Tier 2: Persistence — COMPLETED
- [x] localStorage for balance, stats, and last bet
- [x] Stats dashboard (hands, wins, losses, pushes, blackjacks, win rate, biggest win)
- [x] Reset button for stats and balance

## Tier 3: Core Blackjack Features — COMPLETED
- [x] **Split pairs** — When dealt two cards of the same rank, split into two independent hands. Each gets its own bet and plays separately.
- [x] **Insurance** — When dealer shows an Ace, offer insurance (side bet at 2:1) before checking for dealer blackjack. Even money when player has BJ.
- [x] **Surrender** — Option to forfeit half the bet and fold before playing. Late surrender.
- [x] **Multi-deck shoe** — 6-deck shoe (312 cards), reshuffle threshold scales proportionally.

## Tier 5: Visual Polish — COMPLETED
- [x] **Card deal animation** — CSS `@keyframes card-deal-in` with `--deal-index` stagger.
- [x] **Card flip animation** — Dealer hole card flips with 3D `rotateY` CSS transform.
- [x] **Win/loss effects** — Confetti on blackjack, gold glow on win, shake on bust.
- [x] **Chip stacking** — Visual `#bet-stack` with color-coded denominations.
- [x] **Score change indicators** — `score-popup` float animation on new cards.
- [x] **Mobile-optimized layout** — Three breakpoints (600px, 420px, 360px).
- [x] **Smooth phase transitions** — `setPhaseVisibility()` with opacity/max-height transitions.

---

## Tier 4: Player Experience (Medium-High Value) — NEXT UP

- [ ] **Sound effects** — Card deal, chip click, win jingle, bust thud. Toggle on/off. Use Web Audio API, no external files needed.
- [ ] **Game history** — Show last 10 rounds with outcome and balance change. Small collapsible panel.
- [ ] **Help overlay** — In-game rules reference and basic strategy chart.

## Tier 6: Accessibility (High Importance)

- [ ] **ARIA labels** — role, aria-label, aria-live regions for screen readers.
- [ ] **Keyboard navigation** — Full tab-order, focus indicators, Enter/Space to activate.
- [ ] **Focus indicators** — Visible outlines on focused elements.
- [ ] **Color contrast** — Verify WCAG AA compliance for all text/background combinations.
- [ ] **Reduced motion** — Respect `prefers-reduced-motion` media query.

## Tier 7: Advanced Features (Lower Priority)

- [ ] **Side bets** — Perfect Pairs, 21+3, etc.
- [ ] **Strategy advisor** — Optional hint system showing basic strategy recommendation.
- [ ] **Themes** — Dark mode, different table felt colors, card back designs.
- [ ] **Achievements** — Badges for milestones (first blackjack, 100 hands, etc.).
- [ ] **Tournament mode** — Timed play, highest balance wins.

## Tier 8: Code Quality

- [ ] **Centralize strings** — Win/loss messages as constants instead of inline strings.
- [ ] **Unit tests** — Add a test framework (even simple inline) for calculateHandValue, resolveRound, etc.
- [ ] **JSDoc comments** — Document function signatures for future sessions.
- [ ] **Remove unused DOM refs** — `statsToggleBtn` is captured but never used in JS logic.

---

## Completed Ad-Hoc Improvements

- [x] **Bet stack UX overhaul** — Fixed layout shift, added $500/$250 visual denominations, persistent chips during play, compact inline header. See `docs/plan-bet-stack-ux.md`.

## Active Feature Plans

Feature-specific plans are stored as `docs/plan-<feature>.md`. When a feature plan is fully completed, its items should be checked off here in the roadmap and the feature plan file can be deleted or kept as historical reference.
