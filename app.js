const words = [
  { char: "人", emoji: "🧑" },
  { char: "天", emoji: "☀️" },
  { char: "月", emoji: "🌙" },
  { char: "口", emoji: "👄" },
  { char: "耳", emoji: "👂" },
  { char: "眼", emoji: "👀" },
  { char: "鼻", emoji: "👃" },
  { char: "手", emoji: "✋" },
  { char: "腳", emoji: "🦶" },
  { char: "男", emoji: "👦" },
  { char: "女", emoji: "👧" },
  { char: "門", emoji: "🚪" },
  { char: "衣", emoji: "👕" },
  { char: "大", emoji: "🦒" },
  { char: "小", emoji: "🐜" },
  { char: "水", emoji: "💧" },
  { char: "魚", emoji: "🐟" },
  { char: "果", emoji: "🍎" },
  { char: "菜", emoji: "🥬" },
  { char: "米", emoji: "🍚" }
];

const homePage = document.getElementById("home-page");
const learnPage = document.getElementById("learn-page");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const wordEmoji = document.getElementById("word-emoji");
const wordChar = document.getElementById("word-char");

let currentIndex = -1;

function randomIndexExcept(previousIndex, total) {
  if (total <= 1) return 0;

  let index = Math.floor(Math.random() * total);
  while (index === previousIndex) {
    index = Math.floor(Math.random() * total);
  }
  return index;
}

function showNextWord() {
  currentIndex = randomIndexExcept(currentIndex, words.length);
  const currentWord = words[currentIndex];

  wordEmoji.textContent = currentWord.emoji;
  wordEmoji.setAttribute("aria-label", `${currentWord.char} 的圖案`);
  wordChar.textContent = currentWord.char;
}

startBtn.addEventListener("click", () => {
  homePage.classList.remove("active");
  learnPage.classList.add("active");
  showNextWord();
});

nextBtn.addEventListener("click", showNextWord);
