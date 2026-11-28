"use strict";

const roundLength = 5;
const placeNames = ["ones", "tens", "hundreds", "thousands"];
const placeUnits = ["one", "ten", "hundred", "thousand"];

const levels = {
  easy: {
    name: "Easy", min: 1, max: 9, carries: [null, null, null, null, null],
    steps: {
      "up-to-ten": { name: "Up to 10", description: "Add small numbers with totals from 2 to 10.", sums: [2, 10] },
      "make-ten": { name: "Make 10", description: "Find pairs of numbers that make exactly 10.", sums: [10, 10] },
      "past-ten": { name: "Go past 10", description: "Add single digits with totals from 11 to 18.", sums: [11, 18] },
    },
  },
  medium: {
    name: "Medium", min: 10, max: 99, carries: [0, 0, 1, 1, 2],
    steps: {
      "no-carry": { name: "Without carrying", description: "Add tens and ones one column at a time.", carries: [0] },
      "carry-ones": { name: "Carry from the ones", description: "Trade 10 ones for 1 ten.", carries: [1], carryOnes: true },
    },
  },
  hard: {
    name: "Hard", min: 100, max: 999, carries: [0, 1, 1, 2, 3],
    steps: {
      "no-carry": { name: "Without carrying", description: "Line up and add hundreds, tens, and ones.", carries: [0] },
      "carry-once": { name: "Carry once", description: "Find the one column that needs a trade.", carries: [1] },
      "carry-more": { name: "Carry more than once", description: "Practice carrying across two or three columns.", carries: [2, 3] },
    },
  },
};

const mixedPractice = {
  name: "Mixed practice",
  description: "Practice a mix of problems at this level.",
};

const storyPrompts = {
  berries(left, right) {
    return "Fox picked " + left + " berries and found " + right +
      " more. How many berries does Fox have altogether?";
  },
  flowers(left, right) {
    return "Fox saw " + left + " flowers by the pond and " + right +
      " by a tree. How many flowers did Fox see altogether?";
  },
  seeds(left, right) {
    return "Fox planted " + left + " seeds in one garden patch and " + right +
      " in another. How many seeds did Fox plant altogether?";
  },
};

const storyPairs = {
  easy: [
    ["flowers", 4, 5], ["berries", 2, 6], ["seeds", 4, 6],
    ["flowers", 3, 7], ["berries", 8, 7], ["seeds", 9, 5],
  ],
  medium: [
    ["seeds", 24, 35], ["flowers", 31, 26], ["berries", 47, 26],
    ["seeds", 35, 28], ["seeds", 67, 58],
  ],
  hard: [
    ["seeds", 132, 245], ["berries", 231, 456], ["flowers", 248, 327],
    ["seeds", 346, 217], ["seeds", 375, 268], ["berries", 687, 456],
  ],
};

function getStory(levelKey, index) {
  if (!Number.isInteger(index) || index < 0) return null;
  const story = storyPairs[levelKey][index];
  if (!story) return null;
  const [item, left, right] = story;
  return {
    item,
    pair: [left, right],
    text: storyPrompts[item](left, right),
    audio: "./assets/stories/" + levelKey + "-" + (index + 1) + ".mp3",
  };
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
    carry = Number(left % 10 + right % 10 + carry >= 10);
    count += carry;
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return count;
}

function columnWork(left, right) {
  let incoming = 0;
  return Array.from({ length: String(left).length + 1 }, (_, place) => {
    const power = 10 ** place;
    const top = Math.floor(left / power) % 10;
    const bottom = Math.floor(right / power) % 10;
    const total = top + bottom + incoming;
    const carry = Math.floor(total / 10);
    const column = { top, bottom, incoming, total, carry, digit: total % 10 };
    incoming = carry;
    return column;
  });
}

function matchesPractice([left, right], step, wantedCarries = null) {
  if (step?.sums) {
    const [min, max] = step.sums;
    if (left + right < min || left + right > max) return false;
  }
  if (step?.carryOnes && left % 10 + right % 10 < 10) return false;
  if (step?.carries || wantedCarries !== null) {
    const carries = countCarries(left, right);
    if (step?.carries && !step.carries.includes(carries)) return false;
    if (wantedCarries !== null && carries !== wantedCarries) return false;
  }
  return true;
}

function makeRound(levelKey, stepKey = null) {
  const level = levels[levelKey];
  const step = level.steps[stepKey];
  const storyChoices = storyPairs[levelKey]
    .map(([, left, right], index) => ({ index, pair: [left, right] }))
    .filter(({ pair }) => matchesPractice(pair, step));
  const story = storyChoices[randomInt(0, storyChoices.length - 1)];

  const carries = step ? Array(roundLength).fill(null) : [...level.carries];
  const storyCarries = countCarries(...story.pair);
  carries.splice(carries.findIndex((count) => count === null || count === storyCarries), 1);

  const pairKey = (pair) => Math.min(...pair) + "+" + Math.max(...pair);
  const seen = new Set([pairKey(story.pair)]);
  const problems = shuffle(carries).map((wantedCarries) => {
    while (true) {
      const pair = [randomInt(level.min, level.max), randomInt(level.min, level.max)];
      const key = pairKey(pair);
      if (seen.has(key) || !matchesPractice(pair, step, wantedCarries)) continue;

      seen.add(key);
      return pair;
    }
  });
  problems.push(story.pair);
  return { problems, index: 0, solved: false, story: story.index };
}
