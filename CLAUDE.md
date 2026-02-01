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
├── index.html          # Game page
├── style.css           # All styles
├── script.js           # Game engine + render logic
├── images/             # Logo, background
├── docs/
│   ├── LESSONS.md      # Compounded learnings
│   └── ARCHITECTURE.md # Technical decisions
└── CLAUDE.md           # This file
```

## Development Workflow

1. `/plan` — Analyze request, produce phased plan with task tracking
2. `/work` — Execute current plan/phase, mark tasks as you go
3. `/review` — Check recent changes for bugs, style, edge cases
4. `/test` — Verify game logic by reading code paths, checking for errors
5. `/compound` — Update LESSONS.md, ARCHITECTURE.md, CLAUDE.md with learnings

## Critical Rules

- **No frameworks** — vanilla HTML/CSS/JS only
- **No build tools** — files served directly
- **Three files** — index.html, style.css, script.js (plus assets)
- **Gold/green theme** — goldenrod accents, dark green text, table background
- **Font** — Playfair Display (Google Fonts)

## Game Rules

- Dealer hits on soft 17, stands on hard 17+
- Blackjack pays 3:2
- Regular win pays 1:1
- Push returns the bet
- Double down: one additional card, bet doubled
- Reshuffle when deck runs low

## Deeper Context

- `docs/LESSONS.md` — Problems encountered and how they were solved
- `docs/ARCHITECTURE.md` — Technical decisions and patterns
