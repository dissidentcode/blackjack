# Blackjack Roadmap

Prioritized improvements organized by value and effort. Use `/work` to pick up items.

## Status Key
- [x] Completed
- [ ] Not started

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

---

## Tier 3: Core Blackjack Features (High Value)

- [ ] **Split pairs** — When dealt two cards of the same rank, split into two independent hands. Each gets its own bet and plays separately. Biggest missing feature. Requires hand-array refactor.
- [ ] **Insurance** — When dealer shows an Ace, offer insurance (side bet at 2:1) before checking for dealer blackjack. Standard casino rule.
- [ ] **Surrender** — Option to forfeit half the bet and fold before playing. Late surrender (after dealer checks for blackjack).
- [ ] **Multi-deck shoe** — Support configurable 1/2/4/6/8 deck shoes instead of single deck.

## Tier 4: Player Experience (Medium-High Value)

- [ ] **Sound effects** — Card deal, chip click, win jingle, bust thud. Toggle on/off. Use Web Audio API, no external files needed.
- [ ] **Game history** — Show last 10 rounds with outcome and balance change. Small collapsible panel.
- [ ] **Help overlay** — In-game rules reference and basic strategy chart.

## Tier 5: Visual Polish (Medium Value)

- [ ] **Card deal animation** — Cards slide in from a deck position. CSS transitions.
- [ ] **Card flip animation** — Dealer hole card flips with 3D CSS transform when revealed.
- [ ] **Win/loss effects** — Gold flash on win, red shake on bust, confetti on blackjack. Subtle.
- [ ] **Chip stacking** — Visual betting zone where chips stack as you add them.
- [ ] **Score change indicators** — "+10" popup that fades when a card is dealt.
- [ ] **Mobile-optimized layout** — Larger touch targets, responsive card sizing.
- [ ] **Smooth phase transitions** — Fade/slide between betting, playing, and round-over states.

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

## Recommended Order

1. **Split** — biggest missing feature, most complex (hand-array refactor)
2. **Visual polish** — card animations, win effects, mobile layout
3. **Accessibility** — ARIA, keyboard nav, contrast (do alongside UI changes)
4. **Sound** — last because optional and some users find it annoying
