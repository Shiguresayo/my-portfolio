
const SUITS = [
  { code: "S", symbol: "♠", color: "black" },
  { code: "H", symbol: "♥", color: "red" },
  { code: "D", symbol: "♦", color: "red" },
  { code: "C", symbol: "♣", color: "black" }
];

const RANKS = [
  "2", "3", "4", "5", "6", "7",
  "8", "9", "10", "J", "Q", "K", "A"
];

const deck = [];

for (const suit of SUITS) {
  RANKS.forEach((label, index) => {
    deck.push({
      id: `${suit.code}${index + 2}`,
      suit: suit.symbol,
      color: suit.color,
      rank: index + 2,
      label
    });
  });
}

const STAGES = [
  { name: "PREFLOP", label: "PREFLOP", board: 0 },
  { name: "FLOP", label: "FLOP", board: 3 },
  { name: "TURN", label: "TURN", board: 4 },
  { name: "RIVER", label: "RIVER", board: 5 }
];

const SIMULATIONS = 5000;

let hero = [];
let opponent = [];
let fullBoard = [];
let stageIndex = 0;
let score = 0;
let streak = 0;
let bestStreak = 0;
let answered = false;

const $ = id => document.getElementById(id);

// シャッフル
function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// カード配布
function dealCards() {
  const shuffled = shuffle(deck);

  hero = shuffled.slice(0, 2);
  opponent = shuffled.slice(2, 4);
  fullBoard = shuffled.slice(4, 9);
}

// カード表示
function renderCard(card) {
  const element = document.createElement("div");
  element.className = `card ${card.color}`;

  const rank = card.label === "10" ? "T" : card.label;
  element.textContent = `${rank}${card.suit}`;

  return element;
}

// 空のカード表示
function renderEmpty() {
  const element = document.createElement("div");
  element.className = "card empty";
  element.textContent = "–";

  return element;
}

// ゲーム画面更新
function renderGame() {
  $("heroCards").replaceChildren(
    ...hero.map(renderCard)
  );

  const visibleCount = STAGES[stageIndex].board;

  const visibleCards = fullBoard
    .slice(0, visibleCount)
    .map(renderCard);

  const emptyCards = Array.from(
    { length: 5 - visibleCount },
    renderEmpty
  );

  $("boardCards").replaceChildren(
    ...visibleCards,
    ...emptyCards
  );

  $("roundNumber").textContent =
    `ROUND ${stageIndex + 1} / 4`;

  $("streetName").textContent =
    STAGES[stageIndex].name;

  $("streetBadge").textContent =
    STAGES[stageIndex].label;

  $("score").textContent = `${score} / 4`;

  $("accuracy").textContent =
    `${Math.round(score / (stageIndex || 1) * 100)}%`;

  $("streak").textContent = streak;

  $("questionPanel").hidden = false;
  $("finalPanel").hidden = true;
  $("answerResult").hidden = true;

  $("message").textContent = "回答を選択してください。";

  answered = false;

  document.querySelectorAll(".choice").forEach(button => {
    button.disabled = false;
    button.classList.remove("correct", "wrong");

    button.textContent = [
      "35%以下",
      "35〜50%",
      "50〜65%",
      "65%以上"
    ][Number(button.dataset.answer)];
  });
}

// 5枚のカードから役を評価する
function evaluateFive(cards) {
  const values = cards
    .map(card => card.rank)
    .sort((a, b) => b - a);

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

  const flush = cards.every(
    card => card.suit === cards[0].suit
  );

  const unique = [...new Set(values)];
  let straightHigh = 0;

  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      straightHigh = unique[0];
    } else if (unique.join(",") === "14,5,4,3,2") {
      straightHigh = 5;
    }
  }

  // ストレートフラッシュ
  if (flush && straightHigh) {
    return [8, straightHigh];
  }

  // フォーカード
  if (groups[0].count === 4) {
    return [7, groups[0].value, groups[1].value];
  }

  // フルハウス
  if (groups[0].count === 3 && groups[1].count === 2) {
    return [6, groups[0].value, groups[1].value];
  }

  // フラッシュ
  if (flush) {
    return [5, ...values];
  }

  // ストレート
  if (straightHigh) {
    return [4, straightHigh];
  }

  // スリーカード
  if (groups[0].count === 3) {
    return [
      3,
      groups[0].value,
      ...groups.slice(1)
        .map(group => group.value)
        .sort((a, b) => b - a)
    ];
  }

  // ツーペア
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups
      .filter(group => group.count === 2)
      .map(group => group.value)
      .sort((a, b) => b - a);

    const kicker = groups.find(
      group => group.count === 1
    ).value;

    return [2, ...pairs, kicker];
  }

  // ワンペア
  if (groups[0].count === 2) {
    return [
      1,
      groups[0].value,
      ...groups
        .filter(group => group.count === 1)
        .map(group => group.value)
        .sort((a, b) => b - a)
    ];
  }

  // ハイカード
  return [0, ...values];
}

// 役の強さを比較
function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;

    if (av !== bv) {
      return av - bv;
    }
  }

  return 0;
}

// 組み合わせを作る
function combinations(cards, size) {
  const result = [];

  function search(start, current) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (
      let i = start;
      i <= cards.length - (size - current.length);
      i++
    ) {
      current.push(cards[i]);
      search(i + 1, current);
      current.pop();
    }
  }

  search(0, []);

  return result;
}

// 7枚から最強の5枚を評価
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

// 現在のストリートにおけるEquityを推定
function calculateEquity(visibleBoard) {
  const knownIds = new Set([
    ...hero.map(card => card.id),
    ...visibleBoard.map(card => card.id)
  ]);

  const remaining = deck.filter(
    card => !knownIds.has(card.id)
  );

  const missingBoard = 5 - visibleBoard.length;

  let equityTotal = 0;

  for (let i = 0; i < SIMULATIONS; i++) {
    const shuffled = shuffle(remaining);

    const simulatedOpponent = shuffled.slice(0, 2);

    const completedBoard = [
      ...visibleBoard,
      ...shuffled.slice(2, 2 + missingBoard)
    ];

    const heroScore = evaluateSeven([
      ...hero,
      ...completedBoard
    ]);

    const opponentScore = evaluateSeven([
      ...simulatedOpponent,
      ...completedBoard
    ]);

    const comparison = compareScores(
      heroScore,
      opponentScore
    );

    if (comparison > 0) {
      equityTotal += 1;
    } else if (comparison === 0) {
      equityTotal += 0.5;
    }
  }

  return equityTotal / SIMULATIONS * 100;
}

// 4択の区分
function getCategory(equity) {
  if (equity >= 65) return 3;
  if (equity >= 50) return 2;
  if (equity > 35) return 1;
  return 0;
}

// 区分名
function getCategoryLabel(category) {
  return [
    "35%以下",
    "35〜50%",
    "50〜65%",
    "65%以上"
  ][category];
}

// スコア更新
function updateScore() {
  $("score").textContent = `${score} / 4`;
  $("streak").textContent = streak;

  $("accuracy").textContent =
    `${Math.round(score / (stageIndex + 1) * 100)}%`;
}

// 回答処理
function answerQuestion(selected) {
  if (answered) return;

  answered = true;

  const visibleBoard = fullBoard.slice(
    0,
    STAGES[stageIndex].board
  );

  const equity = calculateEquity(visibleBoard);
  const correct = getCategory(equity);

  const isCorrect = selected === correct;

  if (isCorrect) {
    score++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
  } else {
    streak = 0;
  }

  document.querySelectorAll(".choice").forEach(button => {
    const answer = Number(button.dataset.answer);

    // 回答後もクリックできるようにする
    button.disabled = false;

    button.classList.remove("correct", "wrong");

    if (answer === correct) {
      button.classList.add("correct");
      button.textContent = `正解：${getCategoryLabel(answer)}`;
    } else if (answer === selected) {
      button.classList.add("wrong");
      button.textContent = `不正解：${getCategoryLabel(answer)}`;
    }
  });

  $("actualEquity").textContent =
    `${equity.toFixed(2)}%`;

  $("answerMessage").textContent = isCorrect
    ? "正解です。もう一度選択肢を押すと次へ進みます。"
    : "不正解です。もう一度選択肢を押すと次へ進みます。";

  $("message").textContent =
    `正解：${getCategoryLabel(correct)}`;

  $("answerResult").hidden = false;

  $("nextButton").textContent =
    stageIndex === 3 ? "結果を見る" : "次のストリートへ";

  updateScore();
}

// 次のストリートへ
function nextStage() {
  if (!answered) return;

  if (stageIndex < 3) {
    stageIndex++;
    renderGame();
  } else {
    showFinalResult();
  }
}

// 最終結果
function showFinalResult() {
  $("questionPanel").hidden = true;
  $("finalPanel").hidden = false;

  const accuracy = Math.round(score / 4 * 100);

  $("finalScore").textContent = `${score} / 4`;

  $("finalAccuracy").textContent =
    `正答率 ${accuracy}%`;

  if (score === 4) {
    $("finalComment").textContent =
      "全問正解です。";
  } else if (score >= 3) {
    $("finalComment").textContent =
      "3問正解です。";
  } else if (score >= 2) {
    $("finalComment").textContent =
      "2問正解です。";
  } else {
    $("finalComment").textContent =
      "1問正解です。";
  }

  $("finalComment").textContent +=
    ` 最高連続正解数：${bestStreak}`;
}

// 新しいゲーム
function startGame() {
  dealCards();

  stageIndex = 0;
  score = 0;
  streak = 0;
  bestStreak = 0;

  renderGame();
}

// 選択肢のクリック処理
document.querySelectorAll(".choice").forEach(button => {
  button.addEventListener("click", () => {
    if (answered) {
      // 回答済みなら次のストリートへ
      nextStage();
    } else {
      // 未回答なら回答として処理
      answerQuestion(Number(button.dataset.answer));
    }
  });
});

// 次へボタン
$("nextButton").addEventListener("click", nextStage);

// 再プレイボタン
$("restartButton").addEventListener("click", startGame);

// ゲーム開始
startGame();
