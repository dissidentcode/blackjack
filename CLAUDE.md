# Blackjack

A vanilla HTML/CSS/JavaScript blackjack game. No frameworks, no build tools.

## Tech Stack

- **HTML** — `index.html` (single page)
- **CSS** — `style.css` (all styles)
- **JavaScript** — `script.js` (all game logic and rendering)
- **Assets** — `images/` (logo and background)

## Project Structure

```
blackjack/
├── index.html              # Game page
├── style.css               # All styles
├── script.js               # Game engine + render logic
├── images/                 # Logo, background
├── CLAUDE.md               # This file — project context
├── .claude/
│   └── commands/
│       ├── plan.md         # /plan — planning agent
│       ├── work.md         # /work — implementation agent
│       ├── review.md       # /review — review agent
│       ├── test.md         # /test — testing agent
│       └── compound.md     # /compound — learning agent
└── docs/
    ├── LESSONS.md          # Compounded learnings (problems & solutions)
    └── ARCHITECTURE.md     # Technical decisions & patterns
```

## Development Workflow

Every change follows this cycle. Each stage has a dedicated slash command that triggers a specialized agent role.

### `/plan` — Planning Agent
Analyzes the request, reads all project context (CLAUDE.md, LESSONS.md, ARCHITECTURE.md), explores the codebase, and produces a phased plan with task tracking. Does NOT implement — presents the plan for approval first.

### `/work` — Implementation Agent
Picks up the next task from the plan, marks it in-progress, reads all files before modifying them, implements the changes, verifies DOM/CSS/JS alignment, and marks the task complete. Stays focused on one phase at a time.

### `/review` — Review Agent
Reads project rules and LESSONS.md, gathers all recent changes (git diff), and reviews against a structured checklist: logic bugs, state corruption, DOM mismatches, balance math, lessons violations, edge cases. Reports findings by severity (critical/warning/suggestion).

### `/test` — Testing Agent
Reads all three source files and systematically traces through 22 test scenarios covering: initial state, betting, dealing, hit/stand/double, all payout outcomes, ace handling, and edge cases. Reports a PASS/FAIL table with line-number references for any failures.

### `/compound` — Learning Agent
The most important step. Gathers everything that happened (git log, diffs, tasks, conversation), identifies problems/solutions, technical decisions, and new rules, then permanently encodes them into docs/LESSONS.md, docs/ARCHITECTURE.md, and CLAUDE.md. Without this step, every session starts from zero.

### The Philosophy
**plan → work → review → test → compound**

The cycle ensures: nothing is built without a plan, nothing ships without review, nothing is assumed correct without testing, and nothing is learned without compounding. The docs/ directory is the project's memory — it accumulates knowledge across sessions so the same mistakes aren't repeated and the same decisions aren't re-debated.

## Critical Rules

- **No frameworks** — vanilla HTML/CSS/JS only
- **No build tools** — files served directly
- **Three source files** — index.html, style.css, script.js (plus assets)
- **Gold/green theme** — goldenrod accents, dark green text, table background
- **Font** — Playfair Display (Google Fonts)
- **Read before writing** — always read a file before modifying it
- **Guard state mutations** — every action function checks gamePhase before mutating
- **Balance deducted at bet time** — initial bet in placeBet(), double-down addition in doubleDown(), split second bet in split(), insurance in takeInsurance(), nowhere else
- **Dealer blackjack checked at deal time** — dealInitialCards() checks both player and dealer for naturals before entering 'playing' phase
- **saveState() after resolution only** — called in resolveRound(), surrender(), and zero-balance reset, never mid-round
- **Input handlers route through action functions** — keyboard shortcuts call hit(), stand(), etc. directly — never duplicate game logic in handlers
- **Two visibility systems** — `.hidden` (display:none) for instant toggle on non-phase elements. `setPhaseVisibility()` (opacity/max-height transitions) for the 4 phase control groups only. Never mix them on the same element.
- **Animation tracking resets with game state** — `lastRenderedDealerCount`, `lastRenderedHandCounts`, `prevHideHole`, `holeCardEl` must all reset in `newRound()`. `lastRenderedHandCounts` must also update in `split()`.

## Game Rules

- Dealer hits on soft 17, stands on hard 17+
- Dealer blackjack resolves immediately (player cannot act against a dealer natural)
- Blackjack pays 3:2
- Regular win pays 1:1
- Push returns the bet
- Double down: one additional card, bet doubled, only on first two cards
- Split pairs: when dealt two cards of the same rank, split into two independent hands. One split allowed per round. 21 after split pays 1:1 (not 3:2). Each hand resolved independently against dealer.
- Insurance: when dealer shows Ace, player may take insurance (half-bet side wager, pays 2:1 on dealer BJ). Even money offered when player has BJ + dealer shows Ace.
- Late surrender: forfeit half the bet on first two cards, before playing. Not available after split or against dealer blackjack.
- 6-deck shoe (312 cards), reshuffle when deck drops below 90 cards
- Zero balance resets to $500

## Features

- **Rebet** — "Rebet" button during betting sets currentBet to lastBet (replaces, doesn't add). Stored in `lastBet` variable and persisted to localStorage. Only shown when lastBet > 0 and lastBet <= balance.
- **Keyboard shortcuts** — Betting: 1/2/3/4 for chips, Enter=deal, C/Escape=clear, R=rebet. Insurance: Y=take, N=decline. Playing: H=hit, S=stand, D=double, P=split, U=surrender. Round over: Enter=deal again.
- **Persistence** — Balance, stats, and lastBet saved to localStorage via `saveState()`. Loaded on init via `loadBalance()`, `loadStats()`, `loadLastBet()`.
- **Statistics** — Tracks handsPlayed, wins, losses, pushes, blackjacks, biggestWin, win rate. Togglable panel with Stats/Reset buttons.
- **Split pairs** — Split button appears when dealt matching-rank cards with sufficient balance. Splits into two hands played left-to-right. Active hand highlighted with gold border. Each hand has its own bet display and score badge. Auto-advances past hands with 21. One split per round. Uses `playerHands[]` array, `activeHandIndex`, and `handBets[]` for per-hand tracking.
- **Insurance** — When dealer shows Ace, `'insurance'` game phase offers side bet at half the wager. Even money variant when player has blackjack. Insurance payout resolved in `resolveRound()` after hand resolutions. `insuranceBet` state variable, `takeInsurance()`/`declineInsurance()` functions, `checkBlackjacksAndContinue()` extracted from deal flow.
- **Surrender** — Surrender button shown on first two cards (not after split). `surrender()` self-resolves: returns half bet, updates stats, calls `saveState()`, goes to roundOver. Bypasses `resolveRound()` entirely.
- **Multi-deck shoe** — `NUM_DECKS = 6` constant, `createDeck()` loops N times, `RESHUFFLE_THRESHOLD = 15 * NUM_DECKS`.
- **Card animations** — CSS `@keyframes card-deal-in` with `--deal-index` stagger. `lastRenderedDealerCount` and `lastRenderedHandCounts[]` track which cards are already visible to avoid re-animating. `.no-animate` class suppresses animation on existing cards. Reset in `newRound()`, adjusted in `split()`.
- **Dealer hole card flip** — Dual-face structure (`.card-flipper` > `.card-front` + `.card-back`) with 3D `rotateY` CSS transition. `holeCardEl` preserves the DOM element across renders. `prevHideHole` detects the hide→reveal transition. `.flipping` class triggers the animation.
- **Score popups** — `<span class="score-popup">+N</span>` appended to new face-up cards only. CSS `@keyframes score-float` fades up and out.
- **Round effects** — `showRoundEffect()` called from `resolveRound()` after render. Blackjack→confetti (30 pieces, auto-cleanup 2.5s), win→gold glow, bust→shake. Push has no effect.
- **Visual chip stack** — `#bet-stack` with `renderBetStack()` decomposes `currentBet` into $100/$50/$25/$10 denominations. Color-coded chips stack with negative margin overlap. Visible only during betting phase.
- **Phase transitions** — `setPhaseVisibility()` replaces `.hidden` toggles for betting/insurance/action/deal-again groups. Uses opacity + max-height CSS transitions. `.hidden` kept for non-phase elements (stats, conditional buttons).
- **Mobile responsive** — Three breakpoints: 600px (cards 60×85, 44px touch targets), 420px (cards 52×74, 2-column action grid), 360px (cards 46×66, reduced title/logo).

## Deeper Context

- `docs/LESSONS.md` — Problems encountered and how they were solved
- `docs/ARCHITECTURE.md` — Technical decisions and patterns
