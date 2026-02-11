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
const speakCantoneseBtn = document.getElementById("speak-cantonese-btn");
const speakMandarinBtn = document.getElementById("speak-mandarin-btn");
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

function findVoiceByLanguage(voices, preferredLangs) {
  for (const lang of preferredLangs) {
    const exactVoice = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
    if (exactVoice) {
      return exactVoice;
    }

    const partialVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (partialVoice) {
      return partialVoice;
    }
  }

  return null;
}

function getVoicesWithWait(timeoutMs = 1200) {
  if (!("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length > 0) {
    return Promise.resolve(initialVoices);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finalize = (voices) => {
      if (!settled) {
        settled = true;
        resolve(voices);
      }
    };

    const timer = window.setTimeout(() => {
      finalize(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      finalize(window.speechSynthesis.getVoices());
    };
  });
}

const VOICE_CONFIG = {
  cantonese: {
    label: "廣東話",
    preferredLangs: ["zh-HK", "yue-HK", "yue", "zh-TW", "zh-CN", "zh"]
  },
  mandarin: {
    label: "普通話",
    preferredLangs: ["zh-CN", "cmn-Hans-CN", "zh-TW", "zh-HK", "zh"]
  }
};

async function speakCurrentChar(mode) {
  const currentChar = wordChar.textContent.trim();
  if (!currentChar) return;

  if (!("speechSynthesis" in window)) {
    alert("此裝置/瀏覽器不支援語音功能。");
    return;
  }

  const config = VOICE_CONFIG[mode];
  if (!config) return;

  const voices = await getVoicesWithWait();
  const selectedVoice = findVoiceByLanguage(voices, config.preferredLangs);

  if (!selectedVoice) {
    alert(
      `此裝置未提供可用中文語音（包括${config.label}）。\n` +
      `你可以到系統「文字轉語音/TTS」下載中文語音，或改用其他瀏覽器/裝置。`
    );
    return;
  }

  // 避免手機疊音/卡住
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentChar);
  utterance.voice = selectedVoice;
  utterance.lang = selectedVoice.lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);

  // 若用到 fallback（例如冇 zh-HK，只能用 zh-CN）
  const target = config.preferredLangs[0].toLowerCase();
  const actual = (selectedVoice.lang || "").toLowerCase();
  if (!actual.startsWith(target)) {
    alert(`此裝置未有 ${config.label} 專用語音，已改用 ${selectedVoice.lang} 讀音。`);
  }
}

// ======= 綁定事件：每個按鈕只綁一次 =======
startBtn.addEventListener("click", () => {
  homePage.classList.remove("active");
  learnPage.classList.add("active");
  showNextWord();
});

nextBtn.addEventListener("click", showNextWord);
speakCantoneseBtn.addEventListener("click", () => speakCurrentChar("cantonese"));
speakMandarinBtn.addEventListener("click", () => speakCurrentChar("mandarin"));

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}
