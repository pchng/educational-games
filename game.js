"use strict";

const storageKey = "wonder-patch.v1";
const roundLength = 5;
const levels = {
  easy: { name: "Easy", min: 1, max: 9, carries: [null, null, null, null, null] },
  medium: { name: "Medium", min: 10, max: 99, carries: [0, 0, 1, 1, 2] },
  hard: { name: "Hard", min: 100, max: 999, carries: [0, 1, 1, 2, 3] },
};

const byId = (id) => document.getElementById(id);
const screens = ["games", "levels", "play", "result"].map((name) => byId(name + "-screen"));
const levelButtons = [...document.querySelectorAll("[data-level]")];
const progressDots = [...byId("round-dots").children];
const equationAddends = byId("equation-addends");
const answer = byId("answer");
const checkButton = byId("check-answer");
const nextButton = byId("next-question");
const hintButton = byId("hint-toggle");
const hintContent = byId("hint-content");
const numberPad = byId("number-pad");
const cheerCard = byId("cheer-card");
const soundToggle = byId("sound-toggle");
const feedbackSounds = {
  correct: new Audio("./assets/correct.wav"),
  retry: new Audio("./assets/try-again.wav"),
};

let progress = loadProgress();
let activeLevel = null;
let currentSound = null;

function loadProgress() {
  const progress = { stars: 0, rounds: {}, soundEnabled: true };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== "object") return progress;

    if (Number.isSafeInteger(saved.stars) && saved.stars >= 0) {
      progress.stars = saved.stars;
    }
    progress.soundEnabled = saved.soundEnabled !== false;

    for (const [key, level] of Object.entries(levels)) {
      const round = saved.rounds?.[key];
      if (isValidRound(round, level)) progress.rounds[key] = round;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) showStorageUnavailable();
  }
  return progress;
}

function isValidRound(round, level) {
  return Array.isArray(round?.problems) &&
    round.problems.length === roundLength &&
    round.problems.every((pair) => Array.isArray(pair) && pair.length === 2 &&
      pair.every((number) => Number.isInteger(number) && number >= level.min && number <= level.max)) &&
    Number.isInteger(round.index) && round.index >= 0 && round.index <= roundLength &&
    typeof round.solved === "boolean";
}

function showStorageUnavailable() {
  byId("save-message").textContent = "Progress is kept while this page is open.";
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    showStorageUnavailable();
  }
}

function updateSoundToggle() {
  soundToggle.setAttribute("aria-pressed", String(progress.soundEnabled));
  byId("sound-label").textContent = progress.soundEnabled ? "Sound on" : "Sound off";
}

function playFeedbackSound(effect) {
  if (!progress.soundEnabled) return;

  currentSound?.pause();
  currentSound = feedbackSounds[effect];
  currentSound.currentTime = 0;
  currentSound.play().catch(() => {
    // Visual feedback is already shown if the browser blocks audio playback.
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function countCarries(left, right) {
  let carry = 0;
  let count = 0;
  while (left > 0 || right > 0) {
    carry = (left % 10) + (right % 10) + carry >= 10 ? 1 : 0;
    count += carry;
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return count;
}

function makeRound(levelKey) {
  const { min, max, carries } = levels[levelKey];
  const seen = new Set();
  const problems = shuffle(carries).map((wantedCarries) => {
    while (true) {
      const left = randomInt(min, max);
      const right = randomInt(min, max);
      const key = Math.min(left, right) + "+" + Math.max(left, right);
      const actualCarries = countCarries(left, right);
      if (seen.has(key) || (wantedCarries !== null && actualCarries !== wantedCarries)) continue;

      seen.add(key);
      return [left, right];
    }
  });
  return { problems, index: 0, solved: false };
}

function startRound(levelKey) {
  progress.rounds[levelKey] = makeRound(levelKey);
  saveProgress();
}

function updateStars() {
  const count = progress.stars;
  const unit = count === 1 ? "star" : "stars";
  byId("star-count").textContent = count;
  byId("star-unit").textContent = unit;
}

function showScreen(name, focusHeading) {
  for (const screen of screens) {
    screen.hidden = screen.id !== name + "-screen";
  }
  if (focusHeading) {
    window.scrollTo(0, 0);
    byId(name + "-screen").querySelector("h1").focus({ preventScroll: true });
  }
}

function renderRoute(focusHeading) {
  const [game, levelKey] = window.location.hash.slice(1).split("/");
  activeLevel = null;
  updateStars();

  if (game !== "addition") {
    showScreen("games", focusHeading);
    return;
  }

  if (!Object.hasOwn(levels, levelKey)) {
    for (const button of levelButtons) {
      const round = progress.rounds[button.dataset.level];
      button.querySelector(".level-action").textContent =
        round && round.index < roundLength ? "Resume" : "Start";
    }
    showScreen("levels", focusHeading);
    return;
  }

  activeLevel = levelKey;
  if (!progress.rounds[levelKey]) startRound(levelKey);

  const round = progress.rounds[levelKey];
  if (round.index === roundLength) {
    byId("result-message").textContent = "You earned " + roundLength + " stars on " + levels[levelKey].name + "!";
    showScreen("result", focusHeading);
    return;
  }

  const levelTag = byId("current-level");
  levelTag.textContent = levels[levelKey].name;
  levelTag.className = "level-tag level-" + levelKey;
  renderQuestion();
  showScreen("play", focusHeading);
}

function renderQuestion() {
  const round = progress.rounds[activeLevel];
  const [left, right] = round.problems[round.index];
  const questionNumber = round.index + 1;

  byId("question-number").textContent = "Question " + questionNumber + " of " + roundLength;
  progressDots.forEach((dot, index) => {
    dot.classList.toggle("solved", index < round.index || (index === round.index && round.solved));
    dot.classList.toggle("current", index === round.index && !round.solved);
  });
  byId("equation-text").textContent = left + " + " + right + " =";
  byId("top-addend").textContent = left;
  byId("bottom-addend").textContent = right;
  answer.value = round.solved ? left + right : "";
  answer.readOnly = round.solved;
  answer.removeAttribute("aria-invalid");
  numberPad.disabled = round.solved;
  checkButton.hidden = round.solved;
  nextButton.hidden = !round.solved;
  nextButton.textContent = questionNumber === roundLength ? "See your stars" : "Next question";
  hintButton.hidden = round.solved;
  setHintOpen(false);

  if (round.solved) {
    setFeedback("Nice work!", "You earned a star.");
  } else {
    setFeedback("You’ve got this!", "Each correct answer earns a star.");
  }
}

function setHintOpen(open) {
  hintContent.hidden = !open;
  hintButton.textContent = open ? "Hide hint" : "Show hint";
  hintButton.setAttribute("aria-expanded", String(open));
}

function makeDotGroup(count) {
  const group = document.createElement("span");
  group.className = "hint-group";
  for (let index = 0; index < count; index++) {
    group.append(document.createElement("span"));
  }
  return group;
}

function showHint() {
  if (!hintContent.hidden) {
    setHintOpen(false);
    return;
  }

  const round = progress.rounds[activeLevel];
  const [left, right] = round.problems[round.index];
  if (activeLevel === "easy") {
    const dots = document.createElement("div");
    dots.className = "hint-dots";
    dots.setAttribute("aria-hidden", "true");
    const plus = document.createElement("span");
    plus.textContent = "+";
    dots.append(makeDotGroup(left), plus, makeDotGroup(right));
    hintContent.replaceChildren("Count " + left + " dots, then count " + right + " more.", dots);
  } else {
    const nextPlaces = activeLevel === "hard" ? " Next add the tens, then the hundreds." : " Next add the tens.";
    hintContent.textContent = "Start with the ones on the right. Add " + (left % 10) + " and " + (right % 10) +
      ". If you make 10 or more, carry 1 to the tens column on the left." + nextPlaces;
  }
  setHintOpen(true);
}

function setFeedback(title, message, animation) {
  byId("feedback-title").textContent = title;
  byId("feedback-text").textContent = message;
  cheerCard.classList.remove("celebrate", "try-again");
  if (animation) {
    // Restart the animation when the same response occurs twice in a row.
    void cheerCard.offsetWidth;
    cheerCard.classList.add(animation);
  }
}

function checkAnswer(event) {
  event.preventDefault();
  const round = progress.rounds[activeLevel];
  if (!round || round.solved || round.index >= roundLength) return;

  if (answer.value.length === 0) {
    setFeedback("What’s your answer?", "Type a number or tap the number buttons.");
    return;
  }

  const [left, right] = round.problems[round.index];
  if (Number(answer.value) !== left + right) {
    answer.value = "";
    answer.setAttribute("aria-invalid", "true");
    setFeedback("Try again!", "You can tap Show hint if you get stuck.", "try-again");
    playFeedbackSound("retry");
    return;
  }

  round.solved = true;
  progress.stars++;
  saveProgress();
  updateStars();
  renderQuestion();
  setFeedback("Nice work!", "You earned a star.", "celebrate");
  playFeedbackSound("correct");
  nextButton.focus({ preventScroll: true });
}

function nextQuestion() {
  const round = progress.rounds[activeLevel];
  if (!round?.solved) return;

  round.index++;
  round.solved = false;
  saveProgress();

  if (round.index === roundLength) {
    renderRoute(true);
  } else {
    renderQuestion();
    equationAddends.scrollIntoView({ block: "nearest" });
    if (window.matchMedia("(pointer: fine)").matches) {
      answer.focus({ preventScroll: true });
    } else {
      equationAddends.focus({ preventScroll: true });
    }
  }
}

for (const button of levelButtons) {
  button.addEventListener("click", () => {
    const key = button.dataset.level;
    const round = progress.rounds[key];
    if (!round || round.index === roundLength) startRound(key);
    window.location.hash = "addition/" + key;
  });
}

answer.addEventListener("input", () => {
  answer.value = answer.value.replace(/\D/g, "");
  answer.removeAttribute("aria-invalid");
});

numberPad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || numberPad.disabled) return;

  if (button.id === "erase") {
    answer.value = answer.value.slice(0, -1);
  } else if (answer.value.length < answer.maxLength) {
    answer.value += button.dataset.digit;
  }
  answer.removeAttribute("aria-invalid");
});

byId("answer-form").addEventListener("submit", checkAnswer);
hintButton.addEventListener("click", showHint);
nextButton.addEventListener("click", nextQuestion);
soundToggle.addEventListener("click", () => {
  progress.soundEnabled = !progress.soundEnabled;
  if (!progress.soundEnabled) currentSound?.pause();
  updateSoundToggle();
  saveProgress();
});
byId("play-again").addEventListener("click", () => {
  startRound(activeLevel);
  renderRoute(true);
});

window.addEventListener("hashchange", () => renderRoute(true));
updateSoundToggle();
renderRoute(false);
