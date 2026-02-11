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

const VOICE_CONFIG = {
  cantonese: {
    label: "廣東話",
    preferredLangs: ["yue-HK", "yue", "zh-HK", "zh-TW", "zh-CN", "zh"]
  },
  mandarin: {
    label: "普通話",
    // 普通話只接受強普通話語系，避免落到 zh-HK/zh 導致粵語讀音。
    preferredLangs: ["zh-CN", "cmn-Hans-CN", "cmn"]
  }
};

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

function getVoiceTextMarker(voice) {
  const name = (voice.name || "").toLowerCase();
  const uri = (voice.voiceURI || "").toLowerCase();
  return `${name} ${uri}`;
}

function isCantoneseLikeVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  const marker = getVoiceTextMarker(voice);

  if (lang.startsWith("yue")) return true;
  return marker.includes("canton") || marker.includes("yue") || marker.includes("粵") || marker.includes("粤");
}

function isMandarinLikeVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  const marker = getVoiceTextMarker(voice);

  if (lang === "zh-cn" || lang.startsWith("cmn")) return true;
  return marker.includes("mandarin") || marker.includes("putonghua") || marker.includes("guoyu") || marker.includes("普通話") || marker.includes("国语");
}

function findVoiceByLanguage(voices, mode, preferredLangs) {
  let candidates = [...voices];

  if (mode === "mandarin") {
    // 關鍵：普通話一律排除粵語聲線，再要求聲線本身屬普通話。
    candidates = candidates.filter((voice) => !isCantoneseLikeVoice(voice));
    candidates = candidates.filter((voice) => isMandarinLikeVoice(voice));
  }

  for (const lang of preferredLangs) {
    const lowerLang = lang.toLowerCase();

    const exactVoice = candidates.find((voice) => (voice.lang || "").toLowerCase() === lowerLang);
    if (exactVoice) {
      return exactVoice;
    }

    const partialVoice = candidates.find((voice) => (voice.lang || "").toLowerCase().startsWith(lowerLang));
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
    const previousHandler = window.speechSynthesis.onvoiceschanged;

    const finalize = (voiceList) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.speechSynthesis.onvoiceschanged = previousHandler || null;
      resolve(voiceList);
    };

    const timer = window.setTimeout(() => {
      finalize(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.onvoiceschanged = () => {
      finalize(window.speechSynthesis.getVoices());
    };
  });
}

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
  const selectedVoice = findVoiceByLanguage(voices, mode, config.preferredLangs);

  if (!selectedVoice) {
    if (mode === "mandarin") {
      alert("此裝置未安裝普通話語音，請到系統語音設定下載。");
      return;
    }

    alert(
      `此裝置未提供可用中文語音（包括${config.label}）。\n` +
        "你可以到系統「文字轉語音/TTS」下載中文語音，或改用其他瀏覽器/裝置。"
    );
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentChar);
  utterance.voice = selectedVoice;
  utterance.lang = mode === "mandarin" ? "zh-CN" : selectedVoice.lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);

  const target = config.preferredLangs[0].toLowerCase();
  const actual = (selectedVoice.lang || "").toLowerCase();
  const isFallback = mode === "cantonese" ? !actual.startsWith("yue") : !actual.startsWith(target);
  if (isFallback) {
    alert(`此裝置未有 ${config.label} 專用語音，已改用 ${selectedVoice.lang} 讀音。`);
  }
}

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
