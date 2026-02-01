Test the current state of the game by verifying code logic.

Since this is a vanilla project with no test framework, testing means reading code paths and checking for logical errors.

Steps:
1. Read script.js and trace through these scenarios:
   - **Deal**: Two cards each, correct initial state
   - **Hit**: Card added, hand value updated, ace logic correct
   - **Stand**: Dealer plays correctly (hits soft 17, stands hard 17+)
   - **Double down**: Bet doubled, exactly one card dealt, then dealer plays
   - **Blackjack**: Natural 21 detected, 3:2 payout
   - **Bust**: Over 21 detected, bet lost
   - **Push**: Equal totals, bet returned
   - **Ace handling**: Soft/hard transitions when hitting
   - **Reshuffle**: Deck replenished when low
   - **Balance**: Correct after wins, losses, pushes, blackjacks
   - **Zero balance**: Game handles broke state
2. Check index.html for correct element IDs matching script.js selectors
3. Check style.css for visibility toggling matching game phases
4. Report: PASS / FAIL for each scenario with explanation

$ARGUMENTS
