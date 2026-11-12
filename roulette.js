
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinButton = document.getElementById("spinButton");
const itemInput = document.getElementById("itemInput");
const addButton = document.getElementById("addButton");
const itemList = document.getElementById("itemList");
const result = document.getElementById("result");
const historyList = document.getElementById("historyList");
const resetButton = document.getElementById("resetButton");

const defaultItems = ["1", "2", "3", "4", "5", "6"];
const MAX_ITEMS = 100;

let items = JSON.parse(localStorage.getItem("rouletteItems") || "null")
  || [...defaultItems];

let history = JSON.parse(localStorage.getItem("rouletteHistory") || "[]");

let rotation = 0;
let spinning = false;

const colors = [
  "#8295a9", "#c9a6a0", "#9aab98", "#d7bd8d",
  "#9b91ad", "#819d9c", "#c49b83", "#9e9eae"
];

function saveItems() {
  localStorage.setItem("rouletteItems", JSON.stringify(items));
}

function saveHistory() {
  localStorage.setItem("rouletteHistory", JSON.stringify(history));
}

function drawWheel() {
  const center = 350;
  const radius = 330;

  ctx.clearRect(0, 0, 700, 700);

  if (items.length === 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ddd";
    ctx.fill();
    ctx.fillStyle = "#555";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("項目を追加してください", center, center);
    return;
  }

  const arc = Math.PI * 2 / items.length;

  items.forEach((item, i) => {
    const start = -Math.PI / 2 + i * arc;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();

    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(item, radius - 25, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(center, center, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

function renderItems() {
  itemList.innerHTML = "";

  items.forEach((item, index) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    const button = document.createElement("button");

    name.textContent = item;
    button.textContent = "削除";
    button.className = "delete";

    button.addEventListener("click", () => {
      if (spinning) return;

      items.splice(index, 1);
      saveItems();
      renderItems();
    });

    li.append(name, button);
    itemList.appendChild(li);
  });

  const count = document.getElementById("itemCount");
  if (count) count.textContent = `${items.length} / 100 件`;

  drawWheel();
}

function addItem() {
  const value = itemInput.value.trim();

  if (!value || spinning) return;

  if (items.length >= MAX_ITEMS) {
    result.textContent = "最大100個までです";
    return;
  }

  items.push(value);
  itemInput.value = "";

  saveItems();
  renderItems();
}

addButton.addEventListener("click", addItem);

itemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addItem();
});

function spin() {
  if (spinning || items.length === 0) return;

  spinning = true;
  spinButton.disabled = true;
  addButton.disabled = true;

  const winnerIndex = Math.floor(Math.random() * items.length);
  const arc = 360 / items.length;

  const currentAngle = ((rotation % 360) + 360) % 360;
  const targetAngle =
    (360 - (winnerIndex + 0.5) * arc) % 360;

  const adjustment =
    (targetAngle - currentAngle + 360) % 360;

  rotation += 360 * 5 + adjustment;

  canvas.style.transform = `rotate(${rotation}deg)`;

  result.textContent = "抽選中...";

  setTimeout(() => {
    const winner = items[winnerIndex];

    result.textContent = `結果：${winner}`;

    history.unshift(winner);
    saveHistory();
    renderHistory();

    spinning = false;
    spinButton.disabled = false;
    addButton.disabled = false;
  }, 4100);
}

spinButton.addEventListener("click", spin);

function renderHistory() {
  historyList.innerHTML = "";

  history.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${history.length - index}回目：${item}`;
    historyList.appendChild(li);
  });
}

resetButton.addEventListener("click", () => {
  if (spinning) return;

  items = [...defaultItems];
  history = [];
  rotation = 0;

  canvas.style.transition = "none";
  canvas.style.transform = "rotate(0deg)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      canvas.style.transition =
        "transform 4s cubic-bezier(.12,.72,.12,1)";
    });
  });

  saveItems();
  saveHistory();

  renderItems();
  renderHistory();

  result.textContent = "抽選してみましょう";
});

saveItems();
renderItems();
renderHistory();
