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
const RESHUFFLE_THRESHOLD = 15;
const STARTING_BALANCE = 500;
const STORAGE_KEY_BALANCE = 'blackjack_balance';
const STORAGE_KEY_STATS = 'blackjack_stats';
const STORAGE_KEY_LAST_BET = 'blackjack_lastBet';

// --- Game State ---
let deck = [];
let playerHand = [];
let dealerHand = [];
let balance = loadBalance();
let currentBet = 0;
let lastBet = loadLastBet();
let gamePhase = 'betting'; // betting | playing | dealerTurn | roundOver
let stats = loadStats();

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
const bettingControls = document.getElementById('betting-controls');
const statsToggleBtn = document.getElementById('stats-toggle-btn');
const statsPanel = document.getElementById('stats-panel');

// --- Deck Functions ---
function createDeck() {
    const d = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            d.push({ suit, rank, value: RANK_VALUES[rank] });
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
    playerHand = [dealCard(), dealCard()];
    dealerHand = [dealCard(), dealCard()];

    if (isBlackjack(playerHand) || isBlackjack(dealerHand)) {
        gamePhase = 'roundOver';
        revealAndResolve();
        return;
    }

    gamePhase = 'playing';
    renderGame();
}

function hit() {
    if (gamePhase !== 'playing') return;
    playerHand.push(dealCard());
    const { total } = calculateHandValue(playerHand);
    if (total > 21) {
        gamePhase = 'roundOver';
        resolveRound();
        return;
    }
    if (total === 21) {
        stand();
        return;
    }
    renderGame();
}

function stand() {
    if (gamePhase !== 'playing') return;
    gamePhase = 'dealerTurn';
    renderGame();
    dealerPlay();
}

function doubleDown() {
    if (gamePhase !== 'playing') return;
    if (playerHand.length !== 2) return;
    if (currentBet > balance) return;

    balance -= currentBet;
    currentBet *= 2;
    playerHand.push(dealCard());

    const { total } = calculateHandValue(playerHand);
    if (total > 21) {
        gamePhase = 'roundOver';
        resolveRound();
        return;
    }

    gamePhase = 'dealerTurn';
    renderGame();
    dealerPlay();
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

function resolveRound() {
    const player = calculateHandValue(playerHand);
    const dealer = calculateHandValue(dealerHand);
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerHand);
    let msg = '';
    let net = 0; // net gain for this round (negative = loss)

    if (playerBJ && dealerBJ) {
        msg = 'Both have Blackjack — Push!';
        balance += currentBet;
        stats.pushes++;
        stats.blackjacks++;
    } else if (playerBJ) {
        const payout = Math.floor(currentBet * 1.5);
        msg = 'Blackjack! You win $' + payout + '!';
        balance += currentBet + payout;
        net = payout;
        stats.wins++;
        stats.blackjacks++;
    } else if (dealerBJ) {
        msg = 'Dealer has Blackjack. You lose $' + currentBet + '.';
        net = -currentBet;
        stats.losses++;
    } else if (player.total > 21) {
        msg = 'Bust! You lose $' + currentBet + '.';
        net = -currentBet;
        stats.losses++;
    } else if (dealer.total > 21) {
        msg = 'Dealer busts! You win $' + currentBet + '!';
        balance += currentBet * 2;
        net = currentBet;
        stats.wins++;
    } else if (player.total > dealer.total) {
        msg = 'You win $' + currentBet + '!';
        balance += currentBet * 2;
        net = currentBet;
        stats.wins++;
    } else if (player.total < dealer.total) {
        msg = 'Dealer wins. You lose $' + currentBet + '.';
        net = -currentBet;
        stats.losses++;
    } else {
        msg = 'Push! Bet returned.';
        balance += currentBet;
        stats.pushes++;
    }

    stats.handsPlayed++;
    if (net > stats.biggestWin) stats.biggestWin = net;

    gamePhase = 'roundOver';
    messageEl.textContent = msg;
    saveState();
    renderGame();
}

function newRound() {
    if (balance === 0) {
        balance = STARTING_BALANCE;
        messageEl.textContent = 'Restarting with $' + STARTING_BALANCE + '. Good luck!';
        saveState();
    } else {
        messageEl.textContent = 'Place your bet.';
    }
    playerHand = [];
    dealerHand = [];
    currentBet = 0;
    gamePhase = 'betting';
    renderGame();
}

// --- Rendering ---
function createCardElement(card, faceDown) {
    const el = document.createElement('div');
    el.classList.add('card');

    if (faceDown) {
        el.classList.add('face-down');
        return el;
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    el.classList.add(isRed ? 'red' : 'black');

    const symbol = SUIT_SYMBOLS[card.suit];
    el.innerHTML =
        '<span class="card-corner top-left"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>' +
        '<span class="card-center">' + symbol + '</span>' +
        '<span class="card-corner bottom-right"><span class="card-rank">' + card.rank + '</span><span class="card-suit">' + symbol + '</span></span>';

    return el;
}

function renderGame() {
    // Balance and bet
    balanceEl.textContent = '$' + balance;
    betEl.textContent = currentBet > 0 ? '$' + currentBet : '-';

    // Dealer cards
    dealerCardsEl.innerHTML = '';
    const hideHole = gamePhase === 'playing';
    for (let i = 0; i < dealerHand.length; i++) {
        const faceDown = hideHole && i === 0;
        dealerCardsEl.appendChild(createCardElement(dealerHand[i], faceDown));
    }

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

    // Player cards
    playerCardsEl.innerHTML = '';
    for (const card of playerHand) {
        playerCardsEl.appendChild(createCardElement(card, false));
    }

    // Player score
    if (playerHand.length > 0) {
        const pv = calculateHandValue(playerHand);
        playerScoreEl.textContent = pv.total;
        playerScoreEl.classList.remove('hidden');
    } else {
        playerScoreEl.classList.add('hidden');
    }

    // Controls visibility
    const isBetting = gamePhase === 'betting';
    const isPlaying = gamePhase === 'playing';
    const isOver = gamePhase === 'roundOver';

    bettingControls.classList.toggle('hidden', !isBetting);
    rebetBtn.classList.toggle('hidden', !isBetting || lastBet === 0 || lastBet > balance);
    actionRow.classList.toggle('hidden', !isPlaying);
    dealAgainBtn.classList.toggle('hidden', !isOver);

    // Double down availability
    if (isPlaying) {
        const canDouble = playerHand.length === 2 && currentBet <= balance;
        doubleBtn.disabled = !canDouble;
    }

    renderStats();
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
    } else if (gamePhase === 'playing') {
        if (key === 'h') hit();
        else if (key === 's') stand();
        else if (key === 'd') doubleDown();
    } else if (gamePhase === 'roundOver') {
        if (key === 'enter') newRound();
    }
});

// --- Init ---
deck = shuffleDeck(createDeck());
messageEl.textContent = 'Place your bet.';
renderGame();
