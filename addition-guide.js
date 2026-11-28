"use strict";

function makeGuideTiles(column, place) {
  return [column.top, column.bottom, column.incoming].flatMap((count, source) =>
    Array.from({ length: count }, () => {
      const tile = document.createElement("span");
      tile.className = "guide-tile";
      tile.dataset.source = source;
      tile.dataset.place = place;
      return tile;
    })
  );
}

function guideButton(text, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-outline";
  button.textContent = text;
  button.addEventListener("click", action);
  return button;
}

function buildAdditionHint(container, columns, onStepChange) {
  const lastAddendPlace = columns.length - 2;
  const lastStep = columns.at(-1).incoming ? lastAddendPlace + 1 : lastAddendPlace;
  let place = 0;
  let traded = false;

  function changeStep(nextPlace) {
    place = nextPlace;
    traded = false;
    render(true);
  }

  function render(moveFocus) {
    const column = columns[place];
    const name = placeNames[place];
    const nextName = placeNames[place + 1];
    const title = document.createElement("strong");
    title.className = "guide-title";
    title.tabIndex = -1;
    title.textContent = "Add the " + name;

    const instruction = document.createElement("p");
    instruction.textContent = "Add " + column.top + " and " + column.bottom + " in this column.";
    if (column.incoming) instruction.textContent += " Include the 1 you carried from the " + placeNames[place - 1] + ".";
    if (place > lastAddendPlace) {
      instruction.textContent = "Write the 1 you carried in the extra answer box on the left.";
    }

    const board = document.createElement("div");
    board.className = "guide-board";
    board.classList.toggle("has-trade", Boolean(column.carry));
    board.setAttribute("aria-hidden", "true");

    if (column.carry) {
      const destination = guideColumn(nextName);
      if (traded) {
        const bundle = document.createElement("span");
        bundle.className = "guide-bundle";
        bundle.textContent = "1 " + placeUnits[place + 1];
        destination.append(bundle);
      }
      board.append(destination);
    }

    const source = guideColumn(name);
    const tiles = makeGuideTiles(column, place);
    if (column.carry && !traded) {
      const ten = document.createElement("div");
      ten.className = "guide-ten";
      ten.append(...tiles.slice(0, 10));
      source.append(ten);
    }
    const remainder = document.createElement("div");
    remainder.className = "guide-tiles";
    remainder.append(...tiles.slice(column.carry ? 10 : 0));
    source.append(remainder);
    board.append(source);

    const takeaway = document.createElement("p");
    if (traded) {
      takeaway.textContent = "Ten " + name + " made 1 " + placeUnits[place + 1] +
        ". Write how many " + name + " are left below the line. Put 1 above the " + nextName + " if it helps.";
    } else if (column.carry) {
      takeaway.textContent = "Tap Trade 10 " + name + " to make 1 " + placeUnits[place + 1] + ".";
    } else {
      takeaway.textContent = "Count the pieces and write that digit below the line.";
      takeaway.hidden = place > lastAddendPlace;
    }

    const actions = document.createElement("div");
    actions.className = "guide-actions";
    if (place > 0) actions.append(guideButton("Previous column", () => changeStep(place - 1)));
    if (column.carry && !traded) {
      actions.append(guideButton("Trade 10 " + name, () => {
        traded = true;
        render(true);
      }));
    } else if (place < lastStep) {
      actions.append(guideButton("Next column", () => changeStep(place + 1)));
    }
    actions.hidden = !actions.childElementCount;
    onStepChange();
    container.dataset.spoken = title.textContent + ". " + instruction.textContent +
      (takeaway.hidden ? "" : " " + takeaway.textContent);
    container.replaceChildren(title, instruction, board, takeaway, actions);
    if (moveFocus) {
      if (traded) {
        takeaway.tabIndex = -1;
        takeaway.focus({ preventScroll: true });
      } else {
        title.focus({ preventScroll: true });
      }
    }
  }

  render(false);
}

function guideColumn(name) {
  const column = document.createElement("div");
  column.className = "guide-column";
  const nameLabel = document.createElement("strong");
  nameLabel.textContent = name;
  column.append(nameLabel);
  return column;
}

function makeStoryGroup(count, item) {
  const group = document.createElement("div");
  group.className = "story-group";
  const pictures = document.createElement("span");
  pictures.className = "story-items";
  const bundled = count > 9;
  pictures.classList.toggle("story-basket", bundled);
  for (let index = 0; index < (bundled ? 3 : count); index++) {
    const picture = document.createElement("span");
    picture.className = "story-item";
    picture.dataset.item = item;
    pictures.append(picture);
  }

  const amount = document.createElement("strong");
  amount.textContent = count;
  group.append(pictures, amount);
  return group;
}
