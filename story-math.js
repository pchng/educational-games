"use strict";

function makeMathStory() {
  const [name, friend] = shuffle(["Sally", "Katie", "Kim", "Milo", "Jules", "Sam"]);
  const [item, picture, action] = shuffle([
    ["cupcake", "🧁", "ate"], ["sticker", "🌟", "gave away"],
    ["shell", "🐚", "put down"], ["balloon", "🎈", "gave away"],
    ["apple", "🍎", "ate"], ["toy", "🧸", "gave away"],
  ])[0];
  const quantity = n => n + " " + item + (n === 1 ? "" : "s");
  const first = randomInt(1, 9);
  const adding = randomInt(0, 1) === 1;
  const second = randomInt(1, adding ? 9 : first);
  const story = adding
    ? name + " has " + quantity(first) + ". " + friend + " has " + quantity(second) +
      ". How many " + item + "s do they have together?"
    : name + " had " + quantity(first) + ". " + name + " " + action + " " + quantity(second) +
      ". How many " + item + "s does " + name + " have left?";
  return { first, second, adding, picture, story, item };
}

function createStoryMath(byId, reader, sound, awardStar) {
  const form = byId("math-form");
  const { first, second, sign, result } = form.elements;
  const feedback = byId("math-feedback");
  const next = byId("math-next");
  const read = byId("math-read");
  const audio = byId("math-audio");
  let problem;
  let hintIndex;
  let solved;

  function start() {
    reader.stop();
    const previous = problem?.story;
    do { problem = makeMathStory(); } while (problem.story === previous);
    solved = false;
    hintIndex = 0;
    form.reset();
    for (const field of [first, second, sign, result]) field.disabled = false;
    byId("math-check").hidden = byId("math-hint").hidden = false;
    next.hidden = true;
    byId("math-story").textContent = problem.story;
    byId("math-picture").textContent = problem.picture;
    feedback.textContent = audio.textContent = "";
  }

  read.addEventListener("click", () => reader.toggle(read, audio, problem.story));
  byId("math-hint").addEventListener("click", () => {
    const hints = [
      "Find both numbers in the story. What does each one count?",
      "Picture what happened. Did two groups come together, or did some things go away?",
      problem.adding ? "Draw a dot for each " + problem.item + " in each group. Count all the dots."
        : "Draw the starting group. Cross out the things that went away and count what is left.",
    ];
    feedback.textContent = hints[hintIndex];
    hintIndex = (hintIndex + 1) % hints.length;
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (solved) return;
    reader.stop();
    const a = Number(first.value);
    const b = Number(second.value);
    const { adding } = problem;
    const operandsMatch = (a === problem.first && b === problem.second) ||
      (adding && b === problem.first && a === problem.second);
    if (!operandsMatch) feedback.textContent = "Check the two amounts in the story. Which group did you start with?";
    else if (sign.value !== (adding ? "+" : "-")) feedback.textContent = "Try the sign again. Did the group grow or shrink?";
    else if (Number(result.value) !== (adding ? a + b : a - b)) feedback.textContent = "Your number sentence matches the story. Try counting again.";
    else {
      solved = true;
      awardStar();
      for (const field of [first, second, sign, result]) field.disabled = true;
      byId("math-check").hidden = byId("math-hint").hidden = true;
      next.hidden = false;
      feedback.textContent = "You solved the story and earned a star!";
      next.focus();
    }
    sound(solved ? "correct" : "retry");
  });
  next.addEventListener("click", () => {
    start();
    byId("math-story").focus();
  });
  return { start };
}
