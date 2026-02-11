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
    preferredLangs: ["yue-HK", "yue", "zh-HK", "zh-TW", "zh-CN", "zh"],
    excludedLangPrefixes: []
  },
  mandarin: {
    label: "普通話",
    preferredLangs: ["zh-CN", "cmn-Hans-CN"],
    excludedLangPrefixes: ["yue", "yue-HK"]
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

function isExcludedVoice(voiceLang, excludedLangPrefixes) {
  const normalizedLang = voiceLang.toLowerCase();
  return excludedLangPrefixes.some((prefix) => normalizedLang.startsWith(prefix.toLowerCase()));
}

function isCantoneseLikeVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  const name = (voice.name || "").toLowerCase();
  const uri = (voice.voiceURI || "").toLowerCase();
  const marker = `${name} ${uri}`;

  if (lang.startsWith("yue")) {
    return true;
  }

  return marker.includes("canton") || marker.includes("yue") || marker.includes("粵") || marker.includes("粤");
}

function isMandarinLikeVoice(voice) {
  const lang = (voice.lang || "").toLowerCase();
  if (lang === "zh-cn" || lang === "cmn-hans-cn" || lang.startsWith("cmn")) {
    return true;
  }

  const name = (voice.name || "").toLowerCase();
  const uri = (voice.voiceURI || "").toLowerCase();
  const marker = `${name} ${uri}`;
  return marker.includes("mandarin") || marker.includes("putonghua") || marker.includes("guoyu") || marker.includes("普通話") || marker.includes("国语");
}

function findVoiceByLanguage(voices, preferredLangs, excludedLangPrefixes = [], mode = "") {
  let filteredVoices = voices.filter((voice) => !isExcludedVoice(voice.lang, excludedLangPrefixes));

  if (mode === "mandarin") {
    filteredVoices = filteredVoices.filter((voice) => !isCantoneseLikeVoice(voice));
    filteredVoices = filteredVoices.filter((voice) => isMandarinLikeVoice(voice));
  }

  for (const lang of preferredLangs) {
    const exactVoice = filteredVoices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
    if (exactVoice) {
      return exactVoice;
    }

    const partialVoice = filteredVoices.find((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
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
      if (settled) {
        return;
      }
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
  if (!currentChar) {
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("此裝置不支援語音功能。\n可改用 Chrome/Safari 最新版本再試。");
    return;
  }

  const currentConfig = VOICE_CONFIG[mode];
  if (!currentConfig) {
    return;
  }

  const voices = await getVoicesWithWait();
  const selectedVoice = findVoiceByLanguage(
    voices,
    currentConfig.preferredLangs,
    currentConfig.excludedLangPrefixes,
    mode
  );

  if (!selectedVoice) {
    if (mode === "mandarin") {
      alert("此裝置未安裝普通話語音，請到系統語音設定下載。");
      return;
    }

    alert(`此手機未有可用中文語音。\n請到系統語言/語音設定下載 ${currentConfig.label} 語音，或者改用其他瀏覽器。`);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(currentChar);
  utterance.voice = selectedVoice;
  utterance.lang = mode === "mandarin" ? "zh-CN" : selectedVoice.lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  const targetLang = currentConfig.preferredLangs[0].toLowerCase();
  const isFallback =
    mode === "cantonese"
      ? !isCantoneseLikeVoice(selectedVoice)
      : !selectedVoice.lang.toLowerCase().startsWith(targetLang);
  if (isFallback) {
    alert(`此裝置未有 ${currentConfig.label} 專用語音，已改用 ${selectedVoice.lang} 讀音。`);
  }
}

startBtn.addEventListener("click", () => {
  homePage.classList.remove("active");
  learnPage.classList.add("active");
  showNextWord();
});

nextBtn.addEventListener("click", showNextWord);
speakCantoneseBtn.addEventListener("click", () => {
  speakCurrentChar("cantonese");
});
speakMandarinBtn.addEventListener("click", () => {
  speakCurrentChar("mandarin");
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}
