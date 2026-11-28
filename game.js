"use strict";

const storageKey = "wonder-patch.v1";
const byId = (id) => document.getElementById(id);
const screens = ["games", "levels", "steps", "play", "result"].map((name) => byId(name + "-screen"));
const levelButtons = [...document.querySelectorAll("[data-level]")];
const progressDots = [...byId("round-dots").children];
const equation = byId("equation");
const equationAddends = byId("equation-addends");
const answerFields = byId("answer-fields");
const answerDigits = [...answerFields.querySelectorAll("input")];
const carryNotes = [...byId("carry-fields").querySelectorAll("input")];
const columnClue = byId("column-clue");
const touchPointer = window.matchMedia("(pointer: coarse)");
const checkButton = byId("check-answer");
const nextButton = byId("next-question");
const hintButton = byId("hint-toggle");
const hintContent = byId("hint-content");
const numberPad = byId("number-pad");
const cheerCard = byId("cheer-card");
const soundToggle = byId("sound-toggle");
const foxStory = byId("fox-story");
const readStoryButton = byId("read-story");
const storyAudio = new Audio();
storyAudio.preload = "none";
const feedbackSounds = {
  correct: new Audio("./assets/correct.wav"),
  retry: new Audio("./assets/try-again.wav"),
};

let progress = loadProgress();
let activeLevel = null;
let activeStep = "";
let activeDigit = answerDigits[0];
let currentSound = null;

function practiceKey(level, step) {
  return step ? level + "/" + step : level;
}

function currentRound() {
  return progress.rounds[practiceKey(activeLevel, activeStep)];
}

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
      for (const step of ["", ...Object.keys(level.steps)]) {
        const roundKey = practiceKey(key, step);
        const round = saved.rounds?.[roundKey];
        if (isValidRound(round, level)) progress.rounds[roundKey] = round;
      }
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

function startRound(levelKey, step = "") {
  progress.rounds[practiceKey(levelKey, step)] = makeRound(levelKey, step);
  saveProgress();
}

function openPractice(levelKey, step = "") {
  const key = practiceKey(levelKey, step);
  const round = progress.rounds[key];
  if (!round || round.index === roundLength) startRound(levelKey, step);
  window.location.hash = "addition/" + key;
}

function updateStars() {
  const count = progress.stars;
  const unit = count === 1 ? "star" : "stars";
  byId("star-count").textContent = count;
  byId("star-unit").textContent = unit;
}

function showScreen(name, moveFocus, focusTarget) {
  for (const screen of screens) {
    screen.hidden = screen.id !== name + "-screen";
  }
  if (moveFocus) {
    window.scrollTo(0, 0);
    const target = focusTarget ?? byId(name + "-screen").querySelector("h1");
    target.focus({ preventScroll: true });
  }
}

function renderPracticeSteps(levelKey) {
  const level = levels[levelKey];
  byId("steps-level").textContent = level.name;
  byId("steps-level").className = "level-tag level-" + levelKey;
  const buttons = [...Object.entries(level.steps), ["", mixedPractice]].map(([step, practice]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-card practice-card level-" + levelKey;
    const title = document.createElement("span");
    title.className = "level-name";
    title.textContent = practice.name;
    const description = document.createElement("span");
    description.textContent = practice.description;
    const action = document.createElement("span");
    action.className = "level-action";
    const round = progress.rounds[practiceKey(levelKey, step)];
    action.textContent = round && round.index < roundLength ? "Resume" : "Start";
    button.append(title, description, action);
    button.addEventListener("click", () => openPractice(levelKey, step));
    return button;
  });
  byId("practice-options").replaceChildren(...buttons);
}

function renderRoute(focusHeading) {
  const [game, levelKey, stepKey] = window.location.hash.slice(1).split("/");
  activeLevel = null;
  activeStep = "";
  stopStoryReading();
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

  if (stepKey === "steps") {
    renderPracticeSteps(levelKey);
    showScreen("steps", focusHeading);
    return;
  }

  activeLevel = levelKey;
  const level = levels[levelKey];
  if (Object.hasOwn(level.steps, stepKey)) activeStep = stepKey;
  if (!currentRound()) startRound(levelKey, activeStep);

  const practice = level.steps[activeStep];
  for (const id of ["play-back", "result-back"]) {
    const link = byId(id);
    link.href = practice ? "#addition/" + levelKey + "/steps" : "#addition";
    link.textContent = practice ? "Practice steps" : "Pick a level";
  }

  const round = currentRound();
  if (round.index === roundLength) {
    byId("result-message").textContent = "You earned " + roundLength + " stars on " + (practice?.name ?? level.name) + "!";
    showScreen("result", focusHeading);
    return;
  }

  const levelTag = byId("current-level");
  levelTag.textContent = practice ? level.name + " · " + practice.name : level.name;
  levelTag.className = "level-tag level-" + levelKey;
  renderQuestion();
  const firstDigit = !round.solved && !touchPointer.matches ? answerDigits[0] : null;
  showScreen("play", focusHeading || firstDigit !== null, firstDigit);
}

function renderAddend(id, number, showPlus = false) {
  const digits = [...String(number)].reverse().map((digit) => {
    const cell = document.createElement("span");
    cell.textContent = digit;
    return cell;
  });
  if (showPlus) {
    const plus = document.createElement("span");
    plus.className = "addition-sign";
    plus.textContent = "+";
    digits.push(plus);
  }
  byId(id).replaceChildren(...digits);
}

function selectDigit(digit, moveFocus = false) {
  if (!digit || digit.hidden) return;

  activeDigit.classList.remove("current-digit");
  activeDigit = digit;
  digit.classList.toggle("current-digit", !digit.readOnly);

  if (moveFocus) {
    if (document.activeElement === digit) digit.select();
    else digit.focus({ preventScroll: true });
  }
}

function selectAnswerDigit(place, moveFocus = false) {
  selectDigit(answerDigits[place], moveFocus);
}

function saveWork() {
  const round = currentRound();
  round.draft = answerDigits.map((digit) => digit.value);
  round.notes = carryNotes.map((digit) => digit.value);
  saveProgress();
}

function clearColumnClue() {
  columnClue.hidden = true;
  columnClue.textContent = "";
  answerFields.querySelector(".needs-review")?.classList.remove("needs-review");
  answerFields.removeAttribute("aria-invalid");
}

function markColumn(place, clue, moveFocus, incorrect = false) {
  clearColumnClue();
  if (incorrect) answerFields.setAttribute("aria-invalid", "true");
  answerDigits[place].classList.add("needs-review");
  columnClue.hidden = false;
  columnClue.textContent = clue;
  selectAnswerDigit(place, moveFocus);
}

function digitValue(value) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 1) : "";
}

function editDigit(field, value, moveFocus) {
  field.value = value;
  if (field.classList.contains("needs-review")) clearColumnClue();
  saveWork();
  if (!value) return;

  const place = answerDigits.indexOf(field);
  if (place === -1) {
    selectAnswerDigit(carryNotes.indexOf(field) + 1, moveFocus);
  } else {
    const nextPlace = answerDigits[place + 1]?.hidden === false ? place + 1 : place;
    selectAnswerDigit(nextPlace, moveFocus);
  }
}

function eraseDigit(field, moveFocus) {
  const place = answerDigits.indexOf(field);
  const target = place > 0 && !field.value ? answerDigits[place - 1] : field;
  editDigit(target, "", moveFocus);
  selectDigit(target, moveFocus);
}

function renderQuestion() {
  const round = currentRound();
  const [left, right] = round.problems[round.index];
  const questionNumber = round.index + 1;

  byId("question-number").textContent = "Question " + questionNumber + " of " + roundLength;
  progressDots.forEach((dot, index) => {
    dot.classList.toggle("solved", index < round.index || (index === round.index && round.solved));
    dot.classList.toggle("current", index === round.index && !round.solved);
  });
  byId("equation-text").textContent = left + " + " + right + " =";
  renderAddend("top-addend", left);
  renderAddend("bottom-addend", right, true);
  const requiredPlaces = String(left).length;
  const solvedDigits = round.solved ? [...String(left + right)].reverse() : [];
  answerDigits.forEach((digit, place) => {
    digit.hidden = place > requiredPlaces;
    digit.value = digit.hidden ? "" : (round.solved ? solvedDigits[place] ?? "" : digitValue(round.draft?.[place]));
    digit.readOnly = round.solved;
    digit.classList.toggle("carry-digit", place === requiredPlaces);
  });
  carryNotes.forEach((note, index) => {
    note.hidden = index >= requiredPlaces;
    note.value = note.hidden ? "" : digitValue(round.notes?.[index]);
    note.readOnly = round.solved;
  });
  renderStory(round, left, right);
  clearColumnClue();
  selectAnswerDigit(0);
  numberPad.disabled = round.solved;
  checkButton.hidden = round.solved;
  nextButton.hidden = !round.solved;
  nextButton.textContent = questionNumber === roundLength ? "See your stars" : "Next question";
  hintButton.hidden = round.solved;
  hintContent.replaceChildren();
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

function showHint() {
  if (!hintContent.hidden) {
    setHintOpen(false);
    return;
  }

  if (!hintContent.childElementCount) {
    const round = currentRound();
    buildAdditionHint(hintContent, columnWork(...round.problems[round.index]));
  }
  setHintOpen(true);
  hintContent.scrollIntoView({ block: "nearest" });
}

function stopStoryReading() {
  storyAudio.pause();
  storyAudio.currentTime = 0;
  readStoryButton.textContent = "Read aloud";
}

function renderStory(round, left, right) {
  stopStoryReading();
  const story = round.index === roundLength - 1 ? getStory(activeLevel, round.story) : null;
  const showStory = story?.pair[0] === left && story.pair[1] === right;
  foxStory.hidden = !showStory;
  answerDigits[0].setAttribute("aria-describedby", showStory ? "story-text equation-text" : "equation-text");
  if (!showStory) return;

  byId("story-text").textContent = story.text;
  byId("story-audio-status").textContent = "";
  byId("story-groups").replaceChildren(makeStoryGroup(left, story.item), makeStoryGroup(right, story.item));
  if (storyAudio.getAttribute("src") !== story.audio) storyAudio.src = story.audio;
}

function toggleStoryReading() {
  if (!storyAudio.paused) {
    stopStoryReading();
    return;
  }

  currentSound?.pause();
  byId("story-audio-status").textContent = "";
  readStoryButton.textContent = "Stop reading";
  storyAudio.play().catch((error) => {
    if (error.name === "AbortError") return;
    stopStoryReading();
    byId("story-audio-status").textContent = "The story audio couldn’t play. Tap Read aloud to try again.";
  });
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
  const round = currentRound();
  if (!round || round.solved || round.index >= roundLength) return;

  stopStoryReading();
  const [left, right] = round.problems[round.index];
  const requiredPlaces = String(left).length;
  const missingPlace = answerDigits.findIndex((digit, place) => place < requiredPlaces && !digit.value);
  const moveFocus = !touchPointer.matches || answerFields.contains(document.activeElement);
  if (missingPlace !== -1) {
    setFeedback("Keep going!", "Fill in the highlighted box.");
    markColumn(missingPlace, "Fill in the " + placeNames[missingPlace] + " box.", moveFocus);
    return;
  }

  const columns = columnWork(left, right);
  const wrongPlace = columns.findIndex((column, place) => Number(answerDigits[place].value) !== column.digit);
  if (wrongPlace !== -1) {
    const column = columns[wrongPlace];
    let clue = "Check the " + placeNames[wrongPlace] + ". Add the two digits in that column.";
    if (column.incoming) {
      clue = "Check the " + placeNames[wrongPlace] + ". Did you include the 1 you carried from the " +
        placeNames[wrongPlace - 1] + "?";
    }
    if (wrongPlace === requiredPlaces) {
      clue = "Check the extra box on the left. Use it for a carry from the " + placeNames[wrongPlace - 1] + ".";
    }
    setFeedback("Try again!", "Take another look at the highlighted column.", "try-again");
    markColumn(wrongPlace, clue, moveFocus, true);
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
  const round = currentRound();
  if (!round?.solved) return;

  round.index++;
  round.solved = false;
  delete round.draft;
  delete round.notes;
  saveProgress();

  if (round.index === roundLength) {
    renderRoute(true);
  } else {
    renderQuestion();
    const question = foxStory.hidden ? equationAddends : foxStory;
    question.scrollIntoView({ block: "nearest" });
    if (!touchPointer.matches) {
      selectAnswerDigit(0, true);
    } else {
      equationAddends.focus({ preventScroll: true });
    }
  }
}

for (const button of levelButtons) {
  button.addEventListener("click", () => openPractice(button.dataset.level));
}

equation.addEventListener("focusin", (event) => {
  if (!event.target.matches("input")) return;
  selectDigit(event.target);
  event.target.select();
});

equation.addEventListener("click", (event) => {
  if (event.target.matches("input")) event.target.select();
});

equation.addEventListener("input", (event) => {
  editDigit(event.target, digitValue(event.target.value), true);
});

equation.addEventListener("keydown", (event) => {
  const field = event.target;
  if (!field.matches("input") || field.readOnly || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const isNote = carryNotes.includes(field);
  const row = isNote ? carryNotes : answerDigits;
  const place = row.indexOf(field);
  switch (event.key) {
    case "Backspace":
      eraseDigit(field, true);
      break;
    case "ArrowLeft":
      selectDigit(row[place + 1], true);
      break;
    case "ArrowRight":
      selectDigit(row[place - 1], true);
      break;
    case "ArrowUp":
      if (isNote || place === 0) return;
      selectDigit(carryNotes[place - 1], true);
      break;
    case "ArrowDown":
      if (!isNote) return;
      selectAnswerDigit(place + 1, true);
      break;
    case "Enter":
      if (!isNote) return;
      selectAnswerDigit(place + 1, true);
      break;
    default:
      return;
  }
  event.preventDefault();
});

numberPad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || numberPad.disabled) return;

  const moveFocus = !touchPointer.matches && event.detail > 0;
  if (button.id === "erase") {
    eraseDigit(activeDigit, moveFocus);
  } else {
    editDigit(activeDigit, button.dataset.digit, moveFocus);
  }
});

byId("answer-form").addEventListener("submit", checkAnswer);
hintButton.addEventListener("click", showHint);
nextButton.addEventListener("click", nextQuestion);
readStoryButton.addEventListener("click", toggleStoryReading);
storyAudio.addEventListener("ended", stopStoryReading);
soundToggle.addEventListener("click", () => {
  progress.soundEnabled = !progress.soundEnabled;
  if (!progress.soundEnabled) currentSound?.pause();
  updateSoundToggle();
  saveProgress();
});
byId("play-again").addEventListener("click", () => {
  startRound(activeLevel, activeStep);
  renderRoute(true);
});

window.addEventListener("hashchange", () => renderRoute(true));
updateSoundToggle();
renderRoute(false);
