"use strict";

function makeMathStory(limit, adding) {
  const [name, friend] = shuffle(["Sally", "Katie", "Kim", "Milo", "Jules", "Sam"]);
  const [item, picture] = shuffle([
    ["cupcake", "🧁"], ["sticker", "🌟"], ["shell", "🐚"],
    ["balloon", "🎈"], ["apple", "🍎"], ["toy", "🧸"],
  ])[0];
  const quantity = n => n + " " + item + (n === 1 ? "" : "s");
  const first = randomInt(1, Math.min(9, adding ? limit - 1 : limit));
  const second = randomInt(1, adding ? Math.min(9, limit - first) : first);
  const story = adding
    ? name + " has " + quantity(first) + ". " + friend + " has " + quantity(second) +
      ". How many " + item + "s do they have together?"
    : name + " had " + quantity(first) + " and gave " + quantity(second) + " to " + friend +
      ". How many " + item + "s does " + name + " have left?";
  return { first, second, adding, picture, story, item, name, friend };
}

function createStoryMath(byId, reader, sound, awardStar) {
  const form = byId("math-form");
  const { first, second, result, sign } = form.elements;
  const fields = [first, second, result];
  const next = byId("math-next");
  const read = byId("math-read");
  const readHelp = byId("math-read-help");
  const audio = byId("math-audio");
  const feedback = byId("math-feedback");
  const tray = byId("math-tray");
  const heading = byId("math-story");
  const pad = byId("number-pad").cloneNode(true);
  pad.id = "math-pad";
  pad.querySelector(".erase-key").removeAttribute("id");
  byId("math-pad-slot").append(pad);
  let stories, index, storyMode, active, solved;

  function select(field) {
    active = field;
    for (const input of fields) input.classList.toggle("selected", field === input);
  }

  for (const field of fields) {
    field.inputMode = "none";
    field.addEventListener("focus", () => { select(field); field.select(); });
    field.addEventListener("input", () => { field.value = field.value.replace(/\D/g, ""); });
  }
  pad.addEventListener("click", event => {
    const key = event.target.closest("button");
    if (!key || solved) return;
    if (key.dataset.digit === undefined) active.value = active.value.slice(0, -1);
    else if (active.value.length >= active.maxLength) active.value = key.dataset.digit;
    else active.value += key.dataset.digit;
  });
  function progressDots(count) {
    [...byId("math-dots").children].forEach((dot, i) => {
      dot.classList.toggle("solved", i < count);
      dot.classList.toggle("current", i === index && i >= count);
    });
  }
  function message(text) {
    reader.stop();
    audio.textContent = "";
    feedback.textContent = text;
    readHelp.hidden = !text;
  }
  function question() {
    const p = stories[index];
    message("");
    solved = false;
    form.reset();
    for (const field of [...fields, ...sign]) field.disabled = false;
    first.hidden = second.hidden = byId("math-signs").hidden = byId("math-equals").hidden = !storyMode;
    byId("math-instructions").textContent = storyMode
      ? "Tap a box to fill it. Choose + or −." : "Write the answer.";
    byId("math-count").textContent = (storyMode ? "Story " : "Question ") + (index + 1) + " of 3";
    progressDots(index);
    heading.textContent = storyMode ? p.story : p.first + " + " + p.second + " = ?";
    byId("math-picture").textContent = p.picture;
    byId("math-check").hidden = byId("math-hint").hidden = pad.hidden = form.hidden = read.hidden = false;
    next.hidden = tray.hidden = byId("math-finish").hidden = true;
    tray.replaceChildren();
    select(storyMode ? first : result);
  }
  function start(isStory, limit = 5) {
    storyMode = isStory;
    index = 0;
    const signs = storyMode ? shuffle([true, false, randomInt(0, 1) === 1]) : [true, true, true];
    stories = [];
    for (const adding of signs) {
      let p;
      do { p = makeMathStory(limit, adding); }
      while (stories.some(old => old.first === p.first && old.second === p.second && old.adding === adding));
      stories.push(p);
    }
    byId("math-heading").textContent = storyMode ? "Story Math" : "Addition Adventure";
    byId("math-columns").hidden = storyMode;
    question();
  }
  read.addEventListener("click", () => {
    const p = stories[index];
    reader.toggle(read, audio, storyMode ? p.story : "What is " + p.first + " plus " + p.second + "?");
  });
  readHelp.addEventListener("click", () => reader.toggle(readHelp, audio, feedback.textContent));

  byId("math-hint").addEventListener("click", () => {
    const p = stories[index];
    message(p.adding ? "Tap each " + p.item + " once. Count both groups together."
      : "Tap the " + p.item + (p.second === 1 ? "" : "s") + " that " + p.name + " gave away. Count what is left.");
    tray.hidden = false;
    if (tray.childElementCount) return;
    for (const count of p.adding ? [p.first, p.second] : [p.first]) {
      const group = document.createElement("div");
      group.className = "counter-group";
      for (let i = 0; i < count; i++) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.textContent = p.picture;
        tile.setAttribute("aria-label", p.item + " " + (i + 1));
        tile.setAttribute("aria-pressed", "false");
        tile.addEventListener("click", () => {
          tile.setAttribute("aria-pressed", String(tile.getAttribute("aria-pressed") !== "true"));
        });
        group.append(tile);
      }
      tray.append(group);
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (solved) return;
    const p = stories[index];
    const a = Number(first.value), b = Number(second.value);
    const correctPair = (a === p.first && b === p.second) || (p.adding && a === p.second && b === p.first);
    let clue = "";
    if (storyMode && (!first.value || !second.value)) clue = "Fill both number boxes with the amounts in the story.";
    else if (storyMode && !correctPair) clue = "Look for the two amounts. Which group did you start with?";
    else if (storyMode && !sign.value) clue = "Choose plus or minus.";
    else if (storyMode && sign.value !== (p.adding ? "+" : "-")) clue = "Look at your sign. Do the groups join, or does someone give things away?";
    else if (!result.value) clue = "Fill in the answer box.";
    else if (Number(result.value) !== (p.adding ? p.first + p.second : p.first - p.second)) clue = "Try counting again. Tap Show hint to count with pictures.";
    if (clue) {
      message(clue);
      sound("retry");
      return;
    }
    solved = true;
    awardStar();
    message("You earned a star!");
    sound("correct");
    for (const field of [...fields, ...sign]) field.disabled = true;
    byId("math-check").hidden = byId("math-hint").hidden = pad.hidden = tray.hidden = true;
    progressDots(index + 1);
    next.textContent = index === 2 ? "See your stars" : storyMode ? "Next story" : "Next question";
    next.hidden = false;
    next.focus();
  });
  next.addEventListener("click", () => {
    index++;
    if (index < stories.length) question();
    else {
      message("");
      heading.textContent = "You earned 3 stars!";
      byId("math-count").textContent = "Round complete";
      byId("math-picture").textContent = "🌟";
      form.hidden = read.hidden = true;
      byId("math-finish").hidden = false;
    }
    heading.focus();
  });
  for (const button of byId("math-finish").querySelectorAll("button")) {
    button.addEventListener("click", () => {
      start(storyMode, Number(button.dataset.limit));
      heading.focus();
    });
  }
  return { start };
}
