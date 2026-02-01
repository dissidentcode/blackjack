# Plan: Bet Stack UX — Fixed Position + Higher Denominations

## Overview
Two related problems with the visual chip stack during betting:
1. **Layout shift** — The `#bet-stack` sits in the document flow between the info bar and dealer area. As chips are added, it grows taller, pushing the chip buttons (`#chip-row`) downward. The user has to chase the buttons with their mouse.
2. **No denomination collapsing** — `renderBetStack()` only uses `[100, 50, 25, 10]`. Betting $500 produces five $100 chips in a single row rather than collapsing to higher visual denominations (e.g., $500 chip or fewer columns). Large bets look cluttered and push layout even more.

## Approach Analysis

### Problem 1: Layout shift
**Best fix: Move `#bet-stack` to an overlay/absolute position** so it doesn't participate in document flow. The bet stack is purely decorative (the actual bet value is shown in the info bar), so removing it from flow has zero functional impact.

Specifically: position `#bet-stack` absolutely within `.wrapper`, anchored above the dealer cards area. This way chips stack up from a fixed point and the betting controls never move.

**Alternative considered:** Fixed height on `#bet-stack` — rejected because the height varies with bet amount and capping it would clip chips or leave awkward whitespace.

**Alternative considered:** Move chip buttons above the bet stack — rejected because it changes the visual hierarchy (bet display should be between controls and cards).

### Problem 2: No collapsing to higher denominations
**Best fix: Add visual-only denominations ($500, $250) to the decomposition list.** These are display-only — the player still bets with $10/$25/$50/$100 buttons. But `renderBetStack()` renders the accumulated total using a richer denomination set so $500 shows as 1 chip instead of 5.

Denomination list becomes: `[500, 250, 100, 50, 25, 10]`

This keeps the existing `canRepresent()` algorithm intact — it already handles arbitrary denominations. The only change is adding entries to the `denoms` array and CSS classes for the new chip colors.

**Alternative considered:** Cap column height (e.g., max 3 chips per column) — rejected because it hides information. The player should see the real decomposition.

**Alternative considered:** Single "total" chip — rejected because the stacking visual is part of the casino feel.

---

## Phases

### Phase 1: Absolute-position the bet stack
Remove `#bet-stack` from document flow so chip additions don't shift the betting controls.

**Files:** style.css
**Changes:**
- Make `.wrapper` `position: relative` (if not already)
- Position `#bet-stack` absolutely, anchored to a fixed point (e.g., above dealer cards area, centered)
- Adjust z-index so chips appear above the table but below modals/overlays
- Check all three mobile breakpoints (600px, 420px, 360px) for positioning

**Verification:** Add multiple chips — the Deal/Clear/Rebet buttons and chip buttons should not move at all.

- [x] Absolute-position `#bet-stack` within `.card-display-area`
- [ ] Verify chip buttons don't shift on bet changes
- [ ] Verify mobile breakpoints still look correct

### Phase 2: Add higher visual denominations
Add $500 and $250 to the visual decomposition so large bets collapse into fewer chips.

**Files:** script.js, style.css
**Changes:**
- `renderBetStack()`: change `denoms` from `[100, 50, 25, 10]` to `[500, 250, 100, 50, 25, 10]`
- style.css: add `.chip-500` and `.chip-250` color classes
- Colors: $500 = purple/violet (casino standard), $250 = pink/magenta or orange

**Verification:**
- $500 → 1 chip (not 5x$100)
- $250 → 1 chip (not various combos)
- $100 → still 1 black/gold chip
- $300 → 1x$250 + 1x$50 or 3x$100 (either valid)
- All existing amounts still render correctly

- [x] Add $500 and $250 to `denoms` array in `renderBetStack()`
- [x] Add `.chip-500` and `.chip-250` CSS classes
- [ ] Verify all bet amounts from $10 to $500 render correctly

## Risks
- **LESSONS.md**: "Always test with the MAXIMUM number of visible elements" — test $500 bet (max) to ensure single-chip rendering works with absolute positioning
- **LESSONS.md**: Greedy decomposition with non-multiple denominations — the existing `canRepresent()` handles this, but $250 isn't a multiple of $100, so verify amounts like $300, $350, $400
- Absolute positioning on mobile needs careful testing — the bet stack could overlap cards on small screens

---

## Phase 3: Fix bet stack positioning and persistence during play

### Problems found after Phase 1-2 implementation:
1. **Chips cover "You" label** — `top: 50%; transform: translateY(-50%)` centers the stack in `.card-display-area`, which puts it right on top of the player's "You" label
2. **Chips disappear on deal** — `renderBetStack()` line 737 uses `gamePhase === 'betting' ? currentBet : 0`, so the stack clears the moment the game leaves the betting phase

### Approach: Move bet stack next to the bet display in the info bar area

Rather than overlaying the card area (which creates overlap during play), place the bet stack in a **dedicated fixed-height zone between the info bar and the card areas**. This zone:
- Has a fixed `height` so it never shifts layout regardless of chip count
- Uses `overflow: visible` so chips can stack upward without pushing anything
- Shows chips during ALL phases (not just betting) since the bet is active through the entire round
- Clears only when the round ends and a new round starts with no bet

This is a fundamentally better placement — the bet stack sits right below the "Bet: $X" text, visually reinforcing the numerical display. During play, the chips stay visible as a reminder of what's wagered.

**Files:** style.css, script.js, index.html
**Changes:**

**HTML:**
- Move `#bet-stack` out of `.card-display-area` back to between info-bar and card-display-area
- Remove `.card-display-area` wrapper (no longer needed as positioning context)

**CSS:**
- `#bet-stack`: switch from `position: absolute` to `position: relative` with a fixed `height` (e.g., 20px). Use `overflow: visible` so chips stack upward visually but the container itself doesn't grow. Chips anchor from the bottom of this fixed zone.
- The fixed height reserves consistent space — no layout shift when chips are added or removed

**JS:**
- `renderBetStack()`: change the amount calculation from `gamePhase === 'betting' ? currentBet : 0` to show chips whenever there's an active bet. Use `currentBet` during betting, `handBets` sum during play/insurance/dealerTurn/roundOver. Clear only when both are zero.
- Add a fade-out transition when chips clear at round end (CSS opacity transition)

**Verification:**
- [x] Bet stack appears below info bar, above dealer cards
- [ ] Chips don't shift any elements when added/removed (fixed container height)
- [x] Chips remain visible during playing, insurance, dealer turn, and round over phases
- [x] Chips clear when new round starts with no bet (betting phase, currentBet = 0)
- [x] "You" and "Dealer" labels not obscured
- [ ] Mobile breakpoints look correct
- [x] Split hands: bet stack shows combined bet total

---

## Phase 4: Compact header + proper bet stack space

### Problem
The `#bet-stack` sits between the info bar and dealer area with only 20px reserved height. Chips are 44px tall and stack upward via `overflow: visible`, covering the Balance/Bet info bar and potentially the message text.

### Root cause analysis
The vertical layout is tight because the header consumes ~200+ pixels:
- Logo: `15vh` (~135px on 900px viewport)
- Title "Blackjack": clamp(3rem, 2rem + 6vw, 5rem) = ~48-80px
- Message: ~28px with margin
- Info bar: ~24px with margin

The bet stack needs at least 50px for a single chip to sit without covering anything. The header has that space to give.

### Approach: Inline header + increased bet stack zone

**Compact the header** by putting the logo and title on the same line (inline-flex), reducing the logo size, and tightening margins. This reclaims ~80-100px of vertical space.

**Increase bet stack height** from 20px to 50px. A single chip (44px) fits cleanly. Multi-chip stacks (rare with $500/$250 denoms) overflow upward into the space freed by the compacted header — which is now just ~20-30px of margin rather than a large title block.

### Changes

**CSS (style.css):**
- New `.header` flex container: `display: flex; align-items: center; justify-content: center; gap: 0.8rem;`
- `.logo`: reduce from `15vh` to `clamp(40px, 8vh, 60px)`, remove block display, no vertical padding
- `h1`: reduce to `clamp(2rem, 1.5rem + 3vw, 3rem)`, remove bottom margin
- `#bet-stack`: increase `height` from `20px` to `50px`
- Update mobile breakpoints (360px logo/title already scale down, verify the new sizes don't conflict)

**HTML (index.html):**
- Wrap logo + h1 in `<div class="header">` for inline layout

**JS:** No changes needed

### Verification
- [x] Logo and title render side-by-side, visually appealing
- [ ] Single-chip bets ($500, $250, $100) fit within the 50px zone without covering the info bar
- [ ] Multi-chip bets (e.g., $40 = 4x$10) overflow upward into header margin space cleanly
- [ ] Message text still readable between header and info bar
- [ ] Mobile 600px / 420px / 360px breakpoints look correct
- [ ] No layout shift when adding/removing chips

### Risks
- **LESSONS.md**: "Always test with the MAXIMUM number of visible elements" — test $40 (4x$10, tallest stack) to verify it doesn't overlap the compacted header text
- The logo image aspect ratio matters — if it's tall and narrow, horizontal layout may look odd. Need to verify with actual image.
- Mobile breakpoints: the 360px breakpoint already reduces logo to `10vh` and title font. The new compact header must not conflict with those overrides.
