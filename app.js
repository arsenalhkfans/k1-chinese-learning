"use strict";

/* =======================
   1) 字庫（20個字 + emoji）
======================= */
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

/* =======================
   2) DOM 元素
======================= */
const homePage = document.getElementById("home-page");
const learnPage = document.getElementById("learn-page");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const speakCantoneseBtn = document.getElementById("speak-cantonese-btn");
const speakMandarinBtn = document.getElementById("speak-mandarin-btn");
const wordEmoji = document.getElementById("word-emoji");
const wordChar = document.getElementById("word-char");

/* =======================
   3) 隨機抽字（避免連續重複）
======================= */
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

/* =======================
   4) 語音設定（你要求的優先序）
======================= */
const VOICE_CONFIG = {
  cantonese: {
    label: "廣東話",
    preferredLangs: ["yue-HK", "yue", "zh-HK", "zh-TW", "zh-CN", "zh"]
  },
  mandarin: {
    label: "普通話",
    // 普通話：只接受強普通話語系（避免落到 zh-HK/zh 導致粵語音色）
    preferredLangs: ["zh-CN", "cmn-Hans-CN", "cmn"],
    excludedLangPrefixes: ["yue"] // 普通話一律排除粵語語系
  }
};

/* =======================
   5) Voice 判斷（更準：用 lang + name/URI marker）
======================= */
function getVoiceTextMarker(voice) {
  const name = (voice?.name || "").toLowerCase();
  const uri = (voice?.voiceURI || "").toLowerCase();
  return `${name} ${uri}`;
}

function isCantoneseLikeVoice(voice) {
  const lang = (voice?.lang || "").toLowerCase();
  const marker = getVoiceTextMarker(voice);

  if (lang.startsWith("yue")) return true;
  // 有些系統 lang 可能係 zh-HK，但 name/uri 會寫 canton/yue/粵
  return (
    marker.includes("canton") ||
    marker.includes("yue") ||
    marker.includes("粵") ||
    marker.includes("粤")
  );
}

function isMandarinLikeVoice(voice) {
  const lang = (voice?.lang || "").toLowerCase();
  const marker = getVoiceTextMarker(voice);

  // 明確普通話語系
  if (lang === "zh-cn" || lang.startsWith("cmn")) return true;

  // 有些平台會把普通話藏在 voice 名稱
  return (
    marker.includes("mandarin") ||
    marker.includes("putonghua") ||
    marker.includes("guoyu") ||
    marker.includes("普通話") ||
    marker.includes("国语")
  );
}

/* =======================
   6) Voice 選擇（支援排除 + 模式判斷）
======================= */
function findVoiceByLanguage(voices, mode, preferredLangs, excludedLangPrefixes = []) {
  const blocked = excludedLangPrefixes.map((s) => (s || "").toLowerCase());

  const isBlocked = (voice) => {
    const lang = (voice?.lang || "").toLowerCase();
    return blocked.some((p) => lang.startsWith(p));
  };

  let candidates = Array.isArray(voices) ? [...voices] : [];

  if (mode === "mandarin") {
    // 1) 先排除粵語聲線（不止 yue*，仲要排除「看似粵語」的 zh-HK 粵語音色）
    candidates = candidates.filter((v) => !isBlocked(v) && !isCantoneseLikeVoice(v));
    // 2) 再要求「看似普通話」
    candidates = candidates.filter((v) => isMandarinLikeVoice(v));
  }

  // 先按 preferredLangs 精準匹配
  for (const lang of preferredLangs) {
    const lowerLang = (lang || "").toLowerCase();

    const exactVoice = candidates.find(
      (v) => !isBlocked(v) && (v?.lang || "").toLowerCase() === lowerLang
    );
    if (exactVoice) return exactVoice;

    const partialVoice = candidates.find(
      (v) => !isBlocked(v) && (v?.lang || "").toLowerCase().startsWith(lowerLang)
    );
    if (partialVoice) return partialVoice;
  }

  // 廣東話模式：如果 preferredLangs 撞唔到，仍可退一步用「看似粵語」聲線
  if (mode === "cantonese") {
    const cantonCandidate = candidates.find((v) => isCantoneseLikeVoice(v));
    if (cantonCandidate) return cantonCandidate;
  }

  return null;
}

/* =======================
   7) 等 voice list（iOS/Safari 友善）
======================= */
function getVoicesWithWait(timeoutMs = 1500) {
  if (!("speechSynthesis" in window)) return Promise.resolve([]);

  const initial = window.speechSynthesis.getVoices();
  if (initial && initial.length > 0) return Promise.resolve(initial);

  return new Promise((resolve) => {
    let settled = false;
    const previousHandler = window.speechSynthesis.onvoiceschanged;

    const finalize = (list) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      // 還原原有 handler（避免影響其他功能）
      window.speechSynthesis.onvoiceschanged = previousHandler || null;
      resolve(list || []);
    };

    const timer = window.setTimeout(() => {
      finalize(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.onvoiceschanged = () => {
      finalize(window.speechSynthesis.getVoices());
    };
  });
}

/* =======================
   8) 播放
======================= */
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
  const selectedVoice = findVoiceByLanguage(
    voices,
    mode,
    config.preferredLangs,
    config.excludedLangPrefixes || []
  );

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

  // 避免手機疊音/卡住
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentChar);
  utterance.voice = selectedVoice;

  // 普通話固定 zh-CN 會更穩（某些平台會依 lang 決定讀音）
  utterance.lang = mode === "mandarin" ? "zh-CN" : selectedVoice.lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);

  // fallback 提示（可留可刪；你之前有用）
  const actual = (selectedVoice.lang || "").toLowerCase();
  let isFallback = false;

  if (mode === "cantonese") {
    // 廣東話：理想係 yue*
    isFallback = !actual.startsWith("yue");
  } else {
    // 普通話：理想係 zh-CN 或 cmn*
    const target = (config.preferredLangs[0] || "").toLowerCase();
    isFallback = !(actual.startsWith(target) || actual.startsWith("cmn"));
  }

  if (isFallback) {
    alert(`此裝置未有 ${config.label} 專用語音，已改用 ${selectedVoice.lang} 讀音。`);
  }
}

/* =======================
   9) 事件綁定（每個按鈕只綁一次）
======================= */
startBtn.addEventListener("click", () => {
  homePage.classList.remove("active");
  learnPage.classList.add("active");
  showNextWord();
});

nextBtn.addEventListener("click", showNextWord);

speakCantoneseBtn.addEventListener("click", () => speakCurrentChar("cantonese"));
speakMandarinBtn.addEventListener("click", () => speakCurrentChar("mandarin"));

/* =======================
   10) 預熱 voices（iOS/Safari 常見：延遲載入）
======================= */
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.getVoices();
}
