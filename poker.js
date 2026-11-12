
const suits = [
  { symbol: "♠", name: "S" },
  { symbol: "♥", name: "H" },
  { symbol: "♦", name: "D" },
  { symbol: "♣", name: "C" }
];

const ranks = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "T" },
  { value: 11, label: "J" },
  { value: 12, label: "Q" },
  { value: 13, label: "K" },
  { value: 14, label: "A" }
];

const deck = [];

for (const suit of suits) {
  for (const rank of ranks) {
    deck.push({
      id: `${suit.name}${rank.value}`,
      suit: suit.symbol,
      rank: rank.value,
      label: `${suit.symbol}${rank.label}`
    });
  }
}

const heroContainer = document.getElementById("heroCards");
const boardContainer = document.getElementById("boardCards");
const opponentContainer = document.getElementById("opponentCardInputs");

const randomModeButton = document.getElementById("randomMode");
const knownModeButton = document.getElementById("knownMode");
const opponentCount = document.getElementById("opponents");
const iterationsSelect = document.getElementById("iterations");
const knownOpponents = document.getElementById("knownOpponents");

let mode = "random";

function createCardSelect(name) {
  const select = document.createElement("select");
  select.className = "card-select";
  select.dataset.cardInput = "true";

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = name;
  select.appendChild(empty);

  for (const card of deck) {
    const option = document.createElement("option");
    option.value = card.id;
    option.textContent = card.label;
    select.appendChild(option);
  }

  select.addEventListener("change", refreshCards);
  return select;
}

function createSlots() {
  for (let i = 0; i < 2; i++) {
    heroContainer.appendChild(createCardSelect(`手札 ${i + 1}`));
  }

  for (let i = 0; i < 5; i++) {
    boardContainer.appendChild(createCardSelect(`Board ${i + 1}`));
  }

  updateOpponentInputs();
}

function updateOpponentInputs() {
  const count = Number(opponentCount.value);
  const previous = [...opponentContainer.querySelectorAll("select")]
    .map(select => select.value);

  opponentContainer.innerHTML = "";

  if (mode !== "known") {
    knownOpponents.hidden = true;
    refreshCards();
    return;
  }

  knownOpponents.hidden = false;

  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "opponent-row";

    const title = document.createElement("strong");
    title.textContent = `相手 ${i + 1}`;

    const cards = document.createElement("div");
    cards.className = "opponent-cards";

    for (let j = 0; j < 2; j++) {
      const select = createCardSelect(`手札 ${j + 1}`);
      select.value = previous[i * 2 + j] || "";
      cards.appendChild(select);
    }

    row.append(title, cards);
    opponentContainer.appendChild(row);
  }

  refreshCards();
}

function getAllCardSelects() {
  return [...document.querySelectorAll("select[data-card-input='true']")];
}

function refreshCards() {
  const selects = getAllCardSelects();
  const selected = selects
    .map(select => select.value)
    .filter(Boolean);

  for (const select of selects) {
    const ownValue = select.value;

    for (const option of select.options) {
      if (!option.value) continue;

      const usedElsewhere = selected.includes(option.value) &&
        option.value !== ownValue;

      option.disabled = usedElsewhere;
    }
  }
}

function getCard(id) {
  return deck.find(card => card.id === id);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function combinations(cards, size) {
  const result = [];

  function search(start, current) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i <= cards.length - (size - current.length); i++) {
      current.push(cards[i]);
      search(i + 1, current);
      current.pop();
    }
  }

  search(0, []);
  return result;
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;

    if (av !== bv) return av - bv;
  }

  return 0;
}

function evaluateFive(cards) {
  const values = cards.map(card => card.rank).sort((a, b) => b - a);
  const counts = {};

  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }

  const groups = Object.entries(counts)
    .map(([value, count]) => ({
      value: Number(value),
      count
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const flush = cards.every(card => card.suit === cards[0].suit);

  const unique = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh = 0;

  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      straightHigh = unique[0];
    } else if (unique.join(",") === "14,5,4,3,2") {
      straightHigh = 5;
    }
  }

  if (flush && straightHigh) return [8, straightHigh];

  if (groups[0].count === 4) {
    return [7, groups[0].value, groups[1].value];
  }

  if (groups[0].count === 3 && groups[1].count === 2) {
    return [6, groups[0].value, groups[1].value];
  }

  if (flush) return [5, ...values];

  if (straightHigh) return [4, straightHigh];

  if (groups[0].count === 3) {
    return [
      3,
      groups[0].value,
      ...groups.slice(1).map(group => group.value).sort((a, b) => b - a)
    ];
  }

  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups
      .filter(group => group.count === 2)
      .map(group => group.value)
      .sort((a, b) => b - a);

    const kicker = groups.find(group => group.count === 1).value;
    return [2, ...pairs, kicker];
  }

  if (groups[0].count === 2) {
    return [
      1,
      groups[0].value,
      ...groups.filter(group => group.count === 1)
        .map(group => group.value)
        .sort((a, b) => b - a)
    ];
  }

  return [0, ...values];
}

function evaluateSeven(cards) {
  let best = null;

  for (const five of combinations(cards, 5)) {
    const score = evaluateFive(five);

    if (!best || compareScores(score, best) > 0) {
      best = score;
    }
  }

  return best;
}

function calculate() {
  const hero = [...heroContainer.querySelectorAll("select")]
    .map(select => getCard(select.value));

  const board = [...boardContainer.querySelectorAll("select")]
    .map(select => getCard(select.value))
    .filter(Boolean);

  if (hero.some(card => !card)) {
    alert("自分の手札を2枚指定してください。");
    return;
  }

  const knownHands = [];

  if (mode === "known") {
    const rows = [...opponentContainer.querySelectorAll(".opponent-row")];

    for (let i = 0; i < rows.length; i++) {
      const cards = [...rows[i].querySelectorAll("select")]
        .map(select => getCard(select.value));

      if (cards.some(card => !card)) {
        alert(`相手 ${i + 1} の手札を2枚指定してください。`);
        return;
      }

      knownHands.push(cards);
    }
  }

  const allKnown = [
    ...hero,
    ...board,
    ...knownHands.flat()
  ];

  const ids = allKnown.map(card => card.id);

  if (new Set(ids).size !== ids.length) {
    alert("同じカードが重複しています。");
    return;
  }

  const opponents = Number(opponentCount.value);
  const iterations = Number(iterationsSelect.value);

  const remainingDeck = deck.filter(card => !ids.includes(card.id));
  const missingBoard = 5 - board.length;
  const cardsNeeded = missingBoard +
    (mode === "random" ? opponents * 2 : 0);

  if (remainingDeck.length < cardsNeeded) {
    alert("カードが不足しています。");
    return;
  }

  let wins = 0;
  let ties = 0;
  let losses = 0;
  let equityTotal = 0;

  for (let trial = 0; trial < iterations; trial++) {
    const shuffled = shuffle(remainingDeck);
    let index = 0;

    const completedBoard = [
      ...board,
      ...shuffled.slice(index, index + missingBoard)
    ];

    index += missingBoard;

    const playerHands = [hero];

    if (mode === "known") {
      playerHands.push(...knownHands);
    } else {
      for (let i = 0; i < opponents; i++) {
        playerHands.push(shuffled.slice(index, index + 2));
        index += 2;
      }
    }

    const scores = playerHands.map(hand =>
      evaluateSeven([...hand, ...completedBoard])
    );

    let bestScore = scores[0];

    for (const score of scores.slice(1)) {
      if (compareScores(score, bestScore) > 0) {
        bestScore = score;
      }
    }

    const winners = scores.filter(score =>
      compareScores(score, bestScore) === 0
    ).length;

    const heroIsWinner =
      compareScores(scores[0], bestScore) === 0;

    if (!heroIsWinner) {
      losses++;
    } else if (winners === 1) {
      wins++;
    } else {
      ties++;
    }

    if (heroIsWinner) {
      equityTotal += 1 / winners;
    }
  }

  const winRate = wins / iterations * 100;
  const tieRate = ties / iterations * 100;
  const lossRate = losses / iterations * 100;
  const equity = equityTotal / iterations * 100;

  document.getElementById("winRate").textContent =
    `${winRate.toFixed(2)}%`;

  document.getElementById("tieRate").textContent =
    `${tieRate.toFixed(2)}%`;

  document.getElementById("lossRate").textContent =
    `${lossRate.toFixed(2)}%`;

  document.getElementById("equity").textContent =
    `${equity.toFixed(2)}%`;

  document.getElementById("resultInfo").textContent =
    `${iterations.toLocaleString()}回のシミュレーション / 相手 ${opponents}人`;

  document.getElementById("results").hidden = false;
}

randomModeButton.addEventListener("click", () => {
  mode = "random";
  randomModeButton.classList.add("active");
  knownModeButton.classList.remove("active");
  updateOpponentInputs();
});

knownModeButton.addEventListener("click", () => {
  mode = "known";
  knownModeButton.classList.add("active");
  randomModeButton.classList.remove("active");
  updateOpponentInputs();
});

opponentCount.addEventListener("change", updateOpponentInputs);

document.getElementById("calculate")
  .addEventListener("click", calculate);

createSlots();
