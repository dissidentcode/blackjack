// ============================================================
// Blackjack — Game Engine + Render Logic
// ============================================================

// --- Constants ---
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANK_VALUES = {
    'A': 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10
};
const DEALER_DELAY = 600;
const NUM_DECKS = 6;
const RESHUFFLE_THRESHOLD = 15 * NUM_DECKS;
const STARTING_BALANCE = 500;
const STORAGE_KEY_BALANCE = 'blackjack_balance';
const STORAGE_KEY_STATS = 'blackjack_stats';
const STORAGE_KEY_LAST_BET = 'blackjack_lastBet';

// --- Game State ---
let deck = [];
let playerHands = [[]];  // array of hands (for split support)
let activeHandIndex = 0; // which hand is currently being played
let handBets = [];       // bet amount per hand
let dealerHand = [];
let balance = loadBalance();
let currentBet = 0;
let lastBet = loadLastBet();
let gamePhase = 'betting'; // betting | insurance | playing | dealerTurn | roundOver
let insuranceBet = 0;
let stats = loadStats();

// --- Animation Tracking ---
let lastRenderedDealerCount = 0;
let lastRenderedHandCounts = [0];
let prevHideHole = false;
let holeCardEl = null; // preserved dealer hole card element for flip

// --- Persistence ---
function loadBalance() {
    const saved = localStorage.getItem(STORAGE_KEY_BALANCE);
    if (saved !== null) {
        const val = parseInt(saved, 10);
        return val > 0 ? val : STARTING_BALANCE;
    }
    return STARTING_BALANCE;
}

function loadLastBet() {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_BET);
    return saved !== null ? parseInt(saved, 10) : 0;
}

function loadStats() {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fall through */ }
    }
    return { handsPlayed: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, biggestWin: 0 };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY_BALANCE, balance);
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    localStorage.setItem(STORAGE_KEY_LAST_BET, lastBet);
}

// --- DOM Elements ---
const messageEl = document.getElementById('message-el');
const balanceEl = document.getElementById('balance-el');
const betEl = document.getElementById('bet-el');
const playerCardsEl = document.getElementById('player-cards');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerScoreEl = document.getElementById('player-score');
const dealerScoreEl = document.getElementById('dealer-score');
const actionRow = document.getElementById('action-row');
const dealAgainBtn = document.getElementById('deal-again-btn');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const clearBetBtn = document.getElementById('clear-bet-btn');
const dealBtn = document.getElementById('deal-btn');
const rebetBtn = document.getElementById('rebet-btn');
const splitBtn = document.getElementById('split-btn');
const surrenderBtn = document.getElementById('surrender-btn');
const insuranceBtn = document.getElementById('insurance-btn');
const insuranceRow = document.getElementById('insurance-row');
const bettingControls = document.getElementById('betting-controls');
const betStackEl = document.getElementById('bet-stack');
const confettiContainer = document.getElementById('confetti-container');
const statsToggleBtn = document.getElementById('stats-toggle-btn');
const statsPanel = document.getElementById('stats-panel');

// --- Deck Functions ---
function createDeck() {
    const d = [];
    for (let n = 0; n < NUM_DECKS; n++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                d.push({ suit, rank, value: RANK_VALUES[rank] });
            }
        }
    }
    return d;
}

function shuffleDeck(d) {
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function dealCard() {
    if (deck.length < RESHUFFLE_THRESHOLD) {
        deck = shuffleDeck(createDeck());
    }
    return deck.pop();
}

// --- Hand Calculation ---
function calculateHandValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        total += RANK_VALUES[card.rank];
        if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    const isSoft = aces > 0 && total <= 21;
    return { total, isSoft };
}

function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand).total === 21;
}

// --- Betting ---
function addBet(amount) {
    if (gamePhase !== 'betting') return;
    if (amount > balance - currentBet) return;
    currentBet += amount;
    renderGame();
}

function clearBet() {
    if (gamePhase !== 'betting') return;
    currentBet = 0;
    renderGame();
}

function rebet() {
    if (gamePhase !== 'betting') return;
    if (lastBet === 0 || lastBet > balance) return;
    currentBet = lastBet;
    renderGame();
}

// --- Game Actions ---
function placeBet() {
    if (gamePhase !== 'betting' || currentBet === 0) return;
    lastBet = currentBet;
    balance -= currentBet;
    dealInitialCards();
}

function dealInitialCards() {
    playerHands = [[dealCard(), dealCard()]];
    activeHandIndex = 0;
    handBets = [currentBet];
    insuranceBet = 0;
    dealerHand = [dealCard(), dealCard()];

    const dealerShowsAce = dealerHand[1].rank === 'A';
    const playerBJ = isBlackjack(playerHands[0]);

    if (dealerShowsAce) {
        const maxInsurance = Math.floor(handBets[0] / 2);
        if (playerBJ) {
            // Even money: guarantee 1:1 payout instead of risking push
            if (maxInsurance > 0 && maxInsurance <= balance) {
                gamePhase = 'insurance';
                insuranceBtn.textContent = 'Even Money';
                messageEl.textContent = 'Even money? Take 1:1 now or risk the push.';
                renderGame();
                return;
            }
        } else {
            if (maxInsurance > 0 && maxInsurance <= balance) {
                gamePhase = 'insurance';
                insuranceBtn.textContent = 'Insurance';
                messageEl.textContent = 'Insurance? (half your bet: $' + maxInsurance + ')';
                renderGame();
                return;
            }
        }
        // Dealer shows Ace but player can't afford insurance
        if (maxInsurance > balance) {
            messageEl.textContent = "Can't afford insurance.";
        }
    }

    checkBlackjacksAndContinue();
}

function checkBlackjacksAndContinue() {
    if (isBlackjack(playerHands[0]) || isBlackjack(dealerHand)) {
        gamePhase = 'roundOver';
        revealAndResolve();
        return;
    }

    gamePhase = 'playing';
    renderGame();
}

function takeInsurance() {
    if (gamePhase !== 'insurance') return;
    const amount = Math.floor(handBets[0] / 2);
    if (amount > balance) return;
    insuranceBet = amount;
    balance -= amount;
    checkBlackjacksAndContinue();
}

function declineInsurance() {
    if (gamePhase !== 'insurance') return;
    insuranceBet = 0;
    checkBlackjacksAndContinue();
}

function hit() {
    if (gamePhase !== 'playing') return;
    const hand = playerHands[activeHandIndex];
    hand.push(dealCard());
    const { total } = calculateHandValue(hand);
    if (total > 21 || total === 21) {
        advanceHand();
        return;
    }
    renderGame();
}

function advanceHand() {
    // Move to next hand or to dealer turn
    if (activeHandIndex < playerHands.length - 1) {
        activeHandIndex++;
        // Auto-advance if next hand already has 21
        const { total } = calculateHandValue(playerHands[activeHandIndex]);
        if (total === 21) {
            advanceHand();
            return;
        }
        renderGame();
    } else {
        // All hands done — check if all busted
        const allBusted = playerHands.every(h => calculateHandValue(h).total > 21);
        if (allBusted) {
            gamePhase = 'roundOver';
            resolveRound();
        } else {
            gamePhase = 'dealerTurn';
            renderGame();
            dealerPlay();
        }
    }
}

function stand() {
    if (gamePhase !== 'playing') return;
    advanceHand();
}

function doubleDown() {
    if (gamePhase !== 'playing') return;
    const hand = playerHands[activeHandIndex];
    if (hand.length !== 2) return;
    const bet = handBets[activeHandIndex];
    if (bet > balance) return;

    balance -= bet;
    handBets[activeHandIndex] = bet * 2;
    hand.push(dealCard());

    advanceHand();
}

function split() {
    if (gamePhase !== 'playing') return;
    if (playerHands.length > 1) return; // only one split allowed
    const hand = playerHands[0];
    if (hand.length !== 2) return;
    if (hand[0].rank !== hand[1].rank) return;
    if (handBets[0] > balance) return;

    // Deduct second bet
    balance -= handBets[0];

    // Split into two hands
    const card1 = hand[0];
    const card2 = hand[1];
    playerHands = [[card1, dealCard()], [card2, dealCard()]];
    handBets = [handBets[0], handBets[0]];
    activeHandIndex = 0;
    // Reset animation counts: 1 old card + 1 new card per hand
    lastRenderedHandCounts = [1, 1];

    // If active hand hits 21, auto-advance
    const { total } = calculateHandValue(playerHands[0]);
    if (total === 21) {
        advanceHand();
        return;
    }

    renderGame();
}

function surrender() {
    if (gamePhase !== 'playing') return;
    if (playerHands.length > 1) return; // no surrender after split
    const hand = playerHands[activeHandIndex];
    if (hand.length !== 2) return; // only on first two cards

    // Return half the bet, forfeit the other half
    const bet = handBets[activeHandIndex];
    const halfBet = Math.floor(bet / 2);
    balance += halfBet;
    handBets[activeHandIndex] = 0; // mark as surrendered (0 bet = no payout in resolve)

    stats.handsPlayed++;
    stats.losses++;

    gamePhase = 'roundOver';
    messageEl.textContent = 'Surrendered. $' + halfBet + ' returned.';
    saveState();
    renderGame();
}

// --- Dealer Logic ---
async function dealerPlay() {
    await sleep(DEALER_DELAY);
    renderGame(); // reveal hole card

    while (shouldDealerHit()) {
        await sleep(DEALER_DELAY);
        dealerHand.push(dealCard());
        renderGame();
    }

    gamePhase = 'roundOver';
    resolveRound();
}

function shouldDealerHit() {
    const { total, isSoft } = calculateHandValue(dealerHand);
    if (total < 17) return true;
    if (total === 17 && isSoft) return true; // hit soft 17
    return false;
}

// --- Round Resolution ---
function revealAndResolve() {
    // Called when player or dealer has natural blackjack
    renderGame();
    resolveRound();
}

function resolveHand(hand, bet, dealer, dealerBJ, wasSplit) {
    const player = calculateHandValue(hand);
    // 21 after split is not a natural blackjack
    const playerBJ = !wasSplit && isBlackjack(hand);
    let msg = '';
    let net = 0;

    if (playerBJ && dealerBJ) {
        msg = wasSplit ? 'Push!' : 'Both have Blackjack — Push!';
        balance += bet;
        stats.pushes++;
        stats.blackjacks++;
    } else if (playerBJ) {
        const payout = Math.floor(bet * 1.5);
        msg = wasSplit ? 'BJ! +$' + payout : 'Blackjack! You win $' + payout + '!';
        balance += bet + payout;
        net = payout;
        stats.wins++;
        stats.blackjacks++;
    } else if (dealerBJ) {
        msg = wasSplit ? 'Dealer BJ. -$' + bet : 'Dealer has Blackjack. You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else if (player.total > 21) {
        msg = wasSplit ? 'Bust! -$' + bet : 'Bust! You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else if (dealer.total > 21) {
        msg = wasSplit ? 'Dealer busts! +$' + bet : 'Dealer busts! You win $' + bet + '!';
        balance += bet * 2;
        net = bet;
        stats.wins++;
    } else if (player.total > dealer.total) {
        msg = wasSplit ? 'Win! +$' + bet : 'You win $' + bet + '!';
        balance += bet * 2;
        net = bet;
        stats.wins++;
    } else if (player.total < dealer.total) {
        msg = wasSplit ? 'Lose. -$' + bet : 'Dealer wins. You lose $' + bet + '.';
        net = -bet;
        stats.losses++;
    } else {
        msg = wasSplit ? 'Push.' : 'Push! Bet returned.';
        balance += bet;
        stats.pushes++;
    }

    stats.handsPlayed++;
    return { msg, net };
}

function resolveRound() {
    const dealer = calculateHandValue(dealerHand);
    const dealerBJ = isBlackjack(dealerHand);
    const isSplit = playerHands.length > 1;
    let totalNet = 0;
    const messages = [];

    for (let i = 0; i < playerHands.length; i++) {
        const { msg, net } = resolveHand(playerHands[i], handBets[i], dealer, dealerBJ, isSplit);
        totalNet += net;
        messages.push(isSplit ? 'Hand ' + (i + 1) + ': ' + msg : msg);
    }

    // Insurance resolution
    if (insuranceBet > 0) {
        if (dealerBJ) {
            const insurancePayout = insuranceBet * 2;
            balance += insuranceBet + insurancePayout;
            totalNet += insurancePayout;
            messages.push('Insurance pays +$' + insurancePayout + '!');
        } else {
            totalNet -= insuranceBet;
            messages.push('Insurance lost (-$' + insuranceBet + ').');
        }
    }

    if (totalNet > stats.biggestWin) stats.biggestWin = totalNet;

    gamePhase = 'roundOver';
    messageEl.textContent = messages.join(' | ');
    saveState();
    renderGame();

    // Determine dominant effect
    const anyBJ = playerHands.some(h => !isSplit && isBlackjack(h));
    const allBusted = playerHands.every(h => calculateHandValue(h).total > 21);
    if (anyBJ) {
        showRoundEffect('blackjack');
    } else if (allBusted) {
        showRoundEffect('bust');
    } else if (totalNet > 0) {
        showRoundEffect('win');
    }
}

function newRound() {
    if (balance === 0) {
        balance = STARTING_BALANCE;
        messageEl.textContent = 'Restarting with $' + STARTING_BALANCE + '. Good luck!';
        saveState();
    } else {
        messageEl.textContent = 'Place your bet.';
    }
    playerHands = [[]];
    activeHandIndex = 0;
    handBets = [];
    insuranceBet = 0;
    dealerHand = [];
    currentBet = 0;
    gamePhase = 'betting';
    // Reset animation tracking
    lastRenderedDealerCount = 0;
    lastRenderedHandCounts = [0];
    prevHideHole = false;
    holeCardEl = null;
    renderGame();
}

// --- Rendering ---
function buildFaceUpCard(card) {
    const el = document.createElement('div');
    el.classList.add('card');
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    el.classList.add(isRed ? 'red' : 'black');
    const symbol = SUIT_SYMBOLS[card.suit];
    el.innerHTML =
        '<span class="card-corner top-left"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>' +
        '<span class="card-center">' + symbol + '</span>' +
        '<span class="card-corner bottom-right"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>';
    return el;
}

function createCardElement(card, faceDown, dealIndex, isNew) {
    if (faceDown) {
        // Build flippable dual-face structure for dealer hole card
        const container = document.createElement('div');
        container.classList.add('card-flipper-container');
        if (isNew) {
            container.style.setProperty('--deal-index', dealIndex);
        } else {
            container.classList.add('no-animate');
        }

        const flipper = document.createElement('div');
        flipper.classList.add('card-flipper');

        const front = buildFaceUpCard(card);
        front.classList.add('card-front');
        front.classList.add('no-animate');

        const back = document.createElement('div');
        back.classList.add('card-back');

        flipper.appendChild(front);
        flipper.appendChild(back);
        container.appendChild(flipper);
        return container;
    }

    const el = buildFaceUpCard(card);

    if (isNew) {
        el.style.setProperty('--deal-index', dealIndex);
        // Score popup for new face-up cards
        const value = RANK_VALUES[card.rank];
        const popup = document.createElement('span');
        popup.classList.add('score-popup');
        popup.textContent = '+' + value;
        el.appendChild(popup);
    } else {
        el.classList.add('no-animate');
    }

    return el;
}

function renderGame() {
    // Balance and bet
    balanceEl.textContent = '$' + balance;
    const mainBet = handBets.length > 0 ? handBets.reduce((a, b) => a + b, 0) : currentBet;
    const totalBet = mainBet + (gamePhase === 'insurance' ? insuranceBet : 0);
    betEl.textContent = totalBet > 0 ? '$' + totalBet : '-';

    // Dealer cards
    const hideHole = gamePhase === 'playing' || gamePhase === 'insurance';
    const wasHiding = prevHideHole;
    const shouldFlip = wasHiding && !hideHole && dealerHand.length >= 2 && holeCardEl;

    if (shouldFlip) {
        // Flip the preserved hole card element instead of rebuilding
        const flipper = holeCardEl.querySelector('.card-flipper');
        if (flipper) flipper.classList.add('flipping');

        // Rebuild remaining dealer cards after the hole card
        while (dealerCardsEl.children.length > 1) {
            dealerCardsEl.removeChild(dealerCardsEl.lastChild);
        }
        for (let i = 1; i < dealerHand.length; i++) {
            const isNew = i >= lastRenderedDealerCount;
            dealerCardsEl.appendChild(createCardElement(dealerHand[i], false, i, isNew));
        }
        holeCardEl = null;
    } else {
        dealerCardsEl.innerHTML = '';
        for (let i = 0; i < dealerHand.length; i++) {
            const faceDown = hideHole && i === 0;
            const isNew = i >= lastRenderedDealerCount;
            const el = createCardElement(dealerHand[i], faceDown, i, isNew);
            dealerCardsEl.appendChild(el);
            if (faceDown && i === 0) holeCardEl = el;
        }
    }

    prevHideHole = hideHole;
    lastRenderedDealerCount = dealerHand.length;

    // Dealer score
    if (dealerHand.length > 0) {
        if (hideHole) {
            const upcard = RANK_VALUES[dealerHand[1].rank];
            dealerScoreEl.textContent = upcard;
        } else {
            dealerScoreEl.textContent = calculateHandValue(dealerHand).total;
        }
        dealerScoreEl.classList.remove('hidden');
    } else {
        dealerScoreEl.classList.add('hidden');
    }

    // Player hands
    const playerArea = playerCardsEl.parentElement;
    playerArea.querySelectorAll('.split-hand').forEach(el => el.remove());

    const isSplit = playerHands.length > 1;

    if (isSplit) {
        playerCardsEl.innerHTML = '';
        playerScoreEl.classList.add('hidden');

        for (let h = 0; h < playerHands.length; h++) {
            const hand = playerHands[h];
            const prevCount = lastRenderedHandCounts[h] || 0;
            const container = document.createElement('div');
            container.classList.add('split-hand');
            if (gamePhase === 'playing' && h === activeHandIndex) {
                container.classList.add('active-hand');
            }

            const label = document.createElement('div');
            label.classList.add('split-hand-label');
            label.textContent = 'Hand ' + (h + 1) + ' ($' + handBets[h] + ')';
            container.appendChild(label);

            const cardRow = document.createElement('div');
            cardRow.classList.add('card-row');
            for (let c = 0; c < hand.length; c++) {
                const isNew = c >= prevCount;
                cardRow.appendChild(createCardElement(hand[c], false, c, isNew));
            }
            container.appendChild(cardRow);

            if (hand.length > 0) {
                const score = document.createElement('span');
                score.classList.add('score-badge');
                const hv = calculateHandValue(hand);
                score.textContent = hv.total;
                if (hv.total > 21) score.classList.add('busted');
                label.appendChild(score);
            }

            playerArea.appendChild(container);
            lastRenderedHandCounts[h] = hand.length;
        }
    } else {
        playerCardsEl.innerHTML = '';
        const hand = playerHands[0];
        const prevCount = lastRenderedHandCounts[0] || 0;
        for (let c = 0; c < hand.length; c++) {
            const isNew = c >= prevCount;
            playerCardsEl.appendChild(createCardElement(hand[c], false, c, isNew));
        }
        lastRenderedHandCounts[0] = hand.length;

        if (hand.length > 0) {
            const pv = calculateHandValue(hand);
            playerScoreEl.textContent = pv.total;
            playerScoreEl.classList.remove('hidden');
        } else {
            playerScoreEl.classList.add('hidden');
        }
    }

    // Bet stack
    renderBetStack();

    // Controls visibility — phase transitions
    const isBetting = gamePhase === 'betting';
    const isPlaying = gamePhase === 'playing';
    const isInsurance = gamePhase === 'insurance';
    const isOver = gamePhase === 'roundOver';

    setPhaseVisibility(bettingControls, isBetting);
    rebetBtn.classList.toggle('hidden', !isBetting || lastBet === 0 || lastBet > balance);
    setPhaseVisibility(insuranceRow, isInsurance);
    setPhaseVisibility(actionRow, isPlaying);
    setPhaseVisibility(dealAgainBtn, isOver);

    // Double down and split availability
    if (isPlaying) {
        const hand = playerHands[activeHandIndex];
        const bet = handBets[activeHandIndex];
        const canDouble = hand.length === 2 && bet <= balance;
        doubleBtn.disabled = !canDouble;

        const canSplit = !isSplit && hand.length === 2 &&
            hand[0].rank === hand[1].rank && handBets[0] <= balance;
        splitBtn.disabled = !canSplit;
        splitBtn.classList.toggle('hidden', !canSplit);

        const canSurrender = !isSplit && hand.length === 2;
        surrenderBtn.classList.toggle('hidden', !canSurrender);
    } else {
        splitBtn.classList.add('hidden');
        surrenderBtn.classList.add('hidden');
    }

    renderStats();
}

// --- Visual Effects ---
function showRoundEffect(type) {
    if (type === 'blackjack') {
        spawnConfetti();
    } else if (type === 'win') {
        const area = playerCardsEl.closest('.hand-area');
        area.classList.add('win-flash');
        area.addEventListener('animationend', () => area.classList.remove('win-flash'), { once: true });
    } else if (type === 'bust') {
        // Apply to active card row
        const rows = document.querySelectorAll('#player-cards, .split-hand .card-row');
        rows.forEach(row => {
            row.classList.add('bust-shake');
            row.addEventListener('animationend', () => row.classList.remove('bust-shake'), { once: true });
        });
    }
}

function spawnConfetti() {
    const colors = ['#daa520', '#fff', '#1a8c3a', '#ffd700', '#c0c0c0'];
    for (let i = 0; i < 30; i++) {
        const piece = document.createElement('span');
        piece.classList.add('confetti-piece');
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confettiContainer.appendChild(piece);
    }
    setTimeout(() => { confettiContainer.innerHTML = ''; }, 2500);
}

function renderBetStack() {
    betStackEl.innerHTML = '';
    const amount = gamePhase === 'betting' ? currentBet : 0;
    if (amount === 0) return;

    const denoms = [100, 50, 25, 10];
    let remaining = amount;
    let chipIndex = 0;

    for (const denom of denoms) {
        const count = Math.floor(remaining / denom);
        if (count === 0) continue;
        remaining -= count * denom;

        const col = document.createElement('div');
        col.classList.add('chip-stack-column');
        for (let i = 0; i < count; i++) {
            const chip = document.createElement('div');
            chip.classList.add('visual-chip', 'chip-' + denom);
            chip.textContent = '$' + denom;
            chip.style.animationDelay = chipIndex * 0.06 + 's';
            col.appendChild(chip);
            chipIndex++;
        }
        betStackEl.appendChild(col);
    }
}

function setPhaseVisibility(el, visible) {
    if (!el.classList.contains('phase-group')) {
        el.classList.add('phase-group');
    }
    if (visible) {
        el.classList.remove('phase-hidden', 'hidden');
        el.classList.add('phase-visible');
    } else {
        el.classList.add('phase-hidden');
        el.classList.remove('phase-visible');
    }
}

// --- Utility ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Stats ---
function toggleStats() {
    statsPanel.classList.toggle('hidden');
    renderStats();
}

function renderStats() {
    if (statsPanel.classList.contains('hidden')) return;
    const winRate = stats.handsPlayed > 0
        ? Math.round((stats.wins / stats.handsPlayed) * 100)
        : 0;
    statsPanel.innerHTML =
        '<div class="stats-grid">' +
        '<span>Hands:</span><span>' + stats.handsPlayed + '</span>' +
        '<span>Wins:</span><span>' + stats.wins + '</span>' +
        '<span>Losses:</span><span>' + stats.losses + '</span>' +
        '<span>Pushes:</span><span>' + stats.pushes + '</span>' +
        '<span>Blackjacks:</span><span>' + stats.blackjacks + '</span>' +
        '<span>Win rate:</span><span>' + winRate + '%</span>' +
        '<span>Biggest win:</span><span>$' + stats.biggestWin + '</span>' +
        '</div>';
}

function resetStats() {
    if (!confirm('Reset all stats and balance?')) return;
    stats = { handsPlayed: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, biggestWin: 0 };
    balance = STARTING_BALANCE;
    lastBet = 0;
    currentBet = 0;
    saveState();
    newRound();
    renderStats();
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', function(e) {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toLowerCase();

    if (gamePhase === 'betting') {
        if (key === '1') addBet(10);
        else if (key === '2') addBet(25);
        else if (key === '3') addBet(50);
        else if (key === '4') addBet(100);
        else if (key === 'enter') placeBet();
        else if (key === 'c' || key === 'escape') clearBet();
        else if (key === 'r') rebet();
    } else if (gamePhase === 'insurance') {
        if (key === 'y') takeInsurance();
        else if (key === 'n') declineInsurance();
    } else if (gamePhase === 'playing') {
        if (key === 'h') hit();
        else if (key === 's') stand();
        else if (key === 'd') doubleDown();
        else if (key === 'p') split();
        else if (key === 'u') surrender();
    } else if (gamePhase === 'roundOver') {
        if (key === 'enter') newRound();
    }
});

// --- Init ---
deck = shuffleDeck(createDeck());
messageEl.textContent = 'Place your bet.';
renderGame();
