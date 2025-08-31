// --- Configuration ---
const OPENAI_KEY = "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"; // Replace with your key or add a prompt for users to input their own key
const USE_CORS_PROXY = true;
const CORS_PROXY = "https://corsproxy.io/?";

// -- Default Questions Data (fallback) --
const defaultData = [
  ["What is the color of the sky?", ["blue", "light blue"], "English", "", "Science"],
  ["How do you spell 'cat'?", ["cat"], "English", "/kæt/", "Spelling"],
  ["2 plus 2 equals?", ["4", "four"], "English", "", "Math"],
  ["ما هو لون التفاحة؟", ["أحمر", "اخضر"], "Arabic", "", "Science"],
  ["Name an animal that barks.", ["dog"], "English", "", "Animals"],
  ["Comment tu dis 'merci' en anglais?", ["thank you"], "French", "", "Grammar"],
];
let data = [];
let index = 0;
let stars = localStorage.getItem('zahra_stars') ? parseInt(localStorage.getItem('zahra_stars')) : 0;

// --- DOM elements ---
const homeScreen = document.getElementById('homeScreen');
const questionScreen = document.getElementById('questionScreen');
const generateBtn = document.getElementById('generateBtn');
const dailyBtn = document.getElementById('dailyBtn');
const resetBtn = document.getElementById('resetBtn');
const loading = document.getElementById('loading');
const wordDiv = document.getElementById('word');
const feedbackDiv = document.getElementById('feedback');
const answerInput = document.getElementById('answer');
const micButton = document.getElementById('micButton');
const speakBtn = document.getElementById('speakBtn');
const nextBtn = document.getElementById('nextBtn');
const homeBtn = document.getElementById('homeBtn');
const starCount = document.getElementById('starCount');
const starCount2 = document.getElementById('starCount2');
const topicSelect = document.getElementById('topicSelect');
const languageSelect = document.getElementById('languageSelect');
const currentTopic = document.getElementById('currentTopic');
const currentLanguage = document.getElementById('currentLanguage');

// --- Helper ---
function showHome() {
  homeScreen.classList.remove('hidden');
  questionScreen.classList.add('hidden');
  feedbackDiv.textContent = '';
  answerInput.value = '';
  setStars(stars);
}

function showQuestion() {
  if (data.length === 0) data = [...defaultData];
  const [question, accepted, lang, hint, topic] = data[index];
  wordDiv.textContent = question + (hint ? ` (${hint})` : "");
  currentTopic.textContent = topic || "";
  currentLanguage.textContent = lang || "";
  feedbackDiv.textContent = "";
  answerInput.value = "";
  setStars(stars);
  homeScreen.classList.add('hidden');
  questionScreen.classList.remove('hidden');
}

function setStars(val) {
  starCount.textContent = val;
  starCount2.textContent = val;
  localStorage.setItem('zahra_stars', val);
}

function showLoading(show = true) {
  loading.style.display = show ? "inline-block" : "none";
}

// --- AI Generation Functions ---
async function generateNewQuestion() {
  const topic = topicSelect.value;
  const lang = languageSelect.value;
  const prompt = `You are an educational content creator for 7-year-old girls. Generate ONE question strictly in format: [displayText, [commaSeparatedAnswers], language, phoneticHint, topic]. The question must be in ${lang} about ${topic}. Return ONLY a valid JSON array with no extra text. Example: ["What color is the sun?", ["yellow"], "English", "", "Science"]`;
  await callAI(prompt, false);
}
async function generateDailySet() {
  const prompt = `You are an educational content creator for 7-year-old girls. Generate 8 varied questions in JSON format: [displayText, [answers], language, phoneticHint, topic]. Use subjects: Spelling, Math, Science, Grammar, Animals, Space. Use: English, Arabic, Russian, French. Example: [["cat",["cat"],"English","/kæt/","Spelling"],["ما هو لون التفاحة؟",["أحمر"],"Arabic","","Science"]]. Strictly output only a JSON array of arrays.`;
  await callAI(prompt, true);
}

async function callAI(prompt, isSet) {
  showLoading(true);
  let endpoint = "https://api.openai.com/v1/chat/completions";
  if (USE_CORS_PROXY) endpoint = CORS_PROXY + endpoint;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + OPENAI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{role:"system", content: prompt}],
        temperature: 0.7,
        max_tokens: isSet ? 830 : 180,
      })
    });
    if (!res.ok) throw new Error("API Error");
    const json = await res.json();
    let txt = json.choices?.[0]?.message?.content?.trim();
    let arr;
    try {
      arr = JSON.parse(txt);
    } catch{
      // Try to extract JSON
      const match = txt.match(/\[.*\]$/s);
      if (match) arr = JSON.parse(match[0]);
    }
    if (!arr) throw new Error("Parse error");
    data = isSet ? arr : [arr];
    index = 0;
    showQuestion();
  } catch (e) {
    alert("AI generation failed. Sample questions will be shown.");
    data = [...defaultData];
    index = 0;
    showQuestion();
  } finally { showLoading(false); }
}

// --- Event Listeners ---
generateBtn.onclick = generateNewQuestion;
dailyBtn.onclick = generateDailySet;
resetBtn.onclick = () => {
  data = [...defaultData];
  index = 0;
  showQuestion();
};
homeBtn.onclick = showHome;
nextBtn.onclick = () => {
  index = (index + 1) % data.length;
  showQuestion();
};
answerInput.onkeyup = (e) => {
  if (e.key === 'Enter') checkAnswer();
};
micButton.onclick = startSpeechToText;
speakBtn.onclick = () => {
  const utter = new SpeechSynthesisUtterance(wordDiv.textContent);
  window.speechSynthesis.speak(utter);
};

// --- Speech to Text ---
function startSpeechToText() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Speech recognition not supported.');
    return;
  }
  micButton.style.background = "#ffc";
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = (data[index] && data[index][2] === "Arabic") ? "ar" : "en";
  recognition.continuous = false;
  recognition.onresult = e => {
    answerInput.value = e.results[0][0].transcript;
    micButton.style.background = "#ded3fc";
    checkAnswer();
  };
  recognition.onend = () => micButton.style.background = "#ded3fc";
  recognition.start();
}

// --- Check Answer ---
function checkAnswer() {
  const ans = (answerInput.value||"").trim().toLowerCase();
  const accepted = data[index][1].map(e => (e||"").toLowerCase().trim());
  if (accepted.includes(ans)) {
    feedbackDiv.textContent = "🌟 Correct! You got a star!";
    stars += 1;
    setStars(stars);
    setTimeout(() => { index = (index + 1) % data.length; showQuestion();}, 1100);
  } else {
    feedbackDiv.textContent = "❌ Try again (hint: check spelling and language)";
  }
}

// --- Init ---
showHome();

